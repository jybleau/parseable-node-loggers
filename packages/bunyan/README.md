

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
const { ParseableBunyan } = require('parseable-bunyan')
const bunyan = require('bunyan')

const parseableStream = new ParseableBunyan({
  url: process.env.PARSEABLE_URL, // Ex: 'https://parsable.myserver.local/api/v1/logstream'
  username: process.env.PARSEABLE_USERNAME,
  password: process.env.PARSEABLE_PASSWORD,
  logstream: process.env.PARSEABLE_LOGSTREAM, // The logstream name
  tags: { tag1: 'tagValue' } // optional tags to be added with each ingestion
  disableTLSCerts: true, // Optional: Default to false. Set to true to ignore invalid certificate
  http2: true, // Optional: Default to true. Set to false to use HTTP/1.1 instead of HTTP/2.0
  buffer: { maxEntries: 100, flushInterval: 5000 }, // Optional: Tune the default buffering options
  onError: error => console.error(error), // Optional: handle an error by yourself
  onRecord: record => { // optional onRecord event
    // Examples of what could be done here: exclude routes, methods, IPs and UAs
    const excludeMethods = 'HEAD,OPTIONS'
    const excludeRoutes = '/check,/test1'
    const excludeIPs = '192.168.1.1,192.168.1.2'
    const excludeUAs = 'UptimeRobot,AnnoyingUA'

    if (record.req) {
      if (excludeRoutes.includes(record.req.path)) {
        return false
      }
      if (excludeMethods.includes(record.req.method)) {
        return false
      }
      if (record.remoteAddress) {
        if (excludeIPs.some(ip => record.remoteAddress.includes(ip))) {
          return false
        }
      }            
      if (record.req.headers['user-agent']) {
        const _ua = record.req.headers['user-agent'].toLowerCase()
        if (excludeUAs.some(ua => _ua.includes(ua.toLowerCase()))) {
          return false
        }
      }
    }

    // You can also apply custom serialization here and return the serialized record.
  }
})

const bunyanLogger = bunyan.createLogger({
    name: 'logger',
    serializers, // optionally set your own serializers
    streams: [parseableStream]
  })

```

## LICENCE

MIT