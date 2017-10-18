import events from 'girder/events';

import Panel from '../body/Panel';
import analysisWidgetRegistry from './analysisWidgetRegistry';
import template from '../../templates/body/analysisPanel.pug';
import '../../stylesheets/body/analysisPanel.styl';

const AnalysisPanel = Panel.extend({

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

        var analysisType = minervaMetadata.analysis_type;

        if (!analysisWidgetRegistry.exists(analysisType)) {
            var message = `No widget registered for analysis of type ${analysisType}`;

            events.trigger('g:alert', {
                icon: 'cancel',
                text: message,
                type: 'error',
                timeout: 4000
            });

            throw message;
        }

        var analysisWidget = new (analysisWidgetRegistry.get(analysisType))({
            el: $('#g-dialog-container'),
            parentView: this,
            datasetCollection: this.datasetCollection,
            analysis: analysis
        });
        analysisWidget.render();
    },

    initialize: function (settings) {
        this.collection = settings.session.analysisCollection;
        this.datasetCollection = settings.session.datasetCollection;
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

        Panel.prototype.initialize.apply(this);
    },

    render: function () {
        this.$el.html(template({
            analyses: this.collection.models
        }));

        return this;
    }
});
export default AnalysisPanel;
