minerva.views.LayoutHeaderView = minerva.View.extend({
    events: {
    },

    initialize: function () {
       this.federatedSearch = false;
       minerva.events.on('m:federated_search', function (query) {
            console.log('HeaderView getting m:federated_search');
            console.log(query);
            // If this is the same as what we already have, do nothing.
            if (this.federatedSearch &&
                this.federatedSearch.term === query.term &&
                this.federatedSearch.fromDate === query.fromDate &&
                this.federatedSearch.toDate === query.toDate) {
            } else {
                this.federatedSearch = {
                    term: query.term,
                    fromDate: query.fromDate,
                    toDate: query.toDate,
                    bannerText: query.term + ': '+query.fromDate+' - '+query.toDate
                };
                this.render();
            }
        }, this);

    },

    render: function () {
        this.$el.html(minerva.templates.layoutHeader({
            staticRoot: girder.staticRoot,
            federatedSearch: this.federatedSearch
        }));
    }
});
