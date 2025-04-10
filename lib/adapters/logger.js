import { info, error as consoleError, warn as consoleWarn } from 'console'

// Log levels with numeric values for comparison
const LogLevel = {
  ERROR: 0,
  WARN: 1,
  INFO: 2,
  DEBUG: 3,
  TRACE: 4,
  NONE: -1  // Use this to disable all logging
}

class Logger {
  constructor() {
    // Default log level
    this.level = LogLevel.INFO
  }

  // Setter for log level
  setLevel(level) {
    if (level in LogLevel) {
      this.level = LogLevel[level]
    } else if (typeof level === 'number' && level >= -1 && level <= 4) {
      this.level = level
    } else {
      consoleWarn(`Invalid log level: ${level}. Using default INFO level.`)
    }
    return this
  }

  // Check if the provided level should be logged
  shouldLog(level) {
    return level <= this.level
  }

  log(...args) {
    if (this.shouldLog(LogLevel.INFO)) {
      info(...args)
    }
  }

  error(...args) {
    if (this.shouldLog(LogLevel.ERROR)) {
      consoleError(...args)
    }
  }

  warn(...args) {
    if (this.shouldLog(LogLevel.WARN)) {
      consoleWarn(...args)
    }
  }

  info(...args) {
    if (this.shouldLog(LogLevel.INFO)) {
      info(...args)
    }
  }

  debug(...args) {
    if (this.shouldLog(LogLevel.DEBUG)) {
      info(`[DEBUG]`, ...args)
    }
  }

  trace(...args) {
    if (this.shouldLog(LogLevel.TRACE)) {
      info(`[TRACE]`, ...args)
    }
  }

  time(label) {
    if (this.shouldLog(LogLevel.DEBUG)) {
      console.time(label)
    }
  }

  timeEnd(label) {
    if (this.shouldLog(LogLevel.DEBUG)) {
      console.timeEnd(label)
    }
  }
}

export const logger = new Logger()
export { LogLevel }