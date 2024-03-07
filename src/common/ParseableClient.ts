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
  tags: Object
  disableTLSCerts: boolean
  http2: boolean
  errorCodesToIgnoreOnDebug: string[]
  debug: (...args : any[]) => any
  /**
   * Initialize.
   */
  constructor({ url, logstream, username, password, tags = {}, disableTLSCerts = false, http2 = true, errorCodesToIgnoreOnDebug = [], debug = () => {}}: ParseableClientOptionsType) {
    this.baseurl = url
    this.logstream = logstream
    this.username = username
    this.password = password
    this.tags = tags
    this.disableTLSCerts = disableTLSCerts
    this.errorCodesToIgnoreOnDebug = errorCodesToIgnoreOnDebug
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

    const data: string = JSON.stringify(events)

    try {
      const url = this.url
      const request = superagent.post(url, data)
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
      if (!(this.errorCodesToIgnoreOnDebug.includes(error.code))) {
        // error probably caused by body format
        this.debug(data)
      }
      throw error
    }
  }
}
