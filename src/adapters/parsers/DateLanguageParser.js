import { Chrono } from 'chrono-node'

export function replaceDateLanguage(text, asDate = false) {
  const chrono = new Chrono();
  return text.replace(/\(?\${(.*?)}\)?/g, (match, p1) => {
    const date = chrono.parseDate(p1);
    if (date) {
      return asDate ? date : date.toISOString();
    }
    return match;
  });
}
