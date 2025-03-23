import { toNumber } from "./adapters/parsers/task/CardContentParser";
export class FileProjectContext {
  constructor() {}
  getOrder(list, order) {
    return toNumber(order)
  }

  getProject() {
    return
  }

}

