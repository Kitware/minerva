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

    var fs = require('fs');
    var jade = require('jade');
    var defaultTasks = [];

    // Since this is an external web app in a plugin,
    // it handles building itself
    //
    // It is not included in the plugins being built by virtue of
    // the web client not living in web_client, but rather web_external
    var configureMinerva = function () {
        var pluginName = 'minerva';
        var pluginDir = 'plugins/' + pluginName;
        // load our dependent plugins
        var pluginJson = pluginDir + '/plugin.json';
        var pluginDescription = grunt.file.readYAML(pluginJson);
        var pluginDependencies = pluginDescription.dependencies;

        var rootStaticDir = 'clients/web/static/built';
        var pluginsStaticDir = 'clients/web/static/built/plugins';
        var rootStaticLibDir = 'clients/web/static/lib';
        var staticDir = rootStaticDir + '/' + pluginDir;
        var sourceDir = "web_external";

        if (!fs.existsSync(staticDir)) {
            fs.mkdirSync(staticDir);
        }

        var jadeDir = pluginDir + '/' + sourceDir + '/templates';
        if (fs.existsSync(jadeDir)) {
            var files = {};
            files[staticDir + '/minerva_templates.js'] = [jadeDir + '/**/*.jade'];
            grunt.config.set('jade.' + pluginName, {
                files: files
            });
            grunt.config.set('jade.' + pluginName + '.options', {
                namespace: 'minerva.templates'
            });
            grunt.config.set('watch.jade_' + pluginName + '_app', {
                files: [jadeDir + '/**/*.jade'],
                tasks: ['jade:' + pluginName, 'uglify:' + pluginName]
            });
            defaultTasks.push('jade:' + pluginName);
        }

        var cssDir = pluginDir + '/' + sourceDir + '/stylesheets';
        if (fs.existsSync(cssDir)) {
            var files = {};
            files[staticDir + '/minerva.min.css'] = [cssDir + '/**/*.styl'];
            grunt.config.set('stylus.' + pluginName, {
                files: files
            });
            grunt.config.set('watch.stylus_' + pluginName + '_app', {
                files: [cssDir + '/**/*.styl'],
                tasks: ['stylus:' + pluginName]
            });
            defaultTasks.push('stylus:' + pluginName);
        }

        var jsDir = pluginDir + '/' + sourceDir + '/js';
        // depends on npm install being run locally in this plugin dir
        var geojsDir = pluginDir + '/node_modules/geojs';
        var jsonpathjsDir = pluginDir + '/node_modules/JSONPath/lib';
        var geojsDistDir = geojsDir + '/dist/built';
        var extDir = jsDir + '/ext';

        if(!fs.existsSync(geojsDistDir)) {
            geojsDistDir = geojsDir;
        }

        if (fs.existsSync(jsDir)) {
            var files = {};
            // name this minerva.min.js instead of plugin.min.js
            // so that girder app won't load minerva, which
            // should only be loaded as a separate web app running as minerva
            files[staticDir + '/minerva.min.js'] = [
                jsDir + '/init.js',
                staticDir + '/minerva_templates.js',
                jsDir + '/minerva-version.js',
                jsDir + '/view.js',
                jsDir + '/contourJsonReader.js',
                jsDir + '/app.js',
                jsDir + '/utilities.js',
                jsDir + '/MinervaModel.js',
                jsDir + '/MinervaCollection.js',
                jsDir + '/models/DatasetModel.js',
                jsDir + '/models/SourceModel.js',
                jsDir + '/models/TerraDatasetModel.js',
                jsDir + '/models/**/*.js',
                jsDir + '/collections/**/*.js',
                jsDir + '/views/**/*.js'
            ];
            // since Girder already provides jquery and d3
            // don't take the prepackaged geo.ext.min.js from geojs, but rather
            // create one based on the other required dependencies
            files[staticDir + '/geo.ext.min.js'] = [
                geojsDir + '/bower_components/gl-matrix/dist/gl-matrix.js',
                geojsDir + '/bower_components/proj4/dist/proj4-src.js',
                geojsDir + '/node_modules/pnltri/pnltri.js'
            ];
            files[staticDir + '/main.min.js'] = [
                jsDir + '/main.js'
            ];
            files[staticDir + '/jsonpath.min.js'] = [
                jsonpathjsDir + '/jsonpath.js'
            ];
            files[staticDir + '/c3.min.js'] = [
                pluginDir + '/node_modules/c3/c3.js'
            ];
            grunt.config.set('uglify.' + pluginName, {
                files: files
            });
            grunt.config.set('watch.js_' + pluginName + '_app', {
                files: [jsDir + '/**/*.js'],
                tasks: ['uglify:' + pluginName]
            });
            defaultTasks.push('uglify:' + pluginName);
        }

        var extraDir = pluginDir + '/' + sourceDir + '/extra';
        if (fs.existsSync(extraDir)) {
            var files = [
                { expand: true, cwd: extraDir, src: ['**'], dest: staticDir },
                { expand: true, cwd: geojsDistDir, src: ['geo.min.js'], dest: staticDir }
            ];
            grunt.config.set('copy.' + pluginName, { files: files});
            grunt.config.set('watch.copy_' + pluginName, {
                files: [extraDir + '/**/*', geojsDistDir + '/geo.min.js'],
                tasks: ['copy:' + pluginName]
            });
            defaultTasks.push('copy:' + pluginName);
        }

        grunt.registerTask('test-env-html:' + pluginName, 'Build the phantom test html page for '+pluginName, function () {
            var i, plugin, pluginJs, pluginCss;
            var buffer = fs.readFileSync('clients/web/test/testEnv.jadehtml');
            var dependencies = [
                '/clients/web/test/testUtils.js',
                '/clients/web/static/built/libs.min.js',
                '/' + staticDir + '/geo.ext.min.js',
                // '/' + rootStaticDir + '/libs.min.js', // libs included in jade template
                '/' + staticDir + '/jquery.gridster.js',
                '/' + staticDir + '/geo.min.js',
                '/' + staticDir + '/c3.min.js',
                '/' + rootStaticDir + '/app.min.js'
            ];
            // if any plugin dependencies have js, add them
            for(i = 0; i < pluginDependencies.length; i = i + 1) {
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

            var globs = grunt.config('uglify.' + pluginName + '.files')[staticDir + '/minerva.min.js'];
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
                '/' + staticDir + '/c3.min.css',
                '/' + rootStaticDir + '/app.min.css',
                'http://cdn.datatables.net/1.10.7/css/jquery.dataTables.css',
                'http://cdn.jsdelivr.net/bootstrap.daterangepicker/1/daterangepicker-bs3.css'
            ];
            // if any plugin dependencies have css, add them
            for(i = 0; i < pluginDependencies.length; i = i + 1) {
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
                staticRoot: grunt.config('serverConfig.staticRoot'),
                apiRoot: grunt.config('serverConfig.apiRoot')
            }));
        });
        defaultTasks.push('test-env-html:' + pluginName);
    };

    configureMinerva();
    grunt.registerTask('minerva-web', defaultTasks);
};
