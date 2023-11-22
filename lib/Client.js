const { join } = require('node:path')

/**
 * ClientError is an API client error providing the HTTP status code and error type.
 */
class ClientError extends Error {
  constructor(status, message) {
    super(message);
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

    const response = await fetch(join(this.url, this.logstream), {
      method: 'POST',
      body: JSON.stringify(events),
      headers
    });
    // we have an error, try to parse a well-formed json
    // error response, otherwise default to status code
    if (!response.ok) {
      const responseText = await response.text()
      throw new ClientError(response.status, responseText || response.statusText)
    }
  }
}

exports.Client = Client;
