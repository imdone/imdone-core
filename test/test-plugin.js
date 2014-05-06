function TestPlugin(config, repo) {
  this.config = config;
  this.repo = repo;
};

module.exports = function(config, repo) {
  return new TestPlugin(config, repo);
};