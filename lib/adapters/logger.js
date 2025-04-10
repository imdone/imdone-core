import { info } from 'console'
import { isDev } from './environment.js'

class Logger {
  constructor() {
    this.enabled = isDev()
  }

  log(...args) {
    if (this.enabled) {
      info(...args)
    }
  }

  error(...args) {
    if (this.enabled) {
      info(...args)
    }
  }

  warn(...args) {
    if (this.enabled) {
      info(...args)
    }
  }

  info(...args) {
    if (this.enabled) {
      info(...args)
    }
  
  }
  debug(...args) {
    if (this.enabled) {
      info(...args)
    }
  }

  trace(...args) {
    if (this.enabled) {
      info(...args)
    }
  }

  time(...args) {
    if (this.enabled) {
      info(...args)
    }
  }

  timeEnd(...args) {
    if (this.enabled) {
      info(...args)
    }
  }
}

export const logger = new Logger()