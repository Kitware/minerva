/**
 * Copy static web content to the bsve web content root.
 */
module.exports = function (grunt) {

    var path = require('path');

    grunt.registerTask('bsve-minerva-setup', 'Set up minerva for the BSVE.', function () {

        var config;

        // assert config variables
        grunt.config.requires('bsve-minerva.girder');
        grunt.config.requires('bsve-minerva.webroot');

        config = grunt.config.get('bsve-minerva');

        // configure a new copy task to syncronize the webroots
        grunt.config.merge({
            sync: {
                'bsve-minerva-webroot': {
                    files: [{
                        cwd: config.girder,
                        src: [
                            'lib/**',
                            'static/**'
                        ],
                        dest: config.webroot
                    }]
                }
            }
        });

        // load the tasks (this is just awful)
        grunt.loadTasks(path.resolve(
            __dirname, '..', '..', // minerva root
            'node_modules',
            'grunt-sync',
            'tasks'
        ));

        // load and queue the sync task
        grunt.task.run('sync:bsve-minerva-webroot');
    });
};
