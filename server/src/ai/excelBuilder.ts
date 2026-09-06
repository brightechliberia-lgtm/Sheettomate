import ExcelJS from 'exceljs';
import type { WorkbookSpec } from './spec';

const HEADER_FILL: ExcelJS.FillPattern = {
  type: 'pattern',
  pattern: 'solid',
  fgColor: { argb: 'FF17633D' },
};

export async function buildWorkbookBuffer(spec: WorkbookSpec): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Sheettomate AI';
  workbook.created = new Date();

  for (const sheetSpec of spec.sheets.slice(0, 8)) {
    const name = sheetSpec.name.replace(/[\\/?*[\]]/g, '').slice(0, 31) || 'Sheet';
    const sheet = workbook.addWorksheet(name);
    sheet.addRow(sheetSpec.headers);
    const header = sheet.getRow(1);
    header.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    header.fill = HEADER_FILL;
    header.alignment = { vertical: 'middle' };

    for (const row of sheetSpec.rows.slice(0, 50)) {
      sheet.addRow(row);
    }

    for (const formula of sheetSpec.formulas ?? []) {
      const cell = sheet.getCell(formula.cell);
      cell.value = { formula: formula.formula.replace(/^=/, '') };
    }

    (sheetSpec.currencyColumns ?? []).forEach((col) => {
      sheet.getColumn(col).numFmt = '"$"#,##0.00';
    });

    (sheetSpec.columnWidths ?? sheetSpec.headers.map(() => 18)).forEach((width, index) => {
      sheet.getColumn(index + 1).width = width;
    });

    if (sheetSpec.freezeHeader) {
      sheet.views = [{ state: 'frozen', ySplit: 1 }];
    }

    for (const rule of sheetSpec.conditionalRules ?? []) {
      sheet.addConditionalFormatting({
        ref: rule.range,
        rules: [
          {
            type: 'cellIs',
            operator: rule.operator,
            formulae: [rule.formula],
            style: {
              fill: { type: 'pattern', pattern: 'solid', bgColor: { argb: rule.fillArgb } },
            },
          } as ExcelJS.ConditionalFormattingRule,
        ],
      });
    }
  }

  const notes = workbook.addWorksheet('About');
  notes.addRow(['Sheettomate AI template']);
  notes.addRow([spec.title]);
  notes.addRow([spec.description]);
  notes.addRow([`Industry: ${spec.industry}`]);

  const out = await workbook.xlsx.writeBuffer();
  return Buffer.from(out);
}
