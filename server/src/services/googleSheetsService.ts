import crypto from 'crypto';
import { Readable } from 'stream';
import ExcelJS from 'exceljs';
import { env } from '../config/env';
import { logger } from '../config/logger';

type SheetMatrix = { title: string; values: string[][] };

type ServiceAccountCreds = {
  client_email: string;
  private_key: string;
};

function normalizePrivateKey(raw: string): string {
  let key = raw.trim();
  if ((key.startsWith('"') && key.endsWith('"')) || (key.startsWith("'") && key.endsWith("'"))) {
    key = key.slice(1, -1);
  }
  return key.replace(/\\n/g, '\n');
}

function loadServiceAccount(): ServiceAccountCreds | null {
  const jsonRaw = env.googleServiceAccountJson?.trim();
  if (jsonRaw) {
    try {
      const parsed = JSON.parse(jsonRaw) as { client_email?: string; private_key?: string };
      if (parsed.client_email && parsed.private_key) {
        return { client_email: parsed.client_email, private_key: normalizePrivateKey(parsed.private_key) };
      }
    } catch (error) {
      logger.warn('GOOGLE_SERVICE_ACCOUNT_JSON is invalid JSON', { error });
    }
  }

  if (env.googleServiceAccountEmail && env.googleServiceAccountPrivateKey) {
    return {
      client_email: env.googleServiceAccountEmail.trim(),
      private_key: normalizePrivateKey(env.googleServiceAccountPrivateKey),
    };
  }

  if (env.googleServiceAccountPrivateKeyBase64 && env.googleServiceAccountEmail) {
    try {
      const decoded = Buffer.from(env.googleServiceAccountPrivateKeyBase64, 'base64').toString('utf8');
      return {
        client_email: env.googleServiceAccountEmail.trim(),
        private_key: normalizePrivateKey(decoded),
      };
    } catch (error) {
      logger.warn('GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY_BASE64 decode failed', { error });
    }
  }

  return null;
}

function cellText(value: ExcelJS.CellValue): string {
  if (value == null) return '';
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  if (typeof value === 'object' && 'text' in value && typeof (value as { text?: string }).text === 'string') {
    return (value as { text: string }).text;
  }
  if (typeof value === 'object' && 'result' in value) {
    const result = (value as { result?: unknown }).result;
    return result == null ? '' : String(result);
  }
  return String(value);
}

async function workbookToMatrices(file: Express.Multer.File): Promise<SheetMatrix[]> {
  const workbook = new ExcelJS.Workbook();
  const name = file.originalname.toLowerCase();
  if (name.endsWith('.csv')) {
    await workbook.csv.read(Readable.from(file.buffer));
  } else {
    await workbook.xlsx.load(file.buffer as never);
  }

  const sheets: SheetMatrix[] = [];
  for (const sheet of workbook.worksheets) {
    const maxRows = Math.min(sheet.rowCount || 0, 500);
    const maxCols = Math.min(sheet.columnCount || 0, 40);
    const values: string[][] = [];
    for (let r = 1; r <= maxRows; r += 1) {
      const row: string[] = [];
      for (let c = 1; c <= maxCols; c += 1) {
        row.push(cellText(sheet.getRow(r).getCell(c).value));
      }
      while (row.length && row[row.length - 1] === '') row.pop();
      if (row.some((cell) => cell !== '')) values.push(row);
    }
    if (values.length) {
      sheets.push({ title: (sheet.name || `Sheet${sheets.length + 1}`).slice(0, 90), values });
    }
  }
  return sheets;
}

async function accessTokenFromRefresh(): Promise<string | null> {
  if (!env.googleSheetsRefreshToken || !env.googleClientId || !env.googleClientSecret) {
    return null;
  }
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: env.googleClientId,
      client_secret: env.googleClientSecret,
      refresh_token: env.googleSheetsRefreshToken,
      grant_type: 'refresh_token',
    }),
  });
  if (!res.ok) {
    logger.warn('Google Sheets refresh token exchange failed', { status: res.status, body: await res.text() });
    return null;
  }
  const data = (await res.json()) as { access_token?: string };
  return data.access_token ?? null;
}

async function accessTokenFromServiceAccount(): Promise<string | null> {
  const sa = loadServiceAccount();
  if (!sa) return null;

  const now = Math.floor(Date.now() / 1000);
  const header = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url');
  const claim = Buffer.from(
    JSON.stringify({
      iss: sa.client_email,
      scope: [
        'https://www.googleapis.com/auth/spreadsheets',
        'https://www.googleapis.com/auth/drive',
        'https://www.googleapis.com/auth/drive.file',
      ].join(' '),
      aud: 'https://oauth2.googleapis.com/token',
      iat: now,
      exp: now + 3600,
    }),
  ).toString('base64url');
  const unsigned = `${header}.${claim}`;
  const signature = crypto.createSign('RSA-SHA256').update(unsigned).sign(sa.private_key, 'base64url');
  const jwt = `${unsigned}.${signature}`;

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  });
  if (!res.ok) {
    logger.warn('Google service account token failed', { status: res.status, body: await res.text() });
    return null;
  }
  const data = (await res.json()) as { access_token?: string };
  return data.access_token ?? null;
}

