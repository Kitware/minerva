window.__minerva_analysis_registry = window.__minerva_analysis_registry || {};

var registry = {
    register: function (key, widget) {
        window.__minerva_analysis_registry[key] = widget;
    },
    exists: function (key) {
        return !!this.get(key);
    },
    get: function (key) {
        return window.__minerva_analysis_registry[key];
    }
};

export default registry;
