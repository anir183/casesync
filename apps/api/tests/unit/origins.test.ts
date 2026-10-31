import { describe, expect, test } from 'bun:test'
import { parseAllowedOrigins } from '#/lib/origins'

describe('parseAllowedOrigins', () => {
  test('parses a single origin', () => {
    expect(parseAllowedOrigins('http://localhost:5173', 'production')).toEqual([
      'http://localhost:5173',
    ])
  })

  test('splits, trims, and de-duplicates a comma-separated list', () => {
    expect(
      parseAllowedOrigins(
        ' http://localhost:5173 , https://casesync.example ,http://localhost:5173/ ',
        'production',
      ),
    ).toEqual(['http://localhost:5173', 'https://casesync.example'])
  })

  test('adds the loopback counterpart outside production', () => {
    expect(parseAllowedOrigins('http://localhost:5173', 'development')).toEqual([
      'http://localhost:5173',
      'http://127.0.0.1:5173',
    ])
    expect(parseAllowedOrigins('http://127.0.0.1:5173', 'test')).toEqual([
      'http://127.0.0.1:5173',
      'http://localhost:5173',
    ])
  })

  test('does not add the loopback counterpart in production', () => {
    expect(parseAllowedOrigins('https://casesync.example', 'production')).toEqual([
      'https://casesync.example',
    ])
  })

  test('rejects an origin with a path or invalid URL', () => {
    expect(() => parseAllowedOrigins('http://localhost:5173/app', 'production')).toThrow(
      'without a path',
    )
    expect(() => parseAllowedOrigins('not-a-url', 'production')).toThrow()
  })
})
