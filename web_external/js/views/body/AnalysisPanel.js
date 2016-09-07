(function () {
    var analysisTypeToWidgetName = function (type) {
        var name = type.replace(/(\_\w)|(^\w)/g, function (m) {
            var index = m[0] === '_' ? 1 : 0;

            return m[index].toUpperCase();
        });

        return name + 'Widget';
    };

    minerva.views.AnalysisPanel = minerva.views.Panel.extend({

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
            var minervaMetadata = analysis.metadata();

            var analysisWidgetName = analysisTypeToWidgetName(minervaMetadata.analysis_type);
            if (!(analysisWidgetName in minerva.views)) {
                var message = _.template('No widget defined for analysis of type ' +
                    '"<%= type %>". Expected widget name "<%= name %>".');

                message = message({
                    type: minervaMetadata.analysis_type,
                    name: analysisWidgetName
                });

                girder.events.trigger('g:alert', {
                    icon: 'cancel',
                    text: message,
                    type: 'error',
                    timeout: 4000
                });

                throw message;
            }

            var analysisWidget = new minerva.views[analysisWidgetName]({
                el: $('#g-dialog-container'),
                parentView: this,
                datasetCollection: this.datasetCollection,
                analysis: analysis
            });
            analysisWidget.render();
        },

        initialize: function (settings) {
            this.collection = settings.session.analysisCollection;
            this.datasetCollection = settings.session.datasetsCollection;
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

            minerva.views.Panel.prototype.initialize.apply(this);
        },

        render: function () {
            this.$el.html(minerva.templates.analysisPanel({
                analyses: this.collection.models
            }));

            return this;
        }
    });
})();
