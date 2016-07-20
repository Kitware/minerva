minerva.views.LayoutHeaderView = minerva.View.extend({
    events: {
    },

    initialize: function () {
       this.federatedSearch = false;
       minerva.events.on('m:federated_search', function (query) {
            this.federatedSearch = {
                term: query.term,
                fromDate: query.fromDate,
                toDate: query.toDate,
                bannerText: query.term + ': '+query.fromDate+' - '+query.toDate
            };
            this.render();
        }, this);
    },

    render: function () {
        this.$el.html(minerva.templates.layoutHeader({
            staticRoot: girder.staticRoot,
            federatedSearch: this.federatedSearch
        }));
    }
});
