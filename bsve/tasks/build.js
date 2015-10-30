/**
 * Build the main minerva-bsve application page
 */
module.exports = function (grunt) {

    var path = require('path');

    grunt.registerTask('bsve-minerva-build', function () {

        var root, build = path.resolve(__dirname, '..', 'build.py'), html, index;

        // assert config variables
        grunt.config.requires('bsve-minerva.webroot');

        root = grunt.config.get('bsve-minerva.webroot');
        index = path.resolve(root, 'index.html');

        /**
         * Saves the output of the shell task that renders the bsve mako template
         */
        function get_html(err, stdout, stderr, done) {
            html = stdout;
            done();
        }

        /**
         * Write the html file to disk.
         */
        function write_html(fs, fd, done) {
            // assert that the html was rendered
            grunt.task.requires('shell:bsve-minerva-build');
            fs.writeSync(fd, html);
            done();
        }

        // configure a new shell task to run the build
        grunt.config.merge({
            shell: {
                'bsve-minerva-build': {
                    command: 'env python ' + build,
                    options: {
                        stdout: false,
                        callback: get_html
                    }
                }
            },
            'file-creator': {
                'bsve-minerva-build': {
                    files: [{
                        file: index,
                        method: write_html
                    }]
                }
            }
        });

        // load the tasks (this is just awful)
        grunt.loadTasks(path.resolve(
            __dirname, '..', '..', // minerva root
            'node_modules',
            'grunt-file-creator',
            'tasks'
        ));
        grunt.loadTasks(path.resolve(
            __dirname, '..', '..', // minerva root
            'node_modules',
            'grunt-shell',
            'tasks'
        ));

        // load and queue the tasks
        grunt.task.run('shell:bsve-minerva-build');
        grunt.task.run('file-creator:bsve-minerva-build');
    });
};
