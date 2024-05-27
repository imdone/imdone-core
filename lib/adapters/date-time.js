const moment = require('moment');
module.exports = {
  getIsoDateWithOffset: function ({date, config}) {
    const momentDate = moment(date);
    if (momentDate.isDST() && config && config.noDST) {
      const offset = momentDate.utcOffset();
      momentDate.utcOffset(offset - 60);
    }
    return momentDate.format();
  }
}