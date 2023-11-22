

# Parseable-Winston

Parseable transport plugin for the popular Winston logging framework.

## Dependencies

* [Parseable](https://www.parseable.io/)
* [Winston](https://github.com/winstonjs/winston)

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
  logstream: process.env.PARSEABLE_LOGS_LOGSTREAM,
  tags: { tag1: 'tagValue' } // optional tags to be added with each ingestion
})

const logger = winston.createLogger({
  levels: winston.config.syslog.levels,
  transports: [parseable],
  defaultMeta: { instance: 'app', hostname: 'app1' }
})

logger.info('User took the goggles', { userid: 1, user: { name: 'Rainier Wolfcastle' } })
logger.warning('The goggles do nothing', { userid: 1 })

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

*Inspired from TJ's Apex-Logs-Winston*

## LICENCE

MIT