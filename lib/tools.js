module.exports = {
  userHome: function() {
    return process.env.HOME || process.env.HOMEPATH || process.env.USERPROFILE;
  }
};