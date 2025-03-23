const chrono = require('chrono-node')

module.exports = {
  replaceDateLanguage(text, asDate) {
    return text.replace(/\(?\${(.*?)}\)?/g, (match, p1) => {
      const date = chrono.parseDate(p1)
      return date ? date.toISOString() : p1
    })
  }
}