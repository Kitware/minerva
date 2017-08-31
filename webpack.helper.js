module.exports = function (config) {
    config.resolve = config.resolve || {};
    config.resolve.alias = config.resolve.alias || {};
    config.resolve.alias['Hammer'] = 'hammerjs/hammer.js';
    // Remove once jQuery query builder support webpack
    config.resolve.alias['jQuery.extendext'] = 'jquery-extendext/jQuery.extendext.js';
    config.resolve.alias['doT'] = 'dot/doT.js';
    return config;
}
