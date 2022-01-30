class ApplicationContext {
  constructor () {
    if (!ApplicationContext.instance) {
      this.objects = {}
      ApplicationContext.instance = this
    }
    return ApplicationContext.instance
  }

  register (objClass, obj) {
    this.objects[objClass] = obj
  }

  get ( objClass ) {
    return this.objects[objClass]
  }
}

const instance = new ApplicationContext()
Object.freeze(instance)

module.exports = instance