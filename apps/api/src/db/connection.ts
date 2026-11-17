import mongoose, { type ConnectOptions } from 'mongoose'
import { env } from '#/config/env'

export async function connectDb() {
  if (mongoose.connection.readyState >= 1) return
  const options: ConnectOptions = {}
  if (env.MONGODB_MAX_POOL_SIZE !== undefined) options.maxPoolSize = env.MONGODB_MAX_POOL_SIZE
  if (env.MONGODB_MAX_IDLE_TIME_MS !== undefined) {
    options.maxIdleTimeMS = env.MONGODB_MAX_IDLE_TIME_MS
  }
  await mongoose.connect(env.MONGODB_URI, options)
  console.log('[db] connected')
}
