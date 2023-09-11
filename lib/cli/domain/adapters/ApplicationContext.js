module.exports = () => {
  return {
    session: require('./SessionAdapter'),
    git: require('./GitAdapter'),
    log: require('./LogAdapter'),
  }
}