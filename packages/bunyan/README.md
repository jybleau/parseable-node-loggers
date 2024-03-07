

# Parseable-Bunyan

Parseable buffered stream plugin for the popular Node-Bunyan logging framework.

## Dependencies

* [Parseable](https://www.parseable.io/)
* [Bunyan](https://github.com/trentm/node-bunyan)

## Installation

```
npm install parseable-bunyan
```

```
yarn add parseable-bunyan
```

## Usage

Package is `cjs` and `es6` compatible.

Logs are buffered in memory and flushed periodically for more efficient ingestion. By default a `maxEntries` of 250, and `flushInterval` of 5 seconds are used.

```js
const { ParseableStream } = require('parseable-bunyan')
const bunyan = require('bunyan')

const parseable = new ParseableTransport({
  url: process.env.PARSEABLE_URL, // Ex: 'https://parsable.myserver.local/api/v1/logstream'
  username: process.env.PARSEABLE_USERNAME,
  password: process.env.PARSEABLE_PASSWORD,
  logstream: process.env.PARSEABLE_LOGSTREAM, // The logstream name
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

### Tuning the default buffering options

```js
const parseable = new ParseableTransport({
  url: process.env.PARSEABLE_LOGS_URL,
  username: process.env.PARSEABLE_LOGS_USERNAME,
  password: process.env.PARSEABLE_LOGS_PASSWORD,
  logstream: process.env.PARSEABLE_LOGS_LOGSTREAM,
  buffer: { maxEntries: 100, flushInterval: 5000 }
})
```

### Other optional parameters

* `disableTLSCerts`: Default to false. Set to true to ignore invalid certificate
* `http2`: Default to true. Set to false to use HTTP/1.1 instead of HTTP/2.0

## LICENCE

MIT