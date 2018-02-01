module.exports = {
    rules: {
        complexity: [2, 12],
        'no-alert': 0,
        'underscore/prefer-invoke': 0,
        'promise/no-native': 0,
        'promise/no-nesting': 'off',
        'promise/always-return': 'off'
    },
    globals: {
        minerva: true,
        geo: true,
        jsonPath: true,
        colorbrewer: true,
        d3: true,
        Papa: true
    }
};
