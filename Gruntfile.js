/**
 * Copyright 2015 Kitware Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/* jshint node: true */

module.exports = function (grunt) {

    var path = require('path');

    // This gruntfile is only designed to be used with girder's build system.
    // Fail if grunt is executed here.
    if (path.resolve(__dirname) === path.resolve(process.cwd())) {
        grunt.fail.fatal('To build Minerva, run grunt from Girder\'s root directory');
    }

    grunt.config.requires('pluginDir');

    var fs = require('fs');
    var _;

    try {
        // Extreme hackery used to avoid exception on first time `grunt init`
        // before local npm dependencies are installed.  If this isn't done,
        // then `grunt init` needs to be run twice.
        _ = require('underscore');
    } catch (e) {
        grunt.log.writeln(
            'Mocking underscore dependency for first time install.'.yellow
        );
        grunt.log.writeln(
            'grunt watch'.yellow.underline + ' will not be initialized this run.'.yellow
        );
        _ = {
            pluck: function () {
                return [];
            }
        };
    }

    grunt.config.merge({
        plugin: {
            minerva: {
                root: '<%= pluginDir %>/minerva',
                external: '<%= plugin.minerva.root %>/web_external',
                static: '<%= staticDir %>/built/plugins/minerva',
                source: '<%= plugin.minerva.external %>/js',
                geojs: '<%= plugin.minerva.root %>/node_modules/geojs',
                extra: '<%= plugin.minerva.external %>/extra',
                fontello: '<%= plugin.minerva.external %>/fontello'
            }
        },
        jade: {
            minerva: {
                files: [{
                    src: ['<%= plugin.minerva.external %>/templates/**/*.jade'],
                    dest: '<%= plugin.minerva.static %>/minerva_templates.js'
                }],
                options: {
                    namespace: 'minerva.templates'
                }
            }
        },
        stylus: {
            minerva: {
                files: [{
                    src: ['<%= plugin.minerva.external %>/stylesheets/**/*.styl'],
                    dest: '<%= plugin.minerva.static %>/minerva.min.css'
                }]
            }
        },
        uglify: {
            minerva: {
                files: [
                    {
                        src: [
                            '<%= plugin.minerva.source %>/init.js',
                            '<%= plugin.minerva.static %>/minerva_templates.js',
                            '<%= plugin.minerva.source %>/minerva-version.js',
                            '<%= plugin.minerva.source %>/view.js',
                            '<%= plugin.minerva.source %>/contourJsonReader.js',
                            '<%= plugin.minerva.source %>/app.js',
                            '<%= plugin.minerva.source %>/utilities.js',
                            '<%= plugin.minerva.source %>/MinervaModel.js',
                            '<%= plugin.minerva.source %>/MinervaCollection.js',
                            '<%= plugin.minerva.source %>/models/DatasetModel.js',
                            '<%= plugin.minerva.source %>/models/SourceModel.js',
                            '<%= plugin.minerva.source %>/models/**/*.js',
                            '<%= plugin.minerva.source %>/collections/**/*.js',
                            '<%= plugin.minerva.source %>/views/**/*.js'
                        ],
                        dest: '<%= plugin.minerva.static %>/minerva.min.js'
                    },
                    {
                        src: [
                            '<%= plugin.minerva.geojs %>/bower_components/gl-matrix/dist/gl-matrix.js',
                            '<%= plugin.minerva.geojs %>/bower_components/proj4/dist/proj4-src.js',
                            '<%= plugin.minerva.geojs %>/node_modules/pnltri/pnltri.js'
                        ],
                        dest: '<%= plugin.minerva.static %>/geo.ext.min.js'
                    },
                    {
                        src: ['<%= plugin.minerva.source %>/main.js'],
                        dest: '<%= plugin.minerva.static %>/main.min.js'
                    },
                    {
                        src: ['<%= plugin.minerva.root %>/node_modules/JSONPath/lib/jsonpath.js'],
                        dest: '<%= plugin.minerva.static %>/jsonpath.min.js'
                    }
                ]
            }
        },
        shell: {
            'minerva-geojs-install': {
                command: 'npm install --only=prod',
                options: {
                    execOptions: {
                        cwd: '<%= plugin.minerva.geojs %>'
                    }
                }
            },
            'minerva-geojs-build': {
                command: 'npm run build',
                options: {
                    execOptions: {
                        cwd: '<%= plugin.minerva.geojs %>'
                    }
                }
            }
        },
        copy: {
            'minerva-images': {
                files: [
                    {
                        expand: true,
                        cwd: '<%= plugin.minerva.external %>',
                        src: ['images/**'],
                        dest: '<%= plugin.minerva.static %>'
                    }
                ]
            },
            'minerva-extras': {
                files: [
                    {
                        expand: true,
                        cwd: '<%= plugin.minerva.extra %>',
                        src: ['**'],
                        dest: '<%= plugin.minerva.static %>'
                    },
                    {
                        expand: true,
                        cwd: '<%= plugin.minerva.geojs %>/dist/built',
                        src: ['geo.min.js'],
                        dest: '<%= plugin.minerva.static %>'
                    }
                ]
            },
            'minerva-fontello': {
                files: [
                    {
                        expand: true,
                        cwd: '<%= plugin.minerva.fontello %>',
                        src: ['font/*', 'css/*'],
                        dest: '<%= staticDir %>/lib/fontello/minerva'
                    }
                ]
            },
            'jquery-ui': {
                files: [
                    {
                        expand: true,
                        cwd: '<%= plugin.minerva.geojs %>/bower_components/jquery-ui',
                        src: ['jquery-ui.min.js'],
                        dest: '<%= plugin.minerva.static %>'
                    },
                    {
                        expand: true,
                        cwd: '<%= plugin.minerva.geojs %>/bower_components/jquery-ui/themes/smoothness',
                        src: ['jquery-ui.min.css'],
                        dest: '<%= plugin.minerva.static %>'
                    },
                    {
                        expand: true,
                        cwd: '<%= plugin.minerva.geojs %>/bower_components/jquery-ui/themes/smoothness',
                        src: ['images/*'],
                        dest: '<%= plugin.minerva.static %>'
                    }
                ]
            }
        },
        init: {
            'shell:minerva-geojs-install': {
                dependencies: ['shell:plugin-install']
            },
            'shell:minerva-geojs-build': {
                dependencies: ['shell:minerva-geojs-install']
            },
            'copy:minerva-extras': {
                dependencies: ['shell:minerva-geojs-install', 'shell:minerva-geojs-build']
            },
            'copy:minerva-fontello': {
                dependencies: ['shell:minerva-geojs-install', 'shell:minerva-geojs-build']
            },
            'copy:jquery-ui': {
                dependencies: ['shell:minerva-geojs-install', 'shell:minerva-geojs-build']
            },
            'copy:minerva-images': {
                dependencies: ['shell:minerva-geojs-install', 'shell:minerva-geojs-build']
            }
        },
        default: {
            'uglify:minerva': {
                dependencies: ['jade:minerva']
            },
            'jade:minerva': {},
            'stylus:minerva': {},
            'test-env-html:minerva': {
                dependencies: ['uglify:minerva', 'stylus:minerva']
            }
        }
    });

    grunt.config.merge({
        watch: {
            'plugin-minerva-jade-external': {
                files: _.pluck(grunt.config.get('jade.minerva.files'), 'src'),
                tasks: ['jade:minerva']
            },
            'plugin-minerva-stylus-external': {
                files: _.pluck(grunt.config.get('stylus.minerva.files'), 'src'),
                tasks: ['stylus:minerva']
            },
            'plugin-minerva-uglify-external': {
                files: _.pluck(grunt.config.get('uglify.minerva.files'), 'src'),
                tasks: ['uglify:minerva']
            },
            'plugin-minerva-build-geojs': {
                files: ['<%= plugin.minerva.geojs %>/**/*.js'],
                tasks: ['shell:minerva-geojs']
            },
            'plugin-minerva-copy-extra': {
                files: [
                    '<%= plugin.minerva.extra %>/**',
                    '<%= plugin.minerva.geojs %>/dist/built/geo.min.js'
                ],
                tasks: ['copy:minerva-extras']
            }
        }
    });

    // make the destination path if it doesn't exist
    var staticDir = grunt.config.get('plugin.minerva.static');
    if (!fs.existsSync(staticDir)) {
        fs.mkdirSync(staticDir);
    }
    grunt.registerTask('test-env-html:minerva', 'Build the phantom test html page for minerava', function () {
        var jade = require('jade');
        var pluginConfig = grunt.file.readYAML(
            grunt.config.get('plugin.minerva.root') + '/plugin.json'
        );
        var pluginDependencies = pluginConfig.dependencies;
        var staticDir = grunt.config.get('plugin.minerva.static');
        var rootStaticDir = grunt.config.get('staticDir') + '/built';
        var pluginsStaticDir = staticDir + '/..';
        var rootStaticLibDir = grunt.config.get('staticDir') + '/lib';
        var i, plugin, pluginJs, pluginCss;
        var buffer = fs.readFileSync('clients/web/test/testEnv.jadehtml');
        var dependencies = [
            '/clients/web/test/testUtils.js',
            '/clients/web/static/built/libs.min.js',
            '/' + staticDir + '/geo.ext.min.js',
            // '/' + rootStaticDir + '/libs.min.js', // libs included in jade template
            '/' + staticDir + '/jquery.gridster.js',
            '/' + staticDir + '/jquery-ui.min.js',
            '/' + staticDir + '/geo.min.js',
            '/' + rootStaticDir + '/app.min.js'
        ];
        // if any plugin dependencies have js, add them
        for (i = 0; i < pluginDependencies.length; i = i + 1) {
            plugin = pluginDependencies[i];
            pluginJs = pluginsStaticDir + '/' + plugin + '/plugin.min.js';
            if (fs.existsSync(pluginJs)) {
                dependencies.push('/' + pluginJs);
            }
        }
        dependencies.concat([
            'http://cdn.datatables.net/1.10.7/js/jquery.dataTables.min.js',
            'http://cdn.jsdelivr.net/momentjs/2.9.0/moment.min.js',
            'http://cdn.jsdelivr.net/bootstrap.daterangepicker/1/daterangepicker.js',
            '/' + staticDir + '/papaparse.min.js',
            '/' + staticDir + '/jsonpath.min.js'
        ]);

        var globs = grunt.config.get('uglify.minerva.files')[0].src;
        var jsFiles = [];
        globs.forEach(function (glob) {
            var files = grunt.file.expand(glob);
            files.forEach(function (file) {
                jsFiles.push('/' + file);
            });
        });

        var fn = jade.compile(buffer, {
            client: false,
            pretty: true
        });

        var cssFiles =  [
            // ?? href="//fonts.googleapis.com/css?family=Droid+Sans:400,700">
            '/' + rootStaticLibDir + '/bootstrap/css/bootstrap.min.css',
            'http://cdn.jsdelivr.net/bootstrap/3.3.2/css/bootstrap.css',
            '/' + rootStaticLibDir + '/fontello/css/fontello.css',
            '/' + rootStaticLibDir + '/fontello/css/animation.css',
            '/' + staticDir + '/jquery.gridster.min.css',
            '/' + staticDir + '/jquery-ui.min.css',
            '/' + rootStaticDir + '/app.min.css',
            'http://cdn.datatables.net/1.10.7/css/jquery.dataTables.css',
            'http://cdn.jsdelivr.net/bootstrap.daterangepicker/1/daterangepicker-bs3.css'
        ];
        // if any plugin dependencies have css, add them
        for (i = 0; i < pluginDependencies.length; i = i + 1) {
            plugin = pluginDependencies[i];
            pluginCss = pluginsStaticDir + '/' + plugin + '/plugin.min.css';
            if (fs.existsSync(pluginCss)) {
                cssFiles.push('/' + pluginCss);
            }
        }
        cssFiles.push('/' + staticDir + '/minerva.min.css');

        fs.writeFileSync(rootStaticDir + '/testEnvMinerva.html', fn({
            cssFiles: cssFiles,
            jsFilesUncovered: dependencies,
            jsFilesCovered: jsFiles,
            staticRoot: '/static',
            apiRoot: '/api/v1'
        }));
    });
};
