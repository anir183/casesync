// E2E-only probe for unhandled route errors. The guard flag is set only by the
// Playwright web server build, so production builds never throw on a query param.

export function throwIfForcedRouteError(searchParams: URLSearchParams) {
  if (import.meta.env.VITE_ROUTE_ERROR_PROBE === '1' && searchParams.has('forceRouteError')) {
    throw new Error('Forced route error for E2E coverage')
  }
}
