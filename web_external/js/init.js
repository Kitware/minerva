/*global minerva:true*/

var minerva = minerva || {};

_.extend(minerva, {
    models: {},
    collections: {},
    views: {},
    router: new Backbone.Router(),
    events: _.clone(Backbone.Events)
});

girder.router.enabled(false);
