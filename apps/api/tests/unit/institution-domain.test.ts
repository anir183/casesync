import { describe, expect, test } from 'bun:test'
import { domainFromEmail, isValidEmailDomain, normalizeEmailDomain } from '#/lib/institution-domain'

describe('normalizeEmailDomain', () => {
  test('lowercases, trims, and drops @, trailing dots, and www', () => {
    expect(normalizeEmailDomain('  @WWW.Example.EDU.  ')).toBe('example.edu')
    expect(normalizeEmailDomain('Example.EDU')).toBe('example.edu')
  })

  test('preserves subdomains other than www', () => {
    expect(normalizeEmailDomain('dept.example.edu')).toBe('dept.example.edu')
  })
})

describe('isValidEmailDomain', () => {
  test('accepts normal institutional domains', () => {
    expect(isValidEmailDomain('example.edu')).toBe(true)
    expect(isValidEmailDomain('dept.example-edu.in')).toBe(true)
  })

  test('rejects empty, single-label, and malformed domains', () => {
    expect(isValidEmailDomain('')).toBe(false)
    expect(isValidEmailDomain('localhost')).toBe(false)
    expect(isValidEmailDomain('bad_domain.edu')).toBe(false)
    expect(isValidEmailDomain('.edu')).toBe(false)
  })
})

describe('domainFromEmail', () => {
  test('extracts the normalized domain from the last @', () => {
    expect(domainFromEmail('rep@WWW.Example.EDU')).toBe('example.edu')
  })

  test('returns null for malformed addresses', () => {
    expect(domainFromEmail('no-at-sign')).toBeNull()
    expect(domainFromEmail('@example.edu')).toBeNull()
    expect(domainFromEmail('rep@')).toBeNull()
  })
})
