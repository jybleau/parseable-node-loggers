
import Debug from 'debug'
const debug = Debug('parseable-winston')
import Transport from 'winston-transport'
import { ParseableClient } from 'parseable-client'
import { BufferIngester } from './lib/BufferIngester'

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
  afterClose: () => void | undefined
  client: ParseableClient
  buffer: BufferIngester

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
    super(options);
    if (options.close) {
      this.afterClose = options.close;
    }
    this.close = this.onClose;
    this.client = new ParseableClient({ url, logstream, username, password, tags, disableTLSCerts, http2, debug })
    this.buffer = new BufferIngester({
      onFlush: this.onFlush.bind(this),
      onError: this.onError.bind(this),
      ...buffer
    })
  }

  /**
   * Log handler, buffer the event.
   */

  async log(info: { level: number | string, message: string | undefined, error: Error | string | undefined }, callback: () => void) {
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
   * Handle closing the buffer.
   */

  onClose(): void {
    debug('closing')
    this.buffer.close() // no await since TransportStream.close is not expected to be async
    if (this.afterClose) {
      this.afterClose()
    }
  }

  /**
   * Handle flushing.
   */

  async onFlush(events: object[]): Promise<void> {
    await this.client.sendEvents(events)
  }

  /**
   * Handle errors.
   */

  onError(error: Error | string): void {
    // TODO: maybe delegate here
    console.error('parseable-winston: error flushing logs: %s', error)
  }
}