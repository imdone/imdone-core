'use strict';

module.exports = function(grunt) {

  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
    nodemon: {
      dev: {
        options: {
          file: 'lib/server.js',
          args: ['dev'],
          ignoredFiles: ['README.md', 'node_modules/**'],
          watchedExtensions: ['js'],
          watchedFolders: ['lib'],
          debug: false,
          delayTime: 1,
          env: {
            NODE_ENV: 'dev'
          },
          cwd: __dirname
        }
      }
    },
    jshint: {
      files: ['Gruntfile.js', 'lib/**/*.js'],
      options: {
        globalstrict: true,
        node: true,
        globals: {
          jQuery: true,
          console: false,
          module: true,
          document: true
        }
      }
    },
    mochaTest: {
      test: {
        options: {
          reporter: 'spec'
        },
        src: ['test/**/*.js'],
        env: {
          NODE_ENV: "test"
        }
      }
    }
  });

  grunt.loadNpmTasks('grunt-contrib-jshint');
  grunt.loadNpmTasks('grunt-mocha-test');


  grunt.registerTask('test-env', function() {process.env.NODE_ENV = "test";});
  grunt.registerTask('test', ['test-env', 'jshint', 'mochaTest' ]);
  grunt.registerTask('default', ['test']);

};
