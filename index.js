
const debug = require('debug')('parseable-winston')
const Transport = require('winston-transport')
const { Client } = require('./lib/Client')
const Buffer = require('./lib/Buffer')

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

exports = module.exports = class ParseableTransport extends Transport {

  /**
   * Initialize with the given config:
   * 
   * - `url`: Apex Logs instance endpoint
   * - `username`: API auth username
   * - `password`: API auth password
   * - `logstream`: log stream name
   * - `buffer`: Options for buffering
   *   - `maxEntries`: The maximum number of entries before flushing (defaults to 250)
   *   - `flushInterval`: The flush interval in milliseconds (defaults to 5,000)
   */

  constructor({ url, username, password, logstream, buffer = {}, ...options }) {
    super(options)
    this.client = new Client({ url, logstream, username, password })
    this.buffer = new Buffer({
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

  async end(args) {
    debug('closing')
    await this.buffer.close()
    super.end(args)
  }

  /**
   * Handle flushing.
   */

  async onFlush(events) {
    await this.client.sendEvents(events)
  }

  /**
   * Handle errors.
   */

  async onError(error) {
    // TODO: maybe delegate here
    console.error('parseable-winston: error flushing logs: %s', error)
  }
}