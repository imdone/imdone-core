const moment = require('moment');
let innerNoDST = false;

function setNoDST(noDST) {
  innerNoDST = noDST;
}

function getIsoDateWithOffset (date) {
  const momentDate = moment(date);
  if (momentDate.isDST() && innerNoDST) {
    const offset = momentDate.utcOffset();
    momentDate.utcOffset(offset - 60);
  }
  return momentDate.format();
}

module.exports = {
  setNoDST,
  getIsoDateWithOffset
}