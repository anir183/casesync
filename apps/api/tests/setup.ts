const integrationEnabled = process.env.RUN_INTEGRATION === '1'

if (!integrationEnabled) {
  process.env.MONGODB_URI ??= 'mongodb://127.0.0.1:27017/casesync_unit'
  process.env.BETTER_AUTH_SECRET ??= 'unit-test-only-secret'
  process.env.JEV_ENABLED ??= 'false'
  process.env.OVERLAP_AUTO_ASSESS ??= 'false'
  process.env.CRON_ENABLED ??= 'false'
  process.env.STAFF_SIGNUP_ENABLED ??= 'false'
}
