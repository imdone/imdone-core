module.exports = () => {
  return {
    log: require('./LogAdapter').log,
    StorageAdapter: require('./StorageAdapter'),
  }
}