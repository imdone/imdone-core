import { describe, it, expect, beforeEach, vi, afterAll, afterEach} from 'vitest';
import { logger, LogLevel } from '../logger.js';

describe('Logger', () => {
  // Declare spies
  let debugSpy, infoSpy, errorSpy, warnSpy, timeSpy, timeEndSpy;
  
  // Setup spies before each test
  beforeEach(() => {
    // Create spies on the actual console methods
    debugSpy = vi.spyOn(console, 'debug').mockImplementation(() => {});
    infoSpy = vi.spyOn(console, 'info').mockImplementation(() => {});
    errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    timeSpy = vi.spyOn(console, 'time').mockImplementation(() => {});
    timeEndSpy = vi.spyOn(console, 'timeEnd').mockImplementation(() => {});
  });
  
  // Restore all mocks after tests
  afterEach(() => {
    vi.restoreAllMocks();
  });
  
  afterAll(() => {
    vi.restoreAllMocks();
  });

  // Test LogLevel enum
  describe('LogLevel', () => {
    it('should have correct log level values', () => {
      expect(LogLevel.ERROR).toBe(0);
      expect(LogLevel.WARN).toBe(1);
      expect(LogLevel.INFO).toBe(2);
      expect(LogLevel.DEBUG).toBe(3);
      expect(LogLevel.TRACE).toBe(4);
      expect(LogLevel.NONE).toBe(-1);
    });
  });

  // Test logger initialization
  describe('Initialization', () => {
    it('should initialize with WARN log level by default', () => {
      expect(logger.level).toBe(LogLevel.WARN);
    });
  });

  // Test setLevel method
  describe('setLevel', () => {
    it('should set level when valid string is provided', () => {
      logger.setLevel('ERROR');
      expect(logger.level).toBe(LogLevel.ERROR);
      
      logger.setLevel('INFO');
      expect(logger.level).toBe(LogLevel.INFO);
      
      // Reset to DEBUG for other tests
      logger.setLevel('DEBUG');
    });

    it('should set level when valid number is provided', () => {
      logger.setLevel(0);
      expect(logger.level).toBe(0);
      
      logger.setLevel(3);
      expect(logger.level).toBe(3);
      
      // Reset to DEBUG for other tests
      logger.setLevel(LogLevel.DEBUG);
    });

    it('should warn and use default when invalid level is provided', () => {
      logger.setLevel('INVALID_LEVEL');
      expect(warnSpy).toHaveBeenCalled();
      expect(logger.level).toBe(LogLevel.WARN);
      
      logger.setLevel(10);
      expect(warnSpy).toHaveBeenCalled();
      expect(logger.level).toBe(LogLevel.WARN);
    });

    it('should return this for method chaining', () => {
      const result = logger.setLevel('INFO');
      expect(result).toBe(logger);
      
      // Reset to DEBUG for other tests
      logger.setLevel(LogLevel.DEBUG);
    });
  });

  // Test shouldLog method
  describe('shouldLog', () => {
    it('should return true for levels below or equal to current level', () => {
      logger.setLevel(LogLevel.INFO);
      
      expect(logger.shouldLog(LogLevel.ERROR)).toBe(true);
      expect(logger.shouldLog(LogLevel.WARN)).toBe(true);
      expect(logger.shouldLog(LogLevel.INFO)).toBe(true);
      
      // Reset to DEBUG for other tests
      logger.setLevel(LogLevel.DEBUG);
    });

    it('should return false for levels above current level', () => {
      logger.setLevel(LogLevel.INFO);
      
      expect(logger.shouldLog(LogLevel.DEBUG)).toBe(false);
      expect(logger.shouldLog(LogLevel.TRACE)).toBe(false);
      
      // Reset to DEBUG for other tests
      logger.setLevel(LogLevel.DEBUG);
    });
  });

  // Test each logging method
  describe('Logging methods', () => {
    beforeEach(() => {
      // Set to TRACE to ensure all log levels are tested
      logger.setLevel(LogLevel.TRACE);
    });

    it('should call console.error for error method', () => {
      logger.error('Test error message');
      expect(errorSpy).toHaveBeenCalled();
    });

    it('should call console.warn for warn method', () => {
      logger.warn('Test warning message');
      expect(warnSpy).toHaveBeenCalled();
    });

    it('should call console.info for info method', () => {
      logger.info('Test info message');
      expect(infoSpy).toHaveBeenCalled();
    });

    it('should call console.debug with [DEBUG] prefix for debug method', () => {
      logger.debug('Test debug message');
      expect(debugSpy).toHaveBeenCalled();
      
      // Check that [DEBUG] is first argument and the message includes the caller info
      const args = debugSpy.mock.calls[0];
      expect(args[0]).toBe('[DEBUG]');
      expect(args[1]).toMatch(/\[.*logger\.spec\.js:\d+\].*Test debug message/);
    });

    it('should call console.trace with [TRACE] prefix for trace method', () => {
      logger.trace('Test trace message');
      // First argument should be [TRACE]
      const traceSpy = vi.spyOn(console, 'trace');
      logger.trace('Test trace message');
      const args = traceSpy.mock.calls[0];
      expect(args[0]).toBe('[TRACE]');
      expect(args[1]).toMatch(/\[.*logger\.spec\.js:\d+\].*Test trace message/);
    });

    it('should call console.time and console.timeEnd for time methods', () => {
      logger.time('test-timer');
      logger.timeEnd('test-timer');
      
      expect(timeSpy).toHaveBeenCalledWith('test-timer');
      expect(timeEndSpy).toHaveBeenCalledWith('test-timer');
    });

    it('should not log when level is below threshold', () => {
      logger.setLevel(LogLevel.ERROR);
      
      logger.warn('This should not be logged');
      logger.info('This should not be logged');
      logger.debug('This should not be logged');
      logger.trace('This should not be logged');
      
      expect(warnSpy).not.toHaveBeenCalled();
      expect(infoSpy).not.toHaveBeenCalled();
      
      // But error should still be logged
      logger.error('This should be logged');
      expect(errorSpy).toHaveBeenCalled();
      
      // Reset to DEBUG for other tests
      logger.setLevel(LogLevel.DEBUG);
    });
  });

  // Test message formatting
  describe('Message formatting', () => {
    it('should prefix string messages with caller info', () => {
      logger.info('Test message');
      
      // The message should contain file and line information
      const firstArg = infoSpy.mock.calls[0][0];
      expect(firstArg).toMatch(/\[.*logger\.spec\.js:\d+\]/);
    });

    it('should handle non-string first arguments', () => {
      logger.info({ key: 'value' });
      
      // The first argument should be the caller info prefix
      const firstArg = infoSpy.mock.calls[0][0];
      expect(firstArg).toMatch(/\[.*logger\.spec\.js:\d+\]/);
      
      // The second argument should be the object
      const secondArg = infoSpy.mock.calls[0][1];
      expect(secondArg).toEqual({ key: 'value' });
    });

    it('should handle multiple arguments', () => {
      logger.info('Message', 'arg2', { key: 'value' });
      
      // Check that all arguments are passed through
      expect(infoSpy.mock.calls[0].length).toBe(3);
    });
  });

  // Test disabling all logs
  describe('Disabling logs', () => {
    it('should not log anything when level is NONE', () => {
      logger.setLevel(LogLevel.NONE);
      
      logger.error('This should not be logged');
      logger.warn('This should not be logged');
      logger.info('This should not be logged');
      logger.debug('This should not be logged');
      logger.trace('This should not be logged');
      
      expect(errorSpy).not.toHaveBeenCalled();
      expect(warnSpy).not.toHaveBeenCalled();
      expect(infoSpy).not.toHaveBeenCalled();
      
      // Reset to DEBUG for other tests
      logger.setLevel(LogLevel.DEBUG);
    });
  });
});
