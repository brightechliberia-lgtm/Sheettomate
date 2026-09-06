export function interpolate(template: string, ctx: Record<string, unknown>): string {
  return template.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_m, path: string) => {
    const val = path.split('.').reduce<unknown>((acc, key) => {
      if (acc && typeof acc === 'object') return (acc as Record<string, unknown>)[key];
      return undefined;
    }, ctx);
    return val == null ? '' : String(val);
  });
}

export function parseCsv(text: string): string[][] {
  return text
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => line.split(',').map((c) => c.trim().replace(/^"|"$/g, '')));
}

export function rowsToCsv(rows: string[][]): string {
  return rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
}

export function rowsToJson(rows: string[][]): Record<string, string>[] {
  const [header, ...body] = rows;
  if (!header) return [];
  return body.map((row) => Object.fromEntries(header.map((h, i) => [h, row[i] ?? ''])));
}

/** Minimal one-page PDF (text only) without extra dependencies. */
export function rowsToPdf(rows: string[][]): string {
  const text = rows.map((r) => r.join(' | ')).join('\n').slice(0, 800);
  const escaped = text.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
  const stream = `BT /F1 12 Tf 48 750 Td (${escaped}) Tj ET`;
  const objects = [
    '1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj',
    '2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj',
    '3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >> endobj',
    `4 0 obj << /Length ${stream.length} >> stream\n${stream}\nendstream endobj`,
    '5 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj',
  ];
  let offset = 9;
  const xref = ['xref', '0 6', '0000000000 65535 f '];
  let body = '%PDF-1.4\n';
  for (const obj of objects) {
    xref.push(`${String(offset).padStart(10, '0')} 00000 n `);
    body += `${obj}\n`;
    offset = body.length;
  }
  const startxref = body.length;
  return `${body}${xref.join('\n')}\ntrailer << /Size 6 /Root 1 0 R >>\nstartxref\n${startxref}\n%%EOF`;
}

export function ocrStub(filename: string, mime: string, buffer: Buffer): { text: string; rows: string[][] } {
  if (mime.includes('csv') || filename.endsWith('.csv')) {
    const rows = parseCsv(buffer.toString('utf8'));
    return { text: buffer.toString('utf8').slice(0, 2000), rows };
  }
  if (mime.includes('json')) {
    return { text: buffer.toString('utf8').slice(0, 2000), rows: [['json'], [buffer.toString('utf8').slice(0, 200)]] };
  }
  const digits = buffer.toString('utf8').match(/\d+/g)?.slice(0, 8) ?? ['4'];
  return {
    text: `Sandbox OCR for ${filename}: inferred values ${digits.join(', ')}`,
    rows: [['source', 'value'], [filename, digits[0] ?? '0']],
  };
}
