import mongoose from 'mongoose'
import { env } from '#/config/env'

export async function connectDb() {
  if (mongoose.connection.readyState >= 1) return
  await mongoose.connect(env.MONGODB_URI)
  console.log('[db] connected')
}
