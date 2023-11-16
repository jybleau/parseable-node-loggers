const { join } = require('node:path')

/**
 * ClientError is an API client error providing the HTTP status code and error type.
 */
class ClientError extends Error {
  constructor(status, message, type) {
    super(message);
    this.status = status;
    this.type = type;
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
  }

  /**
   * addEvents: ingests a batch of events.
   */
  async addEvents(events) {
    const auth = Buffer.from(`${this.username}:${this.password}`, 'binary').toString('base64')
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Basic ${auth}`,
      //'X-P-META-Host': '192.168.1.3', // INFO: Use X-P-META-<key>:<value> to add custom metadata to the log event
      //'X-P-TAG-Language': 'javascript' // INFO: Use X-P-TAG-<key>:<value> to add tags to the log event
    }

    const res = await fetch(join(this.url, this.logstream), {
      method: 'POST',
      body: JSON.stringify(events),
      headers
    });
    // we have an error, try to parse a well-formed json
    // error response, otherwise default to status code
    if (res.status >= 300) {
      let err
      try {
        const { type, message } = await res.json()
        err = new ClientError(res.status, message, type)
      }
      catch (_a) {
        err = new ClientError(res.status, res.statusText)
      }
      throw err
    }
  }
}

exports.Client = Client;
