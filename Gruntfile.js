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
                'bootstrapSelect': '<%= plugin.minerva.root %>/node_modules/bootstrap-select/dist',
                extra: '<%= plugin.minerva.external %>/extra',
                jqueryui: '<%= plugin.minerva.root %>/node_modules/jquery-ui-bundle',
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
                    src: [
                        '<%= plugin.minerva.external %>/stylesheets/**/*.styl',
                        '<%= plugin.minerva.root %>/node_modules/colorbrewer/colorbrewer.css',
                        '<%= plugin.minerva.bootstrapSelect %>/css/bootstrap-select.css',
                        '<%= plugin.minerva.extra %>/bootstrap-slider.css'
                    ],
                    dest: '<%= plugin.minerva.static %>/plugin.min.css'
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
                            '<%= plugin.minerva.source %>/geojsonUtil.js',
                            '<%= plugin.minerva.source %>/app.js',
                            '<%= plugin.minerva.source %>/utilities.js',
                            '<%= plugin.minerva.source %>/MinervaModel.js',
                            '<%= plugin.minerva.source %>/MinervaCollection.js',
                            '<%= plugin.minerva.source %>/models/DatasetModel.js',
                            '<%= plugin.minerva.source %>/models/SourceModel.js',
                            '<%= plugin.minerva.source %>/models/**/*.js',
                            '<%= plugin.minerva.source %>/collections/**/*.js',
                            '<%= plugin.minerva.source %>/views/body/Panel.js',
                            '<%= plugin.minerva.source %>/views/**/*.js'
                        ],
                        dest: '<%= plugin.minerva.static %>/minerva.app.min.js'
                    },
                    {
                        src: ['<%= plugin.minerva.source %>/main.js'],
                        dest: '<%= plugin.minerva.static %>/minerva.main.min.js'
                    }
                ]
            },
            'minerva-ext': {
                files: [
                    {
                        src: ['<%= plugin.minerva.root %>/node_modules/JSONPath/lib/jsonpath.js'],
                        dest: '<%= plugin.minerva.static %>/jsonpath.min.js'
                    },
                    {
                        src: ['<%= plugin.minerva.root %>/node_modules/colorbrewer/colorbrewer.js'],
                        dest: '<%= plugin.minerva.static %>/colorbrewer.min.js'
                    },
                    {
                        src: ['<%= plugin.minerva.bootstrapSelect %>/js/bootstrap-select.js'],
                        dest: '<%= plugin.minerva.static %>/bootstrap-select.min.js'
                    },
                    {
                        src: ['<%= plugin.minerva.root %>/node_modules/bootstrap-slider/dist/bootstrap-slider.min.js'],
                        dest: '<%= plugin.minerva.static %>/bootstrap-slider.min.js'
                    }
                ]
            }
        },
        copy: {
            'assets': {
                files: [
                    {
                        expand: true,
                        cwd: '<%= plugin.minerva.external %>/assets/',
                        src: ['*.png'],
                        dest: '<%= plugin.minerva.static %>/assets/'
                    }
                ]
            },
            'papaparse': {
                files: [
                    {
                        expand: true,
                        cwd: '<%= plugin.minerva.extra %>',
                        src: ['papaparse.min.js'],
                        dest: '<%= plugin.minerva.static %>'
                    }
                ]
            },
            'geojs': {
                files: [

                    {
                        expand: true,
                        cwd: '<%= plugin.minerva.geojs %>',
                        src: ['geo.js'],
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
                        cwd: '<%= plugin.minerva.jqueryui %>',
                        src: ['jquery-ui.min.js', 'jquery-ui.min.css', 'images/*'],
                        dest: '<%= plugin.minerva.static %>'
                    }
                ]
            },
            'dataTables': {
                files: [
                    {
                        expand: true,
                        cwd: '<%= plugin.minerva.extra %>',
                        src: ['datatables.min.js'],
                        dest: '<%= plugin.minerva.static %>'
                    },
                    {
                        expand: true,
                        cwd: '<%= plugin.minerva.extra %>',
                        src: ['datatables.min.css'],
                        dest: '<%= plugin.minerva.static %>'
                    },
                    {
                        expand: true,
                        cwd: '<%= plugin.minerva.extra %>',
                        src: ['DataTables-1.10.11/images/*'],
                        dest: '<%= plugin.minerva.static %>'
                    }
                ]
            },
            'sinon': {
                files: [
                    {
                        expand: true,
                        cwd: '<%= plugin.minerva.root %>/node_modules/sinon/pkg',
                        src: ['sinon-1.17.5.js'],
                        dest: '<%= plugin.minerva.static %>'
                    }
                ]
            }
        },
        concat: {
            'minerva-ext': {
                files: {
                    '<%= plugin.minerva.static %>/minerva.ext.min.js':
                    [
                        '<%= plugin.minerva.static %>/geo.js',
                        '<%= plugin.minerva.static %>/jsonpath.min.js',
                        '<%= plugin.minerva.static %>/papaparse.min.js',
                        '<%= plugin.minerva.static %>/colorbrewer.min.js',
                        '<%= plugin.minerva.static %>/jquery-ui.min.js',
                        '<%= plugin.minerva.static %>/datatables.min.js',
                        '<%= plugin.minerva.static %>/bootstrap-select.min.js',
                        '<%= plugin.minerva.static %>/bootstrap-slider.min.js'
                    ]
                }
            }
        },
        init: {
            'copy:assets': {
                dependencies: ['shell:plugin-install']
            },
            'copy:papaparse': {
                dependencies: ['shell:plugin-minerva']
            },
            'copy:geojs': {
                dependencies: ['shell:plugin-minerva']
            },
            'copy:minerva-fontello': {
                dependencies: ['shell:plugin-minerva']
            },
            'copy:jquery-ui': {
                dependencies: ['shell:plugin-minerva']
            },
            'copy:dataTables': {
                dependencies: ['shell:plugin-minerva']
            },
            'uglify:minerva-ext': {
                dependencies: ['shell:plugin-minerva']
            },
            'concat:minerva-ext': {
                dependencies: ['copy:papaparse', 'copy:jquery-ui', 'copy:dataTables', 'uglify:minerva-ext']
            },
            'copy:sinon': {
                dependencies: ['shell:plugin-minerva']
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
            'plugin-minerva-copy-geojs': {
                files: [
                    '<%= plugin.minerva.geojs %>/geo.js'
                ],
                tasks: ['copy:geojs']
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
            '/' + staticDir + '/sinon-1.17.5.js',
            '/clients/web/static/built/libs.min.js',
            '/test/minerva/minervaTestUtils.js',
            '/clients/web/test/testUtils.js',
            '/' + staticDir + '/minerva.ext.min.js',
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

        var cssFiles = [
            // ?? href="//fonts.googleapis.com/css?family=Droid+Sans:400,700">
            '/' + rootStaticLibDir + '/bootstrap/css/bootstrap.min.css',
            '/' + rootStaticLibDir + '/fontello/css/fontello.css',
            '/' + rootStaticLibDir + '/fontello/css/animation.css',
            '/' + staticDir + '/jquery-ui.min.css',
            '/' + rootStaticDir + '/app.min.css'
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
