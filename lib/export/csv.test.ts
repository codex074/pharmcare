import { describe, expect, it } from 'vitest'
import { csvCell, toCsv } from './csv'

describe('csv', () => {
  it('starts with a BOM and uses CRLF', () => {
    expect(toCsv(['a', 'b'], [[1, 'x']])).toBe('﻿a,b\r\n1,x\r\n')
  })

  it('quotes commas, quotes and new lines', () => {
    expect(csvCell('a,b')).toBe('"a,b"')
    expect(csvCell('say "hi"')).toBe('"say ""hi"""')
    expect(csvCell('line1\nline2')).toBe('"line1\nline2"')
  })

  it('neutralises text that Excel would run as a formula', () => {
    expect(csvCell('=HYPERLINK("x")')).toBe(`"'=HYPERLINK(""x"")"`)
    expect(csvCell('+1')).toBe("'+1")
    expect(csvCell('@SUM(A1)')).toBe("'@SUM(A1)")
    expect(csvCell(-1)).toBe('-1') // real numbers stay numbers
  })

  it('formats empty, arrays, dates and objects', () => {
    expect(csvCell(null)).toBe('')
    expect(csvCell(['ก', 'ข'])).toBe('ก; ข')
    expect(csvCell(new Date('2026-10-12T02:00:00Z'))).toBe('2026-10-12T02:00:00.000Z')
    expect(csvCell({ a: 1 })).toBe('"{""a"":1}"')
  })
})
