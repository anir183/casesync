import mongoose from 'mongoose'
import { redactMongoUri, resolveAtlasMongoUri } from '../../../scripts/mongo-target'

const uri = resolveAtlasMongoUri()
const maxPoolSize = Number(process.env.MONGODB_MAX_POOL_SIZE ?? '5')
const maxIdleTimeMS = Number(process.env.MONGODB_MAX_IDLE_TIME_MS ?? '10000')

console.log(`[atlas-smoke] target ${redactMongoUri(uri)}`)
await mongoose.connect(uri, {
  maxPoolSize,
  maxIdleTimeMS,
  serverSelectionTimeoutMS: 10_000,
})

try {
  const db = mongoose.connection.db
  if (!db) throw new Error('Atlas smoke could not resolve the MongoDB database handle.')

  await db.admin().ping()
  console.log('[atlas-smoke] ping ok')

  const sample = await db
    .collection('user')
    .find({}, { projection: { _id: 1 } })
    .limit(1)
    .toArray()
  console.log(`[atlas-smoke] bounded read ok (${sample.length} document sampled)`)

  const runId = `atlas-smoke-${Date.now()}-${process.pid}`
  try {
    await db.collection('atlas_smoke').insertOne({ runId, createdAt: new Date() })
    console.log('[atlas-smoke] write probe ok')
  } finally {
    await db.collection('atlas_smoke').deleteMany({ runId })
  }
} finally {
  await mongoose.disconnect()
}
