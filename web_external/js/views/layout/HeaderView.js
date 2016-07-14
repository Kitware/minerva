minerva.views.LayoutHeaderView = minerva.View.extend({
    events: {
    },

    initialize: function () {
       this.federatedSearch = false;
       minerva.events.on('m:federated_search', function (query) {
            // If this is the same as what we already have, do nothing.
            if (this.federatedSearch &&
                this.federatedSearch.term === query.term &&
                this.federatedSearch.startDate === query.startDate &&
                this.federatedSearch.endDate === query.endDate) {
            } else {
                this.federatedSearch = {
                    term: query.term,
                    startDate: query.startDate,
                    endDate: query.endDate,
                    bannerText: query.term + ': '+query.startDate+' - '+query.endDate
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
