// Log levels with numeric values for comparison
const LogLevel = {
  ERROR: 0,
  WARN: 1,
  INFO: 2,
  DEBUG: 3,
  TRACE: 4,
  NONE: -1  // Use this to disable all logging
}

export function getCallerInfo() {
  const err = new Error();
  const stack = err.stack?.split('\n');

  if (!stack || stack.length < 5) return {};

  // stack[0] is "Error"
  // stack[1] is this function (getCallerInfo)
  // stack[2] is the formatMessage method
  // stack[3] is the logger method (log, info, debug, etc.)
  // stack[4] is the actual caller we want

  const callerLine = stack[4] || stack[3]; // Get the actual caller, fallback to logger method if needed
  const match = callerLine.match(/at (.+?) \((.+):(\d+):(\d+)\)/) ||
                callerLine.match(/at (.+):(\d+):(\d+)/);

  if (match) {
    if (match.length === 5) {
      return {
        functionName: match[1],
        file: match[2],
        line: parseInt(match[3], 10),
        column: parseInt(match[4], 10)
      };
    } else if (match.length === 4) {
      return {
        functionName: '<anonymous>',
        file: match[1],
        line: parseInt(match[2], 10),
        column: parseInt(match[3], 10)
      };
    }
  }

  return {};
}

const DEFAULT_LOG_LEVEL = LogLevel.WARN;
const DEFAULT_LOG_LEVEL_NAME = Object.keys(LogLevel).find(key => LogLevel[key] === DEFAULT_LOG_LEVEL);

class Logger {
  constructor() {
    // Default log level
    this.level = DEFAULT_LOG_LEVEL
  }

  // Setter for log level
  setLevel(level) {
    if (level in LogLevel) {
      this.level = LogLevel[level]
    } else if (typeof level === 'number' && level >= -1 && level <= 4) {
      this.level = level
    } else {
      this.level = DEFAULT_LOG_LEVEL
      console.warn(`Invalid log level: ${level}. Using default ${DEFAULT_LOG_LEVEL_NAME} level.`)
    }
    return this
  }

  // Check if the provided level should be logged
  shouldLog(level) {
    return level <= this.level
  }

  formatMessage(args) {
    const info = getCallerInfo();
    const prefix = info.file ? `[${info.file}:${info.line}] ${info.functionName} - ` : '';
    
    if (typeof args[0] === 'string') {
      args[0] = prefix + args[0];
    } else {
      args.unshift(prefix);
    }
    
    return args;
  }

  log(...args) {
    if (this.shouldLog(LogLevel.INFO)) {
      console.log(...this.formatMessage(args));
    }
  }

  error(...args) {
    if (this.shouldLog(LogLevel.ERROR)) {
      console.error(...this.formatMessage(args));
    }
  }

  warn(...args) {
    if (this.shouldLog(LogLevel.WARN)) {
      console.warn(...this.formatMessage(args));
    }
  }

  info(...args) {
    if (this.shouldLog(LogLevel.INFO)) {
      console.info(...this.formatMessage(args));
    }
  }

  debug(...args) {
    if (this.shouldLog(LogLevel.DEBUG)) {
      console.debug(`[DEBUG]`, ...this.formatMessage(args));
    }
  }

  trace(...args) {
    if (this.shouldLog(LogLevel.TRACE)) {
      console.trace(`[TRACE]`, ...this.formatMessage(args));
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