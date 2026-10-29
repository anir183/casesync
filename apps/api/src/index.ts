import { env } from '#/config/env'
import { connectDb } from '#/db/connection'

await connectDb()

const { app } = await import('./app')
const { startScheduler } = await import('./jobs/scheduler')

app.listen(env.PORT)
startScheduler()

console.log(`🦊 Elysia running at ${app.server?.hostname}:${app.server?.port}`)
