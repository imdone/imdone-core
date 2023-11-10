module.exports = () => {
  return {
    log: require('./LogAdapter').log,
    ...require('./StorageAdapter'),
  }
}