async function getAccessToken(): Promise<{ token: string; via: 'refresh' | 'service_account' } | null> {
  const refresh = await accessTokenFromRefresh();
  if (refresh) return { token: refresh, via: 'refresh' };
  const sa = await accessTokenFromServiceAccount();
  if (sa) return { token: sa, via: 'service_account' };
  return null;
}

async function makePublic(fileId: string, token: string) {
  const res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}/permissions?supportsAllDrives=true`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ role: 'reader', type: 'anyone' }),
  });
  if (!res.ok) {
    logger.warn('Failed to make Google Sheet public', { status: res.status, body: await res.text() });
  }
}

/** Create a blank Google Sheet file (optionally inside a shared Drive folder). */
async function createSpreadsheetFile(
  token: string,
  title: string,
  sheetTitles: string[],
): Promise<{ spreadsheetId: string; spreadsheetUrl: string }> {
  const folderId = env.googleDriveFolderId?.trim();

  // Prefer Drive create into a shared folder — service accounts have no personal Drive quota.
  if (folderId) {
    const driveRes = await fetch('https://www.googleapis.com/drive/v3/files?supportsAllDrives=true', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: title.slice(0, 100),
        mimeType: 'application/vnd.google-apps.spreadsheet',
        parents: [folderId],
      }),
    });
    if (!driveRes.ok) {
      throw new Error(`Drive create failed (${driveRes.status}): ${(await driveRes.text()).slice(0, 400)}`);
    }
    const driveFile = (await driveRes.json()) as { id: string };
    // Ensure sheet tabs match workbook sheets
    if (sheetTitles.length > 1) {
      const metaRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${driveFile.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const meta = (await metaRes.json()) as {
        sheets?: { properties?: { sheetId?: number; title?: string } }[];
      };
      const firstId = meta.sheets?.[0]?.properties?.sheetId ?? 0;
      const requests: object[] = [
        { updateSheetProperties: { properties: { sheetId: firstId, title: sheetTitles[0] }, fields: 'title' } },
      ];
      for (let i = 1; i < sheetTitles.length; i += 1) {
        requests.push({ addSheet: { properties: { title: sheetTitles[i] } } });
      }
      await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${driveFile.id}:batchUpdate`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ requests }),
      });
    } else if (sheetTitles[0]) {
      const metaRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${driveFile.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const meta = (await metaRes.json()) as {
        sheets?: { properties?: { sheetId?: number } }[];
      };
      const firstId = meta.sheets?.[0]?.properties?.sheetId ?? 0;
      await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${driveFile.id}:batchUpdate`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          requests: [
            {
              updateSheetProperties: {
                properties: { sheetId: firstId, title: sheetTitles[0] },
                fields: 'title',
              },
            },
          ],
        }),
      });
    }
    return {
      spreadsheetId: driveFile.id,
      spreadsheetUrl: `https://docs.google.com/spreadsheets/d/${driveFile.id}/edit`,
    };
  }

  const createRes = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      properties: { title: title.slice(0, 100) },
      sheets: sheetTitles.map((sheetTitle, index) => ({
        properties: { sheetId: index, title: sheetTitle || `Sheet${index + 1}` },
      })),
    }),
  });
  if (!createRes.ok) {
    const body = await createRes.text();
    throw new Error(
      `Sheets create failed (${createRes.status}): ${body.slice(0, 400)}. ` +
        (body.includes('storageQuota') || body.includes('quota')
          ? 'Service accounts need GOOGLE_DRIVE_FOLDER_ID (a Drive folder shared with the SA email).'
          : ''),
    );
  }
  const created = (await createRes.json()) as { spreadsheetId: string; spreadsheetUrl?: string };
  return {
    spreadsheetId: created.spreadsheetId,
    spreadsheetUrl:
      created.spreadsheetUrl || `https://docs.google.com/spreadsheets/d/${created.spreadsheetId}/edit`,
  };
}

export type CreateGoogleSheetResult =
  | { ok: true; url: string; via: 'refresh' | 'service_account' }
  | { ok: false; error: string };

