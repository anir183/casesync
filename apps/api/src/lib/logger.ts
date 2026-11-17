import { getRequestId } from '#/lib/request-context'

type LogLevel = 'info' | 'warn' | 'error'

type LogContext = Record<string, unknown>

function write(level: LogLevel, message: string, context?: LogContext) {
  const requestId = getRequestId()
  const entry = {
    ts: new Date().toISOString(),
    level,
    message,
    ...(requestId ? { requestId } : {}),
    ...context,
  }
  const line = JSON.stringify(entry)
  if (level === 'error') {
    console.error(line)
    return
  }
  if (level === 'warn') {
    console.warn(line)
    return
  }
  console.log(line)
}

export const logger = {
  info: (message: string, context?: LogContext) => write('info', message, context),
  warn: (message: string, context?: LogContext) => write('warn', message, context),
  error: (message: string, context?: LogContext) => write('error', message, context),
}
