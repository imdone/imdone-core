module.exports = () => {
  return {
    git: require('./GitAdapter'),
    log: require('./LogAdapter').log
  }
}