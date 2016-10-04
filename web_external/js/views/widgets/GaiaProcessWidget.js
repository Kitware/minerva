/**
* This widget is used to add/edit gaia processes.
*/
minerva.views.GaiaProcessWidget = minerva.View.extend({

    events: {
        'submit #m-gaia-process-form': function (e) {
            e.preventDefault();
            this.$('.g-validation-failed-message').text('');

            var processName = this.$('#m-gaiaProcessDatasetName').val();
            var processType = this.$('#m-gaiaProcessDatasetName').val();
            var layer1 = this.$('#m-gaia-layer-type-one').val();
            var layer2 = this.$('#m-gaia-layer-type-two').val();

            // this.$('button.m-runGaiaProcess').addClass('disabled');
            //
            // var data = {
            //     datasetName: datasetName,
            //     bsveSearchParams: searchParams
            // };
            // girder.restRequest({
            //     path: 'minerva_analysis/bsve_search',
            //     type: 'POST',
            //     data: data
            // }).done(_.bind(function () {
            //     girder.events.trigger('m:job.created');
            //     this.$el.modal('hide');
            // }, this));
        }
    },

    splitOnCaps: function (string) {
        if (!string) {
            return;
        }
        return string.split(/(?=[A-Z])/).join(' ');
    },

    renderListOfAvailableProcesses: function () {
        girder.restRequest({
            path: 'gaia_process/classes',
            type: 'GET'
        }).done(_.bind(function (data) {
            if (data && data.processes) {
                this.processes = data.processes.map(_.bind(function (process) {
                    var processName = _.first(_.keys(process));
                    return this.splitOnCaps(processName);
                }, this)).sort();
                this.render();
            }
        }, this));
    },

    initialize: function (settings) {
        this.collection = settings.datasetCollection;
        // this.setCurrentSource(settings.source);
        this.processes = [];
        // Get list of available processes on initialize
        this.renderListOfAvailableProcesses();
        this.layers = [];
    },

    getSourceNameFromModel: function (model) {
        return (((model.get('meta') || {}).minerva || {}).source || {}).layer_source;
    },

    render: function () {
        this.sourceDataset = _.groupBy(
            _.filter(this.collection.models, this.getSourceNameFromModel),
            this.getSourceNameFromModel
        );
        if (this.sourceDataset && this.sourceDataset.GeoJSON) {
            this.layers = this.sourceDataset.GeoJSON.map(function (dataset) {
                return {title: dataset.get('name'), id: dataset.get('_id')}
            })
        }
        console.log(this.layers)
        var modal = this.$el.html(minerva.templates.gaiaProcessWidget({
            processes: this.processes,
            layers: this.layers
        })).girderModal(this).on('ready.girder.modal', _.bind(function () {
        }, this));
        modal.trigger($.Event('ready.girder.modal', {relatedTarget: modal}));

        return this;
    },

    /**
     * Change the current wmsSource whose layers will be displayed, and render.
     *
     * @param  wmsSource  The wmsSource to display.
     */
    setCurrentSource: function (wmsSource) {
        this.source = wmsSource;
        this.sourceName = this.source.get('name');
        this.layers = this.source.metadata().layers;
    }
});
