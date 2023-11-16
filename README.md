

[Parseable](https://www.parseable.io/) transport for the popular [Winston](https://github.com/winstonjs/winston) Node.js logging framework.

## Installation

```
npm install parseable-winston
```

```
yarn add parseable-winston
```

## Usage

Logs are buffered in memory and flushed periodically for more efficient ingestion. By default a `maxEntries` of 250, and `flushInterval` of 5 seconds are used.

```js
const ParseableTransport = require('parseable-winston')
const winston = require('winston')

const parseable = new ParseableTransport({
  url: process.env.PARSEABLE_LOGS_URL,
  username: process.env.PARSEABLE_LOGS_USERNAME,
  password: process.env.PARSEABLE_LOGS_PASSWORD,
  logstream: process.env.PARSEABLE_LOGS_LOGSTREAM
})

const logger = winston.createLogger({
  levels: winston.config.syslog.levels,
  transports: [parseable],
  defaultMeta: { program: 'app', host: 'app1' }
})

logger.info('User took the goggles', { userid: 1, user: { name: 'Rainier Wolfcastle' } })
logger.warn('The goggles do nothing', { userid: 1 })
```

Tuning the default buffering options:

```js
const parseable = new ParseableTransport({
  url: process.env.PARSEABLE_LOGS_URL,
  username: process.env.PARSEABLE_LOGS_USERNAME,
  password: process.env.PARSEABLE_LOGS_PASSWORD,
  logstream: process.env.PARSEABLE_LOGS_LOGSTREAM,
  buffer: { maxEntries: 100, flushInterval: 5000 }
})
```

## Notes

Based on the TJ's work: Apex-Logs-Winston

## LICENCE

MIT