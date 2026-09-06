export type CellValue = string | number | boolean | null;

export interface SheetFormula {
  cell: string;
  formula: string;
}

export interface ConditionalRuleSpec {
  range: string;
  operator: 'lessThan' | 'greaterThan' | 'equal';
  formula: string;
  fillArgb: string;
}

export interface SheetSpec {
  name: string;
  headers: string[];
  rows: CellValue[][];
  formulas?: SheetFormula[];
  columnWidths?: number[];
  freezeHeader?: boolean;
  currencyColumns?: number[];
  conditionalRules?: ConditionalRuleSpec[];
}

export interface WorkbookSpec {
  title: string;
  description: string;
  category: string;
  industry: string;
  tags: string[];
  sheets: SheetSpec[];
}

export const WORKBOOK_SPEC_INSTRUCTIONS = `Return ONLY valid JSON matching:
{
  "title": string,
  "description": string,
  "category": one of Finance,FMCG,Inventory,HR,NGO,Education,Real Estate,Agriculture,Health,E-commerce,
  "industry": one of Finance,FMCG,E-commerce,SaaS,Agriculture,NGO,HR,Inventory,
  "tags": string[],
  "sheets": [{
    "name": string (max 31 chars),
    "headers": string[],
    "rows": (string|number)[][]  // 6-12 sample rows, West Africa realistic names/currency USD and LRD,
    "formulas": [{ "cell": "E2", "formula": "C2-D2" }],
    "columnWidths": number[],
    "freezeHeader": true,
    "currencyColumns": number[] (1-based),
    "conditionalRules": [{ "range": "F2:F20", "operator": "lessThan", "formula": "0", "fillArgb": "FFFFC7CE" }]
  }]
}
Use Excel-style formulas without a leading equals sign. Include at least one Summary sheet with SUM/AVERAGE formulas.`;
