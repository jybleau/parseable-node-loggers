
import Debug from 'debug'
const debug = Debug('parseable-winston')
import Transport from 'winston-transport'
import { ParseableClient } from '../../../src/common/ParseableClient'
import { BufferIngester } from '../../../src/common/BufferIngester'

type LogInfoType = {
  level: number | string,
  message: string | undefined
} & {
  [key: string]: any
}

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
  onErrorOverride: (error: Error | string) => void | undefined
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
   *   - `errorCodesToRetry` Optional. Array or error string code. The buffer ingester will retry when encountering those errors. Default to: ['UND_ERR_CONNECT_TIMEOUT', 'UND_ERR_SOCKET', 'ECONNRESET', 'EPIPE']
   * - `tags`: Optional key:value tag object, applied as http header to all log events
   * - `disableTLSCerts`: Optional Boolean, default to false. Set to true to ignore invalid certificate
   * - `http2`: Optional Boolean. Default to true. Use http2 protocol
   * - `onError`: Optional function to override default onError handler.
   */

  constructor({ url, username, password, logstream, buffer = {}, tags = {}, disableTLSCerts = false, http2 = true, ...options }) {
    super(options)
    // after close event
    if (options.close) {
      this.afterClose = options.close
    }
    // on error event
    if (options.onError) {
      this.onErrorOverride = options.onError
    }

    this.buffer = new BufferIngester({
      onFlush: this.onFlush.bind(this),
      onError: this.onError.bind(this),
      debug,
      ...buffer
    })
    this.client = new ParseableClient({ url, logstream, username, password, tags, disableTLSCerts, http2, debug })
  }

  /**
   * Log handler, buffer the event.
   */
  async log(info: LogInfoType, callback: () => void) {
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
   * Calls onClose().
   */
  close() {
    this.onClose()
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
   * Error handler. Write error to console if no onError override option was given to constructor.
   */
  onError(error: Error): void {
    if (this.onErrorOverride) {
      this.onErrorOverride(error)
    } else {
      console.error(`parseable-winston: error flushing logs: ${error.toString()}`)
    }
  }
}