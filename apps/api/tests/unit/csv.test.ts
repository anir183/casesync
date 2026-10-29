import { describe, expect, test } from 'bun:test'
import { csvFilename, escapeCsvCell, toCsv } from '#/lib/csv'

describe('CSV helpers', () => {
  test('escapes formula prefixes and delimiters', () => {
    expect(escapeCsvCell('=SUM(A1:A2)')).toBe("'=SUM(A1:A2)")
    expect(escapeCsvCell('plain')).toBe('plain')
    expect(escapeCsvCell('a,b')).toBe('"a,b"')
    expect(escapeCsvCell('line\nbreak')).toBe('"line\nbreak"')
    expect(escapeCsvCell('"quoted"')).toBe('"""quoted"""')
    expect(escapeCsvCell(undefined)).toBe('')
  })

  test('serialises rows with CRLF line endings', () => {
    expect(
      toCsv([
        ['case', 'remarks'],
        ['CASE-1', 'a,b'],
      ]),
    ).toBe('case,remarks\r\nCASE-1,"a,b"\r\n')
  })

  test('creates a dated filename', () => {
    expect(csvFilename('casesync-cases', new Date('2026-10-29T12:00:00.000Z'))).toBe(
      'casesync-cases-2026-10-29.csv',
    )
  })
})
