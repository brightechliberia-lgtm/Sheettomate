import crypto from 'crypto';
import { Readable } from 'stream';
import ExcelJS from 'exceljs';
import { env } from '../config/env';
import { logger } from '../config/logger';

type SheetMatrix = { title: string; values: string[][] };

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
    logger.warn('Google Sheets refresh token exchange failed', { status: res.status });
    return null;
  }
  const data = (await res.json()) as { access_token?: string };
  return data.access_token ?? null;
}

async function accessTokenFromServiceAccount(): Promise<string | null> {
  if (!env.googleServiceAccountEmail || !env.googleServiceAccountPrivateKey) {
    return null;
  }
  const now = Math.floor(Date.now() / 1000);
  const header = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url');
  const claim = Buffer.from(
    JSON.stringify({
      iss: env.googleServiceAccountEmail,
      scope: 'https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/drive.file',
      aud: 'https://oauth2.googleapis.com/token',
      iat: now,
      exp: now + 3600,
    }),
  ).toString('base64url');
  const unsigned = `${header}.${claim}`;
  const key = env.googleServiceAccountPrivateKey.replace(/\\n/g, '\n');
  const signature = crypto.createSign('RSA-SHA256').update(unsigned).sign(key, 'base64url');
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
    logger.warn('Google service account token failed', { status: res.status });
    return null;
  }
  const data = (await res.json()) as { access_token?: string };
  return data.access_token ?? null;
}

async function getAccessToken(): Promise<string | null> {
  return (await accessTokenFromRefresh()) || (await accessTokenFromServiceAccount());
}

async function makePublic(fileId: string, token: string) {
  await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}/permissions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ role: 'reader', type: 'anyone' }),
  });
}

/** Creates a Google Sheet from an uploaded workbook when platform Google credentials are configured. */
export async function createGoogleSheetFromUpload(
  file: Express.Multer.File,
  title: string,
): Promise<{ url: string } | null> {
  try {
    const token = await getAccessToken();
    if (!token) {
      logger.info('Google Sheets auto-create skipped: no credentials configured');
      return null;
    }

    const matrices = await workbookToMatrices(file);
    if (!matrices.length) {
      matrices.push({ title: 'Sheet1', values: [['']] });
    }

    const createRes = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        properties: { title: title.slice(0, 100) },
        sheets: matrices.map((sheet, index) => ({
          properties: { sheetId: index, title: sheet.title || `Sheet${index + 1}` },
        })),
      }),
    });
    if (!createRes.ok) {
      logger.warn('Google Sheets create failed', { status: createRes.status, body: await createRes.text() });
      return null;
    }
    const created = (await createRes.json()) as {
      spreadsheetId: string;
      spreadsheetUrl?: string;
    };

    const data: Array<{ range: string; values: string[][] }> = matrices.map((sheet) => ({
      range: `'${(sheet.title || 'Sheet1').replace(/'/g, "''")}'!A1`,
      values: sheet.values,
    }));

    const updateRes = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${created.spreadsheetId}/values:batchUpdate`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ valueInputOption: 'USER_ENTERED', data }),
      },
    );
    if (!updateRes.ok) {
      logger.warn('Google Sheets values update failed', { status: updateRes.status });
    }

    await makePublic(created.spreadsheetId, token);
    const url = created.spreadsheetUrl || `https://docs.google.com/spreadsheets/d/${created.spreadsheetId}/edit`;
    return { url };
  } catch (error) {
    logger.warn('Google Sheets auto-create error', { error });
    return null;
  }
}

export function googleSheetsConfigured(): boolean {
  return Boolean(
    (env.googleSheetsRefreshToken && env.googleClientId && env.googleClientSecret) ||
      (env.googleServiceAccountEmail && env.googleServiceAccountPrivateKey),
  );
}
