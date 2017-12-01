window.__minervaAnalysisRegistry = window.__minervaAnalysisRegistry || {};

var registry = {
    register: function (key, widget) {
        window.__minervaAnalysisRegistry[key] = widget;
    },
    exists: function (key) {
        return !!this.get(key);
    },
    get: function (key) {
        return window.__minervaAnalysisRegistry[key];
    }
};

export default registry;
