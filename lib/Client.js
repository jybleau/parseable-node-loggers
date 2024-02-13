const { join } = require('node:path')
const debug = require('debug')('parseable-winston')

/**
 * ClientError is an API client error providing the HTTP status code and error type.
 */
class ClientError extends Error {
  constructor(status, message) {
    super(message)
    this.status = status
  }
}

/**
 * Client is the API client.
 */
class Client {
  /**
   * Initialize.
   */
  constructor(params) {
    this.url = params.url
    this.logstream = params.logstream
    this.username = params.username
    this.password = params.password
    this.tags = params.tags
  }

  /**
   * sendEvents: ingests a batch of events.
   */
  async sendEvents(events) {
    const auth = Buffer.from(`${this.username}:${this.password}`, 'binary').toString('base64')
    // additional optional header: X-P-META-[custom metadata name]
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Basic ${auth}`
    }
    // add tag headers
    for (const key in this.tags) {
      headers[`X-P-TAG-${key}`] = this.tags[key]
    }

    const body = JSON.stringify(events)

    try {
      const response = await fetch(join(this.url, this.logstream), {
        method: 'POST',
        body,
        headers
      });
      // we have an error, try to parse a well-formed json
      // error response, otherwise default to status code
      if (!response.ok) {
        const responseText = await response.text()
        throw new ClientError(response.status, responseText || response.statusText)
      } 
    } catch (error) {
      if (error.cause) {
        error.message += ' - ' + error.cause.message
        error.code = error.cause.code
      }
      // When debug is used, output the body when error is different than connection errors.
      if (!(['UND_ERR_CONNECT_TIMEOUT', 'UND_ERR_SOCKET', 'EPIPE', 'ECONNREFUSED'].includes(error.code))) {
        // error probably caused by body format
        debug(body)
      }
      throw error
    }
  }
}

exports.Client = Client;
