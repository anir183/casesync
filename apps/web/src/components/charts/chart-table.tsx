export function ChartTable({
  caption,
  columns,
  rows,
}: {
  caption: string
  columns: string[]
  rows: Array<Array<string | number>>
}) {
  if (rows.length === 0) return null
  return (
    <details className="group mt-4 text-sm">
      <summary className="cursor-pointer select-none text-xs font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline">
        View data table
      </summary>
      <div className="mt-2 overflow-x-auto rounded-lg border border-border">
        <table className="w-full border-collapse text-left">
          <caption className="sr-only">{caption}</caption>
          <thead className="bg-muted/60">
            <tr>
              {columns.map((column) => (
                <th
                  key={column}
                  scope="col"
                  className="px-3 py-2 text-xs font-medium uppercase tracking-wide text-muted-foreground"
                >
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.map(String).join('|')} className="border-t border-border">
                {row.map((cell, cellIndex) => (
                  <td
                    key={`${columns[cellIndex] ?? 'column'}-${String(cell)}`}
                    className="px-3 py-2 text-sm"
                  >
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  )
}
