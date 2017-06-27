module.exports = function (config) {
	// Remove once geojs fix related issue
    config.resolve.alias['Hammer'] = 'hammerjs/hammer.js';
    // Remove once jQuery query builder support webpack
    config.resolve.alias['jQuery.extendext'] = 'jquery-extendext/jQuery.extendext.js';
    config.resolve.alias['doT'] = 'dot/doT.js';
    return config;
}