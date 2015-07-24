minerva.views.AnalysisPanel = minerva.View.extend({

    events: {
        'click .m-attempt-analysis': 'attemptAnalysis'
    },

    attemptAnalysis: function (event) {
        var analysisId = $(event.currentTarget).attr('m-analysis-id');
        var analysis = this.collection.get(analysisId);
        // display the correct UI for this analysis
        // TODO undoubtedly there are better ways...
        // this would be irritating to switch on multiple analyses
        // perhaps a mapping of analysis types to widgets, each
        // might need its own param set for initialization
        var minervaMetadata = analysis.getMinervaMetadata();
        if (minervaMetadata.analysis_type === 'bsve_search') {
            this.bsveSearchWidget = new minerva.views.BsveSearchWidget({
                el: $('#g-dialog-container'),
                parentView: this
            });
            this.bsveSearchWidget.render();
        } else {
            var errMsg = 'Unsupported analysis_type ' + minervaMetadata.analysis_type;
            console.error(errMsg);
            girder.events.trigger('g:alert', {
                icon: 'cancel',
                text: errMsg,
                type: 'error',
                timeout: 4000
            });
        }
    },

    initialize: function (settings) {
        this.collection = settings.collection;
        this.listenTo(this.collection, 'g:changed', function () {
            console.log('AP g:changed');
            this.render();
        }, this).listenTo(this.collection, 'change', function () {
            console.log('AP change');
            this.render();
        }, this).listenTo(this.collection, 'change:meta', function () {
            console.log('AP change:meta');
            this.render();
        }, this).listenTo(this.collection, 'change:displayed', function () {
            console.log('AP change:displayed');
            this.render();
        }, this).listenTo(this.collection, 'add', function () {
            console.log('AP add');
            this.render();
        }, this).listenTo(this.collection, 'remove', function () {
            console.log('AP remove');
            this.render();
        }, this);
        this.render();

    },

    render: function () {
        this.$el.html(minerva.templates.analysisPanel({
            analyses: this.collection.models
        }));

        return this;
    }
});
