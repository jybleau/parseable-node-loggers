
const debug = require('debug')('parseable-winston')
const { setTimeout } = require('timers/promises')

// error codes for which we can retry
const errorCodesToRetry = ['UND_ERR_CONNECT_TIMEOUT', 'UND_ERR_SOCKET', 'ECONNRESET', 'EPIPE']

/**
 * Buffer is used to batch events for efficient ingestion.
 */

module.exports = class Buffer {
  constructor({ onFlush, onError, maxEntries = 250, maxRetries = 3, flushInterval = 5000 }) {
    this.values = []
    this.maxEntries = maxEntries
    this.maxRetries = maxRetries
    this.onFlush = onFlush
    this.onError = onError
    this._id = setInterval(this.flush.bind(this), flushInterval)
  }

  push(value) {
    this.values.push(value)
    if (this.values.length >= this.maxEntries) {
      this.flush()
    }
  }

  async flush() {
    const values = this.values

    if (!values.length) {
      return
    }

    const doFlushAttempt = async (attempt = 1) => {
      debug(`flushing %d entries${attempt > 1 ? ` attempt ${attempt}` : ''}`, values.length)

      try {
        this.values = []
        await this.onFlush(values)
      } catch (error) {
        if (errorCodesToRetry.includes(error.code) && attempt < this.maxRetries) {
          // do retry
          await setTimeout(250)
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