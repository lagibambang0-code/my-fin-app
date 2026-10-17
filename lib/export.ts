/**
 * Spreadsheet export helpers. Money Manager exports "Excel" from the Tutup
 * buku view; the clone writes an HTML workbook (`.xls`) because it needs no
 * extra dependency and opens natively in Excel, Numbers and LibreOffice.
 */

export type ExcelSheet = {
  title: string
  rows: (string | number)[][]
}

function escapeCell(value: string | number): string {
  const text = String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
  return `<td>${text}</td>`
}

export function buildExcelHtml(sheets: ExcelSheet[]): string {
  const body = sheets
    .map(
      (sheet) => `
    <h3>${sheet.title}</h3>
    <table border="1">
      ${sheet.rows.map((row) => `<tr>${row.map(escapeCell).join('')}</tr>`).join('\n      ')}
    </table>`,
    )
    .join('\n')

  return `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
  <head><meta charset="utf-8" /><title>Dompetku</title></head>
  <body>${body}</body>
</html>`
}

/** Trigger a client-side download for a generated document. */
export function downloadFile(filename: string, mime: string, content: string): void {
  const blob = new Blob([content], { type: `${mime};charset=utf-8` })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 0)
}
