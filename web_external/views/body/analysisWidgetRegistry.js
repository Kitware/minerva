var registry = {
    _regestry: {},
    register: function (key, widget) {
        this._regestry[key] = widget;
    },
    exists: function (key) {
        return !!this.get(key);
    },
    get: function (key) {
        return this._regestry[key];
    }
};

export default registry;
