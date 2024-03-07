
import { setTimeout as setTimeoutPromise } from 'timers/promises'

type BufferIngesterOptionsType = { 
  onFlush: (value: object[]) => Promise<void>,
  onError: (error: Error) => void,
  maxEntries?: number,
  maxRetries?: number
  flushInterval?: number, 
  errorCodesToRetry?: string[],
  debug?: (...args: any[]) => any, 
}

/**
 * Buffer is used to batch events for efficient ingestion.
 */
export class BufferIngester {
  values: object[]
  maxEntries: number
  maxRetries: number
  flushInterval: number
  errorCodesToRetry: string[]
  private _id: NodeJS.Timeout
  onFlush: (value: object[]) => Promise<void>
  onError: (error: Error) => void
  debug: (...args : any[]) => any
  
  constructor({ onFlush, onError, maxEntries = 250, maxRetries = 3, flushInterval = 5000, errorCodesToRetry = ['UND_ERR_CONNECT_TIMEOUT', 'UND_ERR_SOCKET', 'ECONNRESET', 'EPIPE'], debug = () => {}}: BufferIngesterOptionsType) {
    this.values = []
    this.maxEntries = maxEntries
    this.maxRetries = maxRetries
    this.onFlush = onFlush
    this.onError = onError
    this.errorCodesToRetry = errorCodesToRetry
    this.debug = debug
    this._id = setInterval(this.flush.bind(this), flushInterval)
  }

  push(value) {
    this.values.push(value)
    if (this.values.length >= this.maxEntries) {
      this.flush()
    }
  }

  async flush() {
    const values: object[] = this.values

    if (!values.length) {
      return
    }

    const doFlushAttempt = async (attempt = 1) => {
      this.debug(`flushing %d entries${attempt > 1 ? ` attempt ${attempt}` : ''}`, values.length)

      try {
        this.values = []
        await this.onFlush(values)
      } catch (error) {
        if (this.errorCodesToRetry.includes(error.code) && attempt < this.maxRetries) {
          // do retry
          await setTimeoutPromise(250)
          await doFlushAttempt(attempt + 1)
        } else {
          this.onError(error)
        }
      }
    }

    await doFlushAttempt()
  }

  async close() {
    clearInterval(this._id)
    await this.flush()
  }
}