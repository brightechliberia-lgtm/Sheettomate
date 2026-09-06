import ExcelJS from 'exceljs';
import { logger } from '../config/logger';

export interface SheetPreview {
  svg: Buffer;
  rows: number;
  columns: number;
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export async function generateSheetPreview(file: Express.Multer.File): Promise<SheetPreview | null> {
  const name = file.originalname.toLowerCase();
  if (!name.endsWith('.xlsx') && !name.endsWith('.xls')) {
    return null;
  }

  try {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(file.buffer as never);
    const sheet = workbook.worksheets[0];
    if (!sheet) {
      return null;
    }

    const maxRows = Math.min(sheet.rowCount || 1, 12);
    const maxCols = Math.min(sheet.columnCount || 1, 8);
    const cellW = 110;
    const cellH = 28;
    const width = maxCols * cellW + 2;
    const height = maxRows * cellH + 2;
    const cells: string[] = [];

    for (let r = 1; r <= maxRows; r += 1) {
      for (let c = 1; c <= maxCols; c += 1) {
        const raw = sheet.getRow(r).getCell(c).text || '';
        const text = escapeXml(raw.slice(0, 18));
        const x = (c - 1) * cellW;
        const y = (r - 1) * cellH;
        const fill = r === 1 ? '#17633d' : '#ffffff';
        const color = r === 1 ? '#ffffff' : '#1c1917';
        cells.push(
          `<rect x="${x}" y="${y}" width="${cellW}" height="${cellH}" fill="${fill}" stroke="#d6d3d1"/>` +
            `<text x="${x + 6}" y="${y + 18}" font-size="11" font-family="Arial" fill="${color}">${text}</text>`,
        );
      }
    }

    const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  ${cells.join('\n')}
</svg>`;

    return {
      svg: Buffer.from(svg, 'utf8'),
      rows: sheet.rowCount || maxRows,
      columns: sheet.columnCount || maxCols,
    };
  } catch (error) {
    logger.warn('Failed to generate sheet preview', { error });
    return null;
  }
}

export async function generatePreviewFromBuffer(buffer: Buffer): Promise<SheetPreview | null> {
  const file = {
    originalname: 'generated.xlsx',
    buffer,
  } as Express.Multer.File;
  return generateSheetPreview(file);
}
