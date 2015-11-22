/*global minerva:true*/

var minerva = minerva || {};

_.extend(minerva, {
    models: {},
    collections: {},
    views: {},
    router: new Backbone.Router(),
    events: _.clone(Backbone.Events)
});

minerva.clearRegistry = function (key) {
    if (key) {
        minerva.registry[key] = {};
    } else {
        minerva.registry = {
            sourceModels: {}
        };
    }
};
minerva.clearRegistry();

girder.router.enabled(false);
