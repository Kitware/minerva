import { restRequest } from 'girder/rest';
import events from 'girder/events';
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
            var inputs = [];
            var process;
            var args = {};

            var datasetName = $('#m-gaiaProcessDatasetName').val();

            var capitalizeFirstLetter = function (string) {
                return string.charAt(0).toUpperCase() + string.slice(1);
            };

            var IsJsonString = function (str) {
                var obj;
                try {
                    obj = JSON.parse(str);
                } catch (e) {
                    return false;
                }
                return _.isObject(obj);
            };

            $('input[type=text], input[type=number], select').each(function (indx, elm) {
                var value = $(elm).val();
                var name = elm.name;
                var inputParams;
                if (!value) {
                    return;
                }
                if (IsJsonString(value)) {
                    inputParams = JSON.parse(value);
                }
                if (!inputParams) {
                    if (name) {
                        if (!isNaN(value)) {
                            args[name] = parseFloat(value);
                        } else {
                            args[name] = value;
                        }
                    }
                } else {
                    if (inputParams.type) {
                        inputs.push({
                            '_type': 'gaia_tasks.inputs.Minerva' + capitalizeFirstLetter(inputParams.type) + 'IO',
                            'item_id': inputParams.layer._id
                        });
                    } else {
                        process = _.first(_.keys(inputParams));
                    }
                }
            });

            var gaia = Object.assign({'_type': process}, {inputs: inputs}, args);

            console.log(JSON.stringify(gaia));

            var query = Object.assign({'datasetName': datasetName},
                {'process': gaia});

            console.log(JSON.stringify(query));

            restRequest({
                path: 'gaia_analysis',
                type: 'POST',
                contentType: 'application/json',
                data: JSON.stringify(query)
            }).done(_.bind(function () {
                events.trigger('m:job.created');
                this.$el.modal('hide');
            }, this));
        },
        'change #m-gaia-process-type': 'renderProcessInputs'
    },

    renderProcessInputs: function () {
        // Clear input dom
        $('#m-gaia-process-inputs').html('');
        $('#m-gaia-process-args').html('');

        var process = this.$('#m-gaia-process-type').val();
        try {
            // parse for side effect of validation
            JSON.parse(process);
            this.$('.g-validation-failed-message').text('');
        } catch (err) {
            this.$('.g-validation-failed-message').text('Error with getting layer data');
            return;
        }
        this.requiredInputs = _.first(_.values(JSON.parse(process))).required_inputs;
        this.requiredArguments = _.first(_.values(JSON.parse(process))).required_args;

        var gaiaArgsView = _.map(this.requiredArguments, _.bind(function (value) {
            return gaiaProcessArgsWidgetTemplate({
                value: value
            });
        }, this));
        $('#m-gaia-process-args').append(gaiaArgsView);
        var gaiaInputsView = _.flatten(_.map(this.requiredInputs, _.bind(function (value) {
            var numberOfPossibleLayers = value.max;
            return _.times(numberOfPossibleLayers, _.bind(function () {
                return gaiaProcessInputsWidgetTemplate({
                    groups: this.layers,
                    type: value.type,
                    gaia_minerva_wms: this.gaia_minerva_wms
                });
            }, this));
        }, this)));
        $('#m-gaia-process-inputs').append(gaiaInputsView);
    },

    splitOnCaps: function (string) {
        if (!string) {
            return;
        }
        return string.split(/(?=[A-Z])/).join(' ');
    },

    splitOnUnderscore: function (string) {
        if (!string) {
            return;
        }
        return string.match(/([^_]+)/g).join(' ');
    },

    renderListOfAvailableProcesses: function () {
        restRequest({
            path: 'gaia_process/classes',
            type: 'GET'
        }).done(_.bind(function (data) {
            if (data && data.processes) {
                if (data.gaia_minerva_wms) this.gaia_minerva_wms = data.gaia_minerva_wms;
                this.processes = data.processes.map(_.bind(function (process) {
                    var processName = _.first(_.keys(process));
                    var formattedProcessName = this.splitOnCaps(processName.split('.').pop());
                    return {title: formattedProcessName, data: JSON.stringify(process)};
                }, this));
                this.render();
            }
        }, this));
    },

    initialize: function (settings) {
        this.collection = settings.datasetCollection;
        this.processes = [];
        this.requiredInputs = {};
        // Get list of available processes on initialize
        this.renderListOfAvailableProcesses();
        this.gaia_minerva_wms;
        this.layers = [];
    },

    getSourceNameFromModel: function (model) {
        return (((model.get('meta') || {}).minerva || {}).source || {}).layer_source;
    },

    render: function () {
        this.layers = _.groupBy(
            _.filter(this.collection.models, this.getSourceNameFromModel),
            this.getSourceNameFromModel
        );
        var modal = this.$el.html(gaiaProcessWidgetTemplate({
            processes: this.processes
        })).girderModal(this).on('ready.girder.modal', _.bind(function () {
        }, this));
        modal.trigger($.Event('ready.girder.modal', {relatedTarget: modal}));
        return this;
    }
});

export default GaiaProcessWidget;
