import { join } from 'node:path'
import superagent from 'superagent'

type ParseableClientOptionsType = { 
  url: string,
  logstream: string,
  username: string,
  password: string,
  tags?: Object, 
  disableTLSCerts?: boolean, 
  http2?: boolean,
  errorCodesToIgnoreOnDebug?: string[],
  debug?: (...args : any[]) => any, 
}

/**
 * ClientError is an API client error providing the HTTP status code and error type.
 */
export class ClientError extends Error {
  status: number
  response?: Response 
  constructor(status: number, message: string) {
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
  tags: Object
  disableTLSCerts: boolean
  http2: boolean
  debug: (...args : any[]) => any
  /**
   * Initialize.
   */
  constructor({ url, logstream, username, password, tags = {}, disableTLSCerts = false, http2 = true, debug = () => {}}: ParseableClientOptionsType) {
    this.baseurl = url
    this.logstream = logstream
    this.username = username
    this.password = password
    this.tags = tags
    this.disableTLSCerts = disableTLSCerts
    this.http2 = http2
    this.debug = debug
  }

  get url() {
    const url = new URL(this.baseurl)
    url.pathname = join(url.pathname, this.logstream)
    return url.href
  }


  /**
   * sendEvents: ingests a batch of events.
   */
  async sendEvents(events: object[]) {
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

    let data: string = JSON.stringify(events)

    try {
      const url = this.url
      const request = superagent.post(url)
      if (this.disableTLSCerts) request.disableTLSCerts()
      if (this.http2) request.http2()
      request.set(headers)
      request.write(data)
      await request
    } catch (error) {
      // A cause may have been given 
      if (error.cause) {
        error.message += ` - ${error.cause.message}`
        error.code = error.cause.code
      }
      // Parseable returned a response text
      if (error.response && error.response.text) {
        error.message += ` - ${error.response.text}`
      }
      // When debug is used, output the body when error is different than connection errors.
      if (error.status === 400) { // bad request. Body malformed.
        // error could have been caused by body format
        this.debug(data)
      }
      throw error
    }
  }
}
