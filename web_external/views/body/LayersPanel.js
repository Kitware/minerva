import Panel from '../body/Panel';
import template from '../../templates/body/layersPanel.pug';
import '../../stylesheets/body/layersPanel.styl';
import '../../stylesheets/widgets/animationControls.styl';

const LayersPanel = Panel.extend({

    events: {
        'click .m-download-geojson': 'downloadGeojsonEvent',
        'click .m-remove-dataset-from-layer': 'removeDatasetEvent',
        'click .m-toggle-dataset': 'toggleDatasetEvent',
        'change .m-opacity-range': 'changeLayerOpacity',
        'click .m-order-layer': 'reorderLayer',
        'click .m-anim-play': 'seriesFramePlay',
        'click .m-anim-step': 'seriesFrameStep',
        'click .m-anim-step-back': 'seriesFrameStepBack',
        'click .m-anim-stop': 'seriesFrameStop',
        'change .m-cycle-duration': 'seriesCycleDuration',
        'input .m-cycle-duration': 'seriesCycleDuration',
        'change .m-anim-frame': 'seriesFrameChange',
        'input .m-anim-frame': 'seriesFrameChange'
    },

    downloadGeojsonEvent: function (event) {
        var datasetId = $(event.currentTarget).attr('m-dataset-id');
        var dataset = this.collection.get(datasetId);
        dataset.once('m:dataset_geo_dataLoaded', function (dataset) {
            var data = dataset.get('geoData');
            var a = window.document.createElement('a');
            a.href = window.URL.createObjectURL(new Blob([JSON.stringify(data)], {type: 'application/json'}));
            var filename = dataset.get('name') + '.geojson';
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
        }).loadGeoData();
    },

    removeDatasetEvent: function (event) {
        var datasetId = $(event.currentTarget).attr('m-dataset-id');
        var dataset = this.collection.get(datasetId);
        // Make opacity 1 when a layer is deleted
        dataset.set('opacity', 1);
        dataset.set('displayed', false);
    },

    toggleDatasetEvent: function (event) {
        // Toggle behavior with JQuery
        $(event.currentTarget).toggleClass('icon-eye icon-eye-off');

        var datasetId = $(event.currentTarget).attr('m-dataset-id');
        var dataset = this.collection.get(datasetId);

        dataset.set('visible', !dataset.get('visible'));
    },

    changeLayerOpacity: function (event) {
        var datasetId = $(event.currentTarget).attr('m-dataset-id');
        var dataset = this.collection.get(datasetId);
        var opacity = event.target.value;
        dataset.set('opacity', parseFloat(opacity));
    },

    reorderDisplayedLayers: function (option, dataset) {
        // Re-set the layer order on the map and then set the new order
        if (dataset.get('order') === option) {
            dataset.set('order', null);
        }
        dataset.set('order', option);
    },

    reorderLayer: function (event) {
        var option = $(event.currentTarget).attr('m-order-option');
        var dataset = this.collection.get($(event.currentTarget).attr('m-dataset-id'));

        var displayedDatasets = _.filter(this.collection.models, function (set) {
            return set.get('displayed');
        });

        if (option === 'moveDown' || option === 'moveUp') {
            var swapDataset;
            if (option === 'moveDown') {
                swapDataset = _.chain(displayedDatasets)
                    .sortBy(function (d) { return d.get('stack'); })
                    .reverse()
                    .find(function (d) { return d.get('stack') < dataset.get('stack'); })
                    .value();
            }
            else {
                swapDataset = _.chain(displayedDatasets)
                    .sortBy(function (d) { return d.get('stack'); })
                    .find(function (d) { return d.get('stack') > dataset.get('stack'); })
                    .value();
            }
            if (swapDataset) {
                var currentStack = dataset.get('stack');
                dataset.set('stack', swapDataset.get('stack'));
                swapDataset.set('stack', currentStack);
                this.reorderDisplayedLayers(option, dataset);
            }
        }
        else if (option === 'moveToBottom' && dataset.get('stack') !== 1) {
            _.chain(displayedDatasets)
                .filter(function (d) { return d.get('stack') < dataset.get('stack') })
                .each(function (dataset) { dataset.set('stack', dataset.get('stack') + 1); });
            dataset.set('stack', 1);
            this.reorderDisplayedLayers(option, dataset);
        }
        else if (option === 'moveToTop') {
            var topStack = _.max(displayedDatasets, function (dataset) { return dataset.get('stack') }).get('stack');
            if (dataset.get('stack') != topStack) {
                _.chain(displayedDatasets)
                    .filter(function (d) { return d.get('stack') > dataset.get('stack') })
                    .each(function (dataset) { dataset.set('stack', dataset.get('stack') - 1); });
                dataset.set('stack', topStack);
                this.reorderDisplayedLayers(option, dataset);
            }
        }
    },

    seriesFramePlay: function (event) {
        var datasetId = $(event.currentTarget).closest('[m-dataset-id]').attr('m-dataset-id');
        var dataset = this.collection.get(datasetId);
        dataset.set('animationState', dataset.get('animationState') !== 'play' ? 'play' : 'pause');
    },

    seriesFrameStop: function (event) {
        var datasetId = $(event.currentTarget).closest('[m-dataset-id]').attr('m-dataset-id');
        var dataset = this.collection.get(datasetId);
        dataset.set('animationState', 'stop');
        this.setSeriesFrame(dataset, 0);
    },

    seriesFrameChange: function (event) {
        var datasetId = $(event.currentTarget).closest('[m-dataset-id]').attr('m-dataset-id');
        var dataset = this.collection.get(datasetId);
        var frame = parseInt(event.target.value, 10);
        this.setSeriesFrame(dataset, frame);
    },

    seriesFrameStep: function (event) {
        var datasetId = $(event.currentTarget).closest('[m-dataset-id]').attr('m-dataset-id');
        var dataset = this.collection.get(datasetId);
        this.setSeriesFrame(dataset, 1, true);
    },

    seriesFrameStepBack: function (event) {
        var datasetId = $(event.currentTarget).closest('[m-dataset-id]').attr('m-dataset-id');
        var dataset = this.collection.get(datasetId);
        this.setSeriesFrame(dataset, -1, true);
    },

    setSeriesFrame: function (dataset, frame, delta) {
        // we may want to debounce this at some point
        var data = dataset.get('geoData');
        if (!data.series || data.series.length <= 1) {
            return;
        }
        frame = parseInt(frame, 10);
        if (delta) {
            frame += dataset.get('animationFrame') || 0;
        }
        frame = frame % data.series.length;
        if (frame < 0) {
            frame += data.series.length;
        }
        if (frame !== dataset.get('animationFrame')) {
            dataset.set('animationFrame', frame);
        }
    },

    updateSeriesFrame: function (dataset) {
        var layer = dataset.geoJsLayer;
        var data = dataset.get('geoData');
        if (!data.series || data.series.length <= 1) {
            return;
        }
        var frame = Math.min(Math.max(dataset.get('animationFrame') || 0, 0), data.series.length - 1);
        _.each(layer.features(), function (feature) {
            feature.visible(false);
        });
        _.each(data.series[frame].features, function (feature) {
            feature.visible(true);
        });
        layer.draw();
        var container = this.$('li.dataset[m-dataset-id="' + dataset.get('_id') + '"]');
        $('.m-anim-frame', container).val(frame);
        $('.m-animation-display-value', container).text(data.series[frame].label);
    },

    updateSeriesState: function (dataset) {
        var data = dataset.get('geoData');
        if (!data.series || data.series.length <= 1) {
            return;
        }
        var state = dataset.get('animationState');
        if (this.animationTimeout) {
            window.clearTimeout(this.animationTimeout);
            this.animationTimeout = null;
        }
        if (state === 'play') {
            this.playNextFrame(dataset);
        }
        if (state === 'stop') {
            this.setSeriesFrame(dataset, 0);
        }
        var container = this.$('li.dataset[m-dataset-id="' + dataset.get('_id') + '"]');
        $('.m-anim-play .canplay', container).toggleClass('hidden', state === 'play');
        $('.m-anim-play .canpause', container).toggleClass('hidden', state !== 'play');
    },

    seriesCycleDuration: function (event) {
        var datasetId = $(event.currentTarget).closest('[m-dataset-id]').attr('m-dataset-id');
        var dataset = this.collection.get(datasetId);
        var duration = parseFloat($(event.target).val());
        dataset.set('animationDuration', parseFloat(duration));
    },

    playNextFrame: function (dataset) {
        /* This is crude.  We should really know the time and frame we started
         * playing, plus the desired frame rate.  Then, in a
         * requestAnimationFrame loop, we should set the frame to the current
         * frame.  That would properly skip frames when slow. */
        if (this.animationTimeout) {
            window.clearTimeout(this.animationTimeout);
            this.animationTimeout = null;
        }
        var data = dataset.get('geoData');
        if (!data.series || data.series.length <= 1) {
            return;
        }
        var duration = parseFloat(dataset.get('animationDuration') || 30);
        var delay = Math.max(duration * 1000 / data.series.length, 10);
        this.animationTimeout = window.setTimeout(_.bind(function () {
            this.playNextFrame(dataset);
        }, this), delay);
        this.setSeriesFrame(dataset, 1, true);
    },

    initialize: function (settings) {
        settings = settings || {};
        this.animationTimeout = null;
        this.collection = settings.session.datasetsCollection;
        this.layersOrderOptions = [
            {'title': 'move up', 'method': 'moveUp', 'class': 'up'},
            {'title': 'move down', 'method': 'moveDown', 'class': 'down'},
            {'title': 'move to top', 'method': 'moveToTop', 'class': 'double-up'},
            {'title': 'move to bottom', 'method': 'moveToBottom', 'class': 'double-down'}
        ];

        this.listenTo(this.collection, 'change:displayed change:order', function () {
            this.render();
        }, this);
        this.listenTo(this.collection, 'change:geoError', function () {
            this.render();
        }, this);

        Panel.prototype.initialize.apply(this);
        this.listenTo(this.collection, 'change:geoData', function (dataset) {
            this.render();
            this.updateSeriesState(dataset);
        }, this);
        this.listenTo(this.collection, 'change:animationFrame', function (dataset) {
            this.updateSeriesFrame(dataset);
        }, this);
        this.listenTo(this.collection, 'change:animationState', function (dataset) {
            this.updateSeriesState(dataset);
        }, this);
        this.listenTo(this.collection, 'change:animationDuration', function (dataset) {
            if (dataset.get('animationState') === 'play') {
                this.playNextFrame(dataset);
            }
        }, this);
    },

    render: function () {
        var displayedDatasets = _.filter(this.collection.models, function (set) {
            return set.get('displayed');
        });

        // Sort datasets by stack
        var sortedDisplayedDatasets = _.sortBy(displayedDatasets, function (set) {
            return set.get('stack');
        }).reverse();

        this.$el.html(template({
            datasets: sortedDisplayedDatasets,
            layersOrderOptions: this.layersOrderOptions
        }));

        return this;
    }
});
export default LayersPanel;
