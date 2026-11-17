import { describe, expect, test } from 'bun:test'
import {
  assertMongoTargetAllowed,
  isLocalMongoUri,
  resolveAtlasMongoUri,
  resolveTestMongoUri,
} from '../../../../scripts/mongo-target'

const REMOTE_URI = 'mongodb+srv://user:secret@cluster.mongodb.net/casesync_atlas_smoke'

describe('Mongo target policy', () => {
  test('uses a purpose-specific loopback default', () => {
    expect(resolveTestMongoUri('test', {})).toBe('mongodb://127.0.0.1:27017/casesync_test')
    expect(resolveTestMongoUri('e2e', {})).toBe('mongodb://127.0.0.1:27017/casesync_e2e')
    expect(resolveTestMongoUri('perf', {})).toBe('mongodb://127.0.0.1:27017/casesync_perf')
  })

  test('recognises loopback hosts and rejects other hosts without an explicit flag', () => {
    expect(isLocalMongoUri('mongodb://localhost:27017/casesync_test')).toBe(true)
    expect(isLocalMongoUri('mongodb://[::1]:27017/casesync_test')).toBe(true)
    expect(isLocalMongoUri(REMOTE_URI)).toBe(false)
    expect(() => assertMongoTargetAllowed(REMOTE_URI, {})).toThrow(/Refusing non-local/)
  })

  test('ignores a configured remote URI unless remote access is allowed', () => {
    expect(resolveTestMongoUri('test', { MONGODB_URI: REMOTE_URI })).toBe(
      'mongodb://127.0.0.1:27017/casesync_test',
    )
    expect(resolveTestMongoUri('test', { MONGODB_URI: REMOTE_URI, ALLOW_REMOTE_MONGO: '1' })).toBe(
      REMOTE_URI,
    )
  })

  test('honours an explicit test URI but still requires the remote flag', () => {
    expect(
      resolveTestMongoUri('e2e', { TEST_MONGODB_URI: 'mongodb://127.0.0.1:27018/other' }),
    ).toBe('mongodb://127.0.0.1:27018/other')
    expect(() =>
      resolveTestMongoUri('e2e', { TEST_MONGODB_URI: REMOTE_URI, ALLOW_REMOTE_MONGO: '1' }),
    ).not.toThrow()
  })

  test('Atlas smoke requires mongodb+srv and a dedicated database name', () => {
    expect(resolveAtlasMongoUri({ MONGODB_URI: REMOTE_URI, ALLOW_REMOTE_MONGO: '1' })).toBe(
      REMOTE_URI,
    )
    expect(() =>
      resolveAtlasMongoUri({
        MONGODB_URI: 'mongodb+srv://user:secret@cluster.mongodb.net/casesync',
        ALLOW_REMOTE_MONGO: '1',
      }),
    ).toThrow(/dedicated database/)
    expect(() =>
      resolveAtlasMongoUri({ MONGODB_URI: 'mongodb://127.0.0.1:27017/casesync_test' }),
    ).toThrow(/remote mongodb\+srv/)
  })
})
