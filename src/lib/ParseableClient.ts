const { join } = require('node:path')
const superagent = require('superagent')
const debug = require('debug')('parseable-winston')

/**
 * ClientError is an API client error providing the HTTP status code and error type.
 */
export class ClientError extends Error {
  status: number | string
  constructor(status: number | string, message: string) {
    super(message)
    this.status = status
  }
}

/**
 * ParseableClient is the Parseable API client.
 */
export class ParseableClient {
  baseurl: string
  logstream: string
  username: string
  password: string
  disableTLSCerts: boolean | undefined
  http2: boolean | undefined
  tags: object | undefined
  /**
   * Initialize.
   */
  constructor(params) {
    this.baseurl = params.url
    this.logstream = params.logstream
    this.username = params.username
    this.password = params.password
    this.disableTLSCerts = params.disableTLSCerts
    this.http2 = params.http2
    this.tags = params.tags
  }

  get url() {
    const url = new URL(this.baseurl)
    url.pathname = join(url.pathname, this.logstream)
    return url.href
  }


  /**
   * sendEvents: ingests a batch of events.
   */
  async sendEvents(events: any[]) {
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
      const url = this.url
      const request = superagent.post(url, body)
      if (this.disableTLSCerts) request.disableTLSCerts()
      if (this.http2) request.http2()
      request.set(headers) 
      const response = await request
      
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
