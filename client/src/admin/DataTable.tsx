import { ReactNode } from 'react';

export default function DataTable<T extends { id: string }>({
  columns,
  rows,
  onSort,
}: {
  columns: { key: string; label: string }[];
  rows: T[];
  onSort?: (key: string) => void;
}) {
  return (
    <div className="overflow-x-auto rounded-2xl border bg-white">
      <table className="w-full text-sm">
        <thead className="bg-stone-50 text-left">
          <tr>
            {columns.map((c) => (
              <th key={c.key} className="px-3 py-2">
                <button type="button" onClick={() => onSort?.(c.key)} className="font-semibold">
                  {c.label}
                </button>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} className="border-t">
              {columns.map((c) => (
                <td key={c.key} className="px-3 py-2">
                  {String((row as Record<string, unknown>)[c.key] ?? '') as ReactNode}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
