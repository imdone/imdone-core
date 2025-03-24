import { toNumber } from "./adapters/parsers/task/CardContentParser.js";
export class FileProjectContext {
  constructor() {}
  getOrder(list, order) {
    return toNumber(order)
  }

  getProject() {
    return
  }

}

