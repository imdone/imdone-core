import { describe, it, expect } from 'vitest';
import { replaceDateLanguage } from '../DateLanguageParser';
import { Chrono } from 'chrono-node';

describe('replaceDateLanguage', () => {
  it('should replace date language with ISO string', () => {
    const text = 'The event is on ${next Monday}';
    const result = replaceDateLanguage(text);
    const chrono = new Chrono
    const expectedDate = chrono.parseDate('next Monday').toISOString();
    expect(result).toBe(`The event is on ${expectedDate}`);
  });

  it('should return the original text if no date is found', () => {
    const text = 'The event is on ${someday}';
    const result = replaceDateLanguage(text);
    expect(result).toBe('The event is on ${someday}');
  });

  it('should handle multiple date replacements', () => {
    const text = 'Start date: ${tomorrow}, End date: ${next Friday}';
    const result = replaceDateLanguage(text);
    const chrono = new Chrono
    const expectedStartDate = chrono.parseDate('tomorrow').toISOString();
    const expectedEndDate = chrono.parseDate('next Friday').toISOString();
    expect(result).toBe(`Start date: ${expectedStartDate}, End date: ${expectedEndDate}`);
  });

  it('should handle text without date language', () => {
    const text = 'No date language here';
    const result = replaceDateLanguage(text);
    expect(result).toBe('No date language here');
  });
});