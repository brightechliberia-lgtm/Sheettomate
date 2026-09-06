import { detectCategory, detectIndustry } from './prompts';
import type { WorkbookSpec } from './spec';

export function fallbackSpec(prompt: string): WorkbookSpec {
  const industry = detectIndustry(prompt);
  const category = detectCategory(prompt);
  const title = prompt.slice(0, 60).replace(/\s+/g, ' ').trim();

  if (industry === 'Inventory') {
    return {
      title: title || 'Inventory reorder workbook',
      description: prompt,
      category,
      industry,
      tags: ['inventory', 'tracking'],
      sheets: [
        {
          name: 'Stock',
          headers: ['SKU', 'Item', 'Supplier', 'Phone', 'On hand', 'Reorder point', 'Alert'],
          rows: [
            ['RICE-25', 'Rice 25kg', 'Freeport Traders', '+2315550101', 40, 50, ''],
            ['OIL-5', 'Palm oil 5L', 'Red Light Depot', '+2315550102', 120, 40, ''],
            ['SOAP', 'Laundry soap', 'Waterside Co-op', '+2315550103', 18, 30, ''],
          ],
          formulas: [
            { cell: 'G2', formula: 'IF(E2<F2,"REORDER","OK")' },
            { cell: 'G3', formula: 'IF(E3<F3,"REORDER","OK")' },
            { cell: 'G4', formula: 'IF(E4<F4,"REORDER","OK")' },
          ],
          freezeHeader: true,
          conditionalRules: [{ range: 'G2:G20', operator: 'equal', formula: '"REORDER"', fillArgb: 'FFFFC7CE' }],
        },
        {
          name: 'Summary',
          headers: ['Metric', 'Value'],
          rows: [['SKUs tracked', ''], ['Units on hand', '']],
          formulas: [
            { cell: 'B2', formula: 'COUNTA(Stock!A2:A200)' },
            { cell: 'B3', formula: 'SUM(Stock!E2:E200)' },
          ],
        },
      ],
    };
  }

  if (industry === 'HR') {
    return {
      title: title || 'Attendance tracker',
      description: prompt,
      category,
      industry,
      tags: ['tracking'],
      sheets: [
        {
          name: 'Attendance',
          headers: ['Employee', 'Role', 'Present days', 'Absent days', 'Leave days', 'Attendance %'],
          rows: [
            ['A. Kollie', 'Cashier', 22, 2, 0, ''],
            ['M. Johnson', 'Store lead', 20, 1, 3, ''],
            ['S. Kamara', 'Driver', 18, 4, 2, ''],
          ],
          formulas: [
            { cell: 'F2', formula: 'C2/(C2+D2+E2)' },
            { cell: 'F3', formula: 'C3/(C3+D3+E3)' },
            { cell: 'F4', formula: 'C4/(C4+D4+E4)' },
          ],
          freezeHeader: true,
        },
        {
          name: 'Monthly summary',
          headers: ['Total present', 'Average attendance'],
          rows: [['', '']],
          formulas: [
            { cell: 'A2', formula: 'SUM(Attendance!C2:C200)' },
            { cell: 'B2', formula: 'AVERAGE(Attendance!F2:F200)' },
          ],
        },
      ],
    };
  }

  return {
    title: title || 'West Africa workbook',
    description: prompt,
    category,
    industry,
    tags: ['budget', 'dashboard'],
    sheets: [
      {
        name: 'Transactions',
        headers: ['Month', 'Income USD', 'Income LRD', 'Expenses USD', 'Variance USD'],
        rows: [
          ['Jan', 1200, 228000, 900, ''],
          ['Feb', 1500, 285000, 1100, ''],
          ['Mar', 1350, 256500, 980, ''],
        ],
        formulas: [
          { cell: 'E2', formula: 'B2-D2' },
          { cell: 'E3', formula: 'B3-D3' },
          { cell: 'E4', formula: 'B4-D4' },
        ],
        currencyColumns: [2, 4, 5],
        freezeHeader: true,
        conditionalRules: [{ range: 'E2:E20', operator: 'lessThan', formula: '0', fillArgb: 'FFFFC7CE' }],
      },
      {
        name: 'Summary',
        headers: ['Total income USD', 'Total expenses USD', 'Net USD'],
        rows: [['', '', '']],
        formulas: [
          { cell: 'A2', formula: 'SUM(Transactions!B2:B13)' },
          { cell: 'B2', formula: 'SUM(Transactions!D2:D13)' },
          { cell: 'C2', formula: 'A2-B2' },
        ],
        currencyColumns: [1, 2, 3],
      },
    ],
  };
}
