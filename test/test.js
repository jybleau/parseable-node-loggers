const ParseableTransport = require('../src')
const winston = require('winston')

const parseable = new ParseableTransport({
  url: process.env.PARSEABLE_LOGS_URL,
  username: process.env.PARSEABLE_LOGS_USERNAME,
  authToken: process.env.PARSEABLE_LOGS_PASSWORD,
  logstream: process.env.PARSEABLE_LOGS_LOGSTREAM,
  buffer: { maxEntries: 200 }
})

const logger = winston.createLogger({
  levels: winston.config.syslog.levels,
  transports: [parseable],
  defaultMeta: { instance: 'app', hostname: 'app1' }
})


logger.info('User took the goggles', { userid: 1, user: { name: 'Rainier Wolfcastle' } })
logger.warning('The goggles do nothing', { userid: 1 })
logger.error('Something crashed', { error: new Error('boom') })

logger.end()