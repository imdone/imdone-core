'use strict';

var _          = require('lodash'),
    async      = require('async'),
    Project    = require('./project'),
    tools      = require('./tools'),
    Repository = require('./repository');

var MISSING_PROJECT = 'project is a required option and must be a Repository or Project object',
    MISSING_QUERY   = 'query is a required option';
/**
 * opts : {
 * project: a Project or Repository object
 * query: a regular expression query
 * offset: The offset
 * limit: max results to return
 * }
 * @method Search
 * @param {} opts
 * @return
 */
var Search = function(opts) {
  opts = _.extend({
    offset:0,
    limit: 200
  }, opts || {});

  if ( !opts.project ||
       ( !(opts.project instanceof Project) &&
         !(opts.project instanceof Repository) ) ) throw new Error(MISSING_PROJECT);

  if (!opts.query) throw new Error(MISSING_QUERY);

  opts.re = new RegExp('(' + opts.query + ')', 'i');
  this.opts = opts;
  this.result = [];
  this.hits = 0;
  this.total = 0;
  this.filesSearched = 0;
  this.filesNotSearched = 0;
};

/**
 * Description
 * @method find
 * @return
 */

Search.prototype.find = function(cb) {
  cb = tools.cb(cb);
  var self = this, project = this.opts.project;
  project.getFilesInPath(function(err, files) {

    async.series(_.map(files, function(file) {
      return function(cb) {
        if (self.total >= self.opts.limit) {
          self.filesNotSearched++;
          return cb();
        }

        self.filesSearched++;

        var lines = [];
        project.readFileContent(file, function(err, file) {
          if (err) return cb(err);

          var str = file.getContent();
          file = file.getSource();
          str.split('\n').forEach(function(line, i){
            var pos = line.search(self.opts.re);
            if (pos > -1) {
              if (line.length > 120) {
                if (pos > 120) {
                  var truncated = line.substring(pos-60, pos+60);
                  if (truncated.length < 120) {
                    truncated = line.substring(line.length-120);
                    line = "... " + truncated;
                  } else {
                    line = "... " + truncated + " ...";
                  }
                } else {
                  line = line.substring(0,120) + "...";
                }
              }
              lines.push([i+1, line]);
            }
          });

          if (lines.length > 0) {
            var fileResult = {file:file, lines:[]};
            lines.forEach(function(line){
              self.hits++;
              if ((self.hits > self.opts.offset) && (self.total < self.opts.limit)) {
                fileResult.lines.push({line:line[0], text:line[1]});
                self.total++;
              }
            });
            if (fileResult.lines.length > 0) self.result.push(fileResult);
          }

          cb();

        });
      };
    }), function(err) {
      if (err) return cb(err);
      cb(null, self.result);
    });
  });
};

/**
 * Description
 * @method toJSON
 * @return ObjectExpression
 */
Search.prototype.toJSON = function() {
  var self = this;
  return {
    opts: {
      project: self.opts.project.name,
      query: self.opts.query,
      offset: self.opts.offset,
      limit: self.opts.limit
    },
    hits: self.hits,
    total: self.total,
    filesSearched: self.filesSearched,
    filesNotSearched: self.filesNotSearched,
    result: self.result
  };
};

module.exports = Search;
