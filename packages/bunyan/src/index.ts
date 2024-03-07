
import Debug from 'debug'
const debug = Debug('parseable-bunyan')
import { ParseableClient } from '../../../src/common/ParseableClient'
import { BufferIngester } from '../../../src/common/BufferIngester'

type RecordObject = {
  level: number,
  levelName?: string,
  msg?: string,
  err?: Error | string,
  req?: Object,
  res?: Object
} & {
  [key: string]: any
}

/**
 * OnRecord event to modify the record or to cancel the buffering. To proceed, return true; to cancel, return false.
 */
type RecordEvent = (record: RecordObject) => Boolean
type ParseableStreamOptions = {
  url: string,
  username: string,
  password: string,
  logstream: string,
  buffer?: Object,
  tags?: Object,
  disableTLSCerts?: boolean,
  http2?: boolean,
  onError?: (error: Error | String) => void,
  onRecord?: RecordEvent
}

// levels is a map of valid Winston to Parseable Logs levels.
const levelNameMap = {
  10: 'trace',
  20: 'debug',
  30: 'info',
  40: 'warn',
  50: 'error',
  60: 'fatal'
}

/**
 * ParseableStream is the Parseable log stream.
 */
export class ParseableStream {
  onErrorOverride: (error: Error | string) => void | undefined
  onRecord: RecordEvent
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
   * - `onError`: Optional Function so you can process errors. Default: logs the error to the console.
   * - `onRecord`: Optional Function. Can be used to modify the record before buffering or cancel the buffering event by returning false.
   */
  constructor({ url, username, password, logstream, buffer = {}, tags = {}, disableTLSCerts = false, http2 = true, onError, onRecord }: ParseableStreamOptions) {
    // on error event
    if (onError) {
      this.onErrorOverride = onError
    }
    // on record event, can be used to control logging
    this.onRecord = onRecord

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
  async write(record: RecordObject) {
    try {
      const proceed: Boolean = this.onRecord ? this.onRecord(record) : true
      if (proceed === false) {
        return // do not log
      }
      if (!record.levelName) record.levelName = levelNameMap[record.level] || 'info'

      // buffer event
      this.buffer.push(record)

    } catch (error) {
      this.onError(error)
    }
  }

  /**
   * Handle closing the buffer.
   */
  async close(): Promise<void> {
    debug('closing')
    await this.buffer.close()
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
      console.error(`parseable-bunyan: error flushing logs: ${error.toString()}`)
    }
  }
}