/** Creates a Google Sheet from an uploaded workbook when platform Google credentials are configured. */
export async function createGoogleSheetFromUpload(
  file: Express.Multer.File,
  title: string,
): Promise<CreateGoogleSheetResult> {
  try {
    const auth = await getAccessToken();
    if (!auth) {
      return {
        ok: false,
        error:
          'Google Sheets is not configured. Set GOOGLE_SERVICE_ACCOUNT_JSON (or EMAIL + PRIVATE_KEY) and GOOGLE_DRIVE_FOLDER_ID on Railway.',
      };
    }

    if (auth.via === 'service_account' && !env.googleDriveFolderId?.trim()) {
      logger.warn('Service account Sheets create without GOOGLE_DRIVE_FOLDER_ID may fail due to Drive quota');
    }

    const matrices = await workbookToMatrices(file);
    if (!matrices.length) {
      matrices.push({ title: 'Sheet1', values: [['']] });
    }

    const created = await createSpreadsheetFile(
      auth.token,
      title,
      matrices.map((m) => m.title || 'Sheet1'),
    );

    const data: Array<{ range: string; values: string[][] }> = matrices.map((sheet) => ({
      range: `'${(sheet.title || 'Sheet1').replace(/'/g, "''")}'!A1`,
      values: sheet.values.length ? sheet.values : [['']],
    }));

    const updateRes = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${created.spreadsheetId}/values:batchUpdate`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${auth.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ valueInputOption: 'USER_ENTERED', data }),
      },
    );
    if (!updateRes.ok) {
      logger.warn('Google Sheets values update failed', { status: updateRes.status, body: await updateRes.text() });
    }

    await makePublic(created.spreadsheetId, auth.token);
    return { ok: true, url: created.spreadsheetUrl, via: auth.via };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Google Sheets auto-create failed';
    logger.warn('Google Sheets auto-create error', { error: message });
    return { ok: false, error: message };
  }
}

export function googleSheetsConfigured(): boolean {
  return Boolean(
    (env.googleSheetsRefreshToken && env.googleClientId && env.googleClientSecret) || loadServiceAccount(),
  );
}

export function getGoogleSheetsStatus() {
  const sa = loadServiceAccount();
  const refresh = Boolean(env.googleSheetsRefreshToken && env.googleClientId && env.googleClientSecret);
  const folderId = env.googleDriveFolderId?.trim() || null;
  const ready = refresh || (Boolean(sa) && Boolean(folderId)) || Boolean(sa);
  return {
    configured: googleSheetsConfigured(),
    ready: refresh || (Boolean(sa) && Boolean(folderId)),
    mode: refresh ? 'oauth_refresh' : sa ? 'service_account' : 'off',
    serviceAccountEmail: sa?.client_email ?? null,
    driveFolderConfigured: Boolean(folderId),
    note: !googleSheetsConfigured()
      ? 'Not configured. Add a Google Cloud service account JSON and a shared Drive folder ID.'
      : sa && !folderId
        ? 'Service account set, but GOOGLE_DRIVE_FOLDER_ID is missing. Share a Drive folder with the SA email and set that folder ID — required because service accounts have no Drive storage quota.'
        : 'Google Sheets auto-create is ready for creator uploads.',
    setup: {
      step1: 'Google Cloud Console → create a Service Account → download JSON key',
      step2: 'Enable Google Sheets API + Google Drive API for the project',
      step3: 'Create a Drive folder (e.g. Sheettomate Templates), share it with the SA email as Editor',
      step4:
        'Railway: GOOGLE_SERVICE_ACCOUNT_JSON=<paste entire JSON> and GOOGLE_DRIVE_FOLDER_ID=<folder id from Drive URL>',
    },
  };
}

/** Lightweight auth + optional folder access check for admin. */
export async function pingGoogleSheets(): Promise<{
  ok: boolean;
  message: string;
  status: ReturnType<typeof getGoogleSheetsStatus>;
}> {
  const status = getGoogleSheetsStatus();
  if (!status.configured) {
    return { ok: false, message: status.note, status };
  }
  const auth = await getAccessToken();
  if (!auth) {
    return { ok: false, message: 'Could not obtain a Google access token. Check SA JSON / private key formatting.', status };
  }
  if (auth.via === 'service_account' && status.driveFolderConfigured) {
    const folderId = env.googleDriveFolderId!.trim();
    const res = await fetch(
      `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(folderId)}?fields=id,name,mimeType&supportsAllDrives=true`,
      { headers: { Authorization: `Bearer ${auth.token}` } },
    );
    if (!res.ok) {
      return {
        ok: false,
        message: `Cannot access Drive folder ${folderId} (${res.status}). Share the folder with ${status.serviceAccountEmail} as Editor.`,
        status,
      };
    }
    const folder = (await res.json()) as { name?: string };
    return {
      ok: true,
      message: `Service account OK. Folder “${folder.name ?? folderId}” is reachable.`,
      status,
    };
  }
  return {
    ok: true,
    message: auth.via === 'refresh' ? 'OAuth refresh token OK.' : 'Service account token OK (set GOOGLE_DRIVE_FOLDER_ID for reliable creates).',
    status,
  };
}
