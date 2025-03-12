import moment from "moment";
let innerNoDST = false;

export function setNoDST(noDST) {
  innerNoDST = noDST;
}

export function getIsoDateWithOffset (date) {
  const momentDate = moment(date);
  if (momentDate.isDST() && innerNoDST) {
    const offset = momentDate.utcOffset();
    momentDate.utcOffset(offset - 60);
  }
  return momentDate.format();
}
