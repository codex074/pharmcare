// CSV for Excel: UTF-8 with BOM, CRLF line ends, RFC 4180 quoting.
// Cells that Excel would run as formulas (= + - @, tab, CR) get a leading
// apostrophe — exported text comes from free-text fields people typed.

const FORMULA_START = /^[=+\-@\t\r]/

export function csvCell(v: unknown): string {
  let s: string
  if (v == null) s = ''
  else if (v instanceof Date) s = v.toISOString()
  else if (Array.isArray(v)) s = v.join('; ')
  else if (typeof v === 'object') s = JSON.stringify(v)
  else s = String(v)
  if (typeof v === 'string' && FORMULA_START.test(s)) s = `'${s}`
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

export function toCsv(headers: string[], rows: unknown[][]): string {
  const lines = [headers, ...rows].map((r) => r.map(csvCell).join(','))
  return `﻿${lines.join('\r\n')}\r\n`
}
