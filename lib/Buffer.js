
const debug = require('debug')('parseable-winston')

// TODO: implement retries

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
    debug('flushing %d entries', values.length)
    
    try {
      this.values = []
      await this.onFlush(values)
    } catch(err) {
      debug(values)
      this.onError(err)
    }
  }

  async close() {
    clearInterval(this._id)
    await this.flush()
  }
}