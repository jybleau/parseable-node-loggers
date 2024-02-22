
const debug = require('debug')('parseable-winston')
const Transport = require('winston-transport')
const { ParseableClient } = require('./lib/ParseableClient')
const { BufferIngester } = require('./lib/BufferIngester')

// levels is a map of valid Winston to Parseable Logs levels.
const levels = {
  warn: 'warning',
  verbose: 'debug',
  silly: 'debug',
  emerg: 'emergency',
  crit: 'critical',
  help: 'info',
  data: 'info',
  prompt: 'info',
  http: 'info',
  input: 'info'
}

/**
 * ParseableTransport is the Parseable log transport.
 */

export class ParseableTransport extends Transport {

  /**
   * Initialize with the given config:
   * 
   * - `url`: Parseable instance endpoint
   * - `username`: API auth username
   * - `password`: API auth password
   * - `logstream`: log stream name
   * - `buffer`: Options for buffering
   *   - `maxEntries`: The maximum number of entries before flushing (defaults to 250)
   *   - `flushInterval`: The flush interval in milliseconds (defaults to 5,000)
   * - `tags`: Optional key:value tag object, applied as http header to all log events
   * - `disableTLSCerts`: Optional Boolean, default to false. Set to true to ignore invalid certificate
   * - `http2`: Optional Boolean. Default to true. Use http2 protocol
   */

  constructor({ url, username, password, logstream, buffer = {}, tags = {}, disableTLSCerts = false, http2 = true, ...options }) {
    super(options)
    this.client = new ParseableClient({ url, logstream, username, password, tags, disableTLSCerts, http2 })
    this.buffer = new BufferIngester({
      onFlush: this.onFlush.bind(this),
      onError: this.onError.bind(this),
      ...buffer
    })
  }

  /**
   * Log handler, buffer the event.
   */

  async log(info, callback) {
    const { level, message, ...fields } = info
    
    // normalize level
    const l = levels[level] || level

    // error details
    if (fields.error instanceof Error) {
      fields.error = fields.error.stack || fields.error.toString()
    }

    // event
    const e = {
      timestamp: new Date,
      level: l,
      message,
      ...fields
    }

    // buffer event
    this.buffer.push(e)

    callback()
  }

  /**
   * End handler, close the buffer.
   */

  async end(args: any): Promise<this> {
    debug('closing')
    await this.buffer.close()
    return super.end(args)
  }

  /**
   * Handle flushing.
   */

  async onFlush(events: any[]) {
    await this.client.sendEvents(events)
  }

  /**
   * Handle errors.
   */

  async onError(error: Error) {
    // TODO: maybe delegate here
    console.error('parseable-winston: error flushing logs: %s', error)
  }
}