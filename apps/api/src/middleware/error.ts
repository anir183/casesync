import { Elysia } from 'elysia'

export const errorHandler = new Elysia({ name: 'error-handler' }).onError(({ code, error, set }) => {
  if (code === 'VALIDATION') {
    set.status = 400
    return { error: 'Validation Error', message: (error as any).message }
  }
  if (code === 'NOT_FOUND') {
    set.status = 404
    return { error: 'Not Found' }
  }
  set.status = 500
  return { error: 'Internal Server Error' }
})
