module.exports = function(grunt) {

  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
    jshint: {
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
