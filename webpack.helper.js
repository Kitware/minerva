module.exports = function (config) {
    config.resolve.alias['Hammer'] = 'hammerjs/hammer.js';
    config.resolve.alias['jquery-ui'] = 'jquery-ui-bundle/jquery-ui.js';
    return config;
}