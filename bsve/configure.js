/**
 * Imports
 */
var path = require('path');

/**
 * Common configuration variables.
 */
var name = 'geoviz';
var webroot = path.resolve(
    __dirname, name, 'WebContent'
);

// assumes girder static root path
var girder = path.resolve(
    process.cwd(),
    'clients',
    'web'
);

/**
 * Extend an existing grunt config to support building the BSVE application.
 */
module.exports = function (grunt) {

    grunt.config.set('bsve-minerva', {
        webroot: webroot,
        girder: girder
    });

    grunt.loadTasks(path.join(__dirname, 'tasks'));
};
