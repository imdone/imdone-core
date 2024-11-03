const TaskParser = require('./TaskParser')
const { getHashStyleRegex } = require('./CardContentParser')

module.exports = class HashStyleTaskParser extends TaskParser {
  constructor(config) {
    super('HASHTAG', config)
  }

  get pattern() {
    const config = this.config
    return getHashStyleRegex(config.tokenPrefix, config.orderMeta)
  }

  parse(lineContent, line, matchResult) {
    const [rawTask, list, orderGroup, order, text] = matchResult

    return {
      // beforeText,
      text,
      order,
      list,
      line,
      colon: orderGroup && orderGroup.startsWith(':'),
      type: this.type,
    }
  }
}
