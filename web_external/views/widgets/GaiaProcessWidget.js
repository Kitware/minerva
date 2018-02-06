import { restRequest } from 'girder/rest';
import events from 'girder/events';
import _ from 'underscore';

import View from '../view';
import gaiaProcessArgsWidgetTemplate from '../../templates/widgets/gaiaProcessArgsWidget.pug';
import gaiaProcessInputsWidgetTemplate from '../../templates/widgets/gaiaProcessInputsWidget.pug';
import gaiaProcessWidgetTemplate from '../../templates/widgets/gaiaProcessWidget.pug';
import '../../stylesheets/widgets/gaiaProcessWidget.styl';

/**
* This widget is used to add/edit gaia processes.
*/
var GaiaProcessWidget = View.extend({

    events: {
        'submit #m-gaia-process-form': function (e) {
            e.preventDefault();

            var params = {
                datasetName: this.datasetName,
                process: Object.assign({
                    _type: Object.keys(this.selectedProcess.processMeta)[0],
                    inputs: this.inputArgs
                }, this.inputParams)
            };

            restRequest({
                path: 'gaia_analysis',
                type: 'POST',
                contentType: 'application/json',
                data: JSON.stringify(params)
            }).done(() => {
                events.trigger('m:job.created');
                this.$el.modal('hide');
            });
        },
        'change .dataset-name': function (e) {
            this.datasetName = e.target.value;
        },
        'change #m-gaia-process-type': function (e) {
            this.selectedProcess = this.processes[e.target.value];
            this.inputArgs = [];
            this.inputParams = {};
            this.render();
        },
        'change .input-arg': function (e) {
            var index = $(e.target).data('index');
            var type = $(e.target).data('type');
            var datasetId = e.target.value;
            this._setInput(index, type, datasetId);
        },
        'change .input-params': function (e) {
            var name = $(e.target).data('name');
            var value = e.target.value;
            if (e.target.type === 'number') {
                value = parseInt(value);
            }
            this.inputParams[name] = value;
        }
    },

    initialize(settings) {
        this.generateInputsFields = this.generateInputsFields.bind(this);
        this.generateArgsFields = this.generateArgsFields.bind(this);
        this.collection = settings.datasetCollection;
        this.selectedProcess = settings.selectedProcess;
        this.processes = settings.processes;
        this.requiredInputs = {};
        // Get list of available processes on initialize
        this.gaia_minerva_wms = null;
        this.inputArgs = [];
        this.inputParams = {};
        this.datasetName = '';
        this.layers = [];
        // Set initial inputs based on datset selection
        var inputs = Object.values(this.selectedProcess.processMeta)[0].required_inputs;
        Array.from(settings.datasetsId).forEach((datasetId, index) => {
            if (inputs[index]) {
                this._setInput(index, inputs[index].type, datasetId);
            }
        });
        this.settings = settings;
    },

    _setInput(index, type, datasetId) {
        var capitalizeFirstLetter = (string) => {
            return string.charAt(0).toUpperCase() + string.slice(1);
        };
        this.inputArgs[index] = {
            '_type': 'gaia_tasks.inputs.Minerva' + capitalizeFirstLetter(type) + 'IO',
            'item_id': datasetId
        };
    },

    generateInputsFields(process) {
        var inputs = Object.values(process.processMeta)[0].required_inputs;
        return _.flatten(inputs.map((input, index) => {
            var numberOfPossibleLayers = input.max;
            return _.times(numberOfPossibleLayers, () => {
                return gaiaProcessInputsWidgetTemplate(Object.assign({}, this, { index, type: input.type }));
            });
        })).join('');
    },

    generateArgsFields(process) {
        var args = Object.values(process.processMeta)[0].required_args;
        return args.map((value) => {
            return gaiaProcessArgsWidgetTemplate({
                value: value
            });
        }).join('');
    },

    getSourceNameFromModel: function (model) {
        return (((model.get('meta') || {}).minerva || {}).source || {}).layer_source;
    },

    render() {
        this.layers = _.chain(this.collection.toArray())
            .filter(this.getSourceNameFromModel)
            .groupBy(this.getSourceNameFromModel)
            .value();
        if (!this.modalOpened) {
            this.modalOpened = true;
            var modal = this.$el.html(gaiaProcessWidgetTemplate(this)).girderModal(this).on('ready.girder.modal', _.bind(function () {
            }, this));
            modal.trigger($.Event('ready.girder.modal', { relatedTarget: modal }));
        } else {
            this.$el.html(gaiaProcessWidgetTemplate(this));
        }
        return this;
    }
});

export default GaiaProcessWidget;
