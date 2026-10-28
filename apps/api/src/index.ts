import { env } from '#/config/env'
import { connectDb } from '#/db/connection'

await connectDb()

const { app } = await import('./app')

app.listen(env.PORT)

console.log(`🦊 Elysia running at ${app.server?.hostname}:${app.server?.port}`)
