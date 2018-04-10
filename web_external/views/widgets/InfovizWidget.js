import $ from 'jquery';
import _ from 'underscore';
import 'jquery-ui-bundle';
import * as vl from 'vega-lite';
import * as vega from 'vega';
import * as vegaTooltip from 'vega-tooltip';
import diff from 'fast-diff';
import 'jquery-ui-bundle/jquery-ui.css';
import events from 'girder/events';
import 'vega-tooltip/src/vega-tooltip.css';

import View from '../view';
import template from '../../templates/widgets/infovizWidget.pug';
import '../../stylesheets/widgets/infovizWidget.styl';

const InfovizWidget = View.extend({
    events: {
        'change input.xlabel': function (e) {
            if (e.target.checked) {
                this.propertiesForX.push(e.target.value);
            } else {
                var index = this.propertiesForX.indexOf(e.target.value);
                this.propertiesForX.splice(index, 1);
            }
            this.render();
        }
    },
    initialize(settings) {
        this.dataset = settings.dataset;
        this.errorMessage = null;
        this._debouncedUpdateVegaViewHeight = _.debounce(this._updateVegaViewHeight, 500);
        this.listenTo(this.dataset, 'm:dataset_config_change', () => {
            this._prepare();
            this.render();
        });

        this._prepare();
    },

    _prepare() {
        var geoData = this.dataset.get('geoData');
        if (!geoData) {
            this.errorMessage = `Dataset '${this.dataset.get('name')}' is not supported`;
            return;
        }
        this.geoData = geoData;
        var visProperties = this.dataset.getMinervaMetadata().visProperties;
        this.propertyForY = visProperties.polygon.fillColorKey;
        if (!this.propertyForY) {
            this.errorMessage = `Dataset '${this.dataset.get('name')}' does not contain a visualizing numeric property.`;
            return;
        }
        this.xlabels = Object.keys(geoData.summary);
        this.propertiesForX = [];
        var summary = geoData.summary;

        // The x-axis is always the feature of featureCollections. however, which feature property to be used as x-axis label is not determined. The following code first try to find all non-numeric properties and then run a rudimentary method to find a property with most variant
        var candidatePropertyForX = _.chain(Object.keys(geoData.summary))
            .filter((property) => {
                var propertySummary = summary[property];
                return propertySummary.values && propertySummary.count === geoData.features.length &&
                    Object.keys(propertySummary.values).length === geoData.features.length;
            }).sortBy((property) => {
                var values = Object.keys(summary[property].values);
                var sortby = diff(values[0], values.slice(-1)[0]).filter((diff) => {
                    return diff[0] !== 0;
                }).length;
                return sortby;
            }).reverse().value()[0];
        if (candidatePropertyForX) {
            this.propertiesForX = [candidatePropertyForX];
        }
    },

    render() {
        if (this.errorMessage) {
            events.trigger('g:alert', {
                type: 'info',
                text: this.errorMessage,
                timeout: 4000
            });
            this.remove();
            this.trigger('removed');
            return this;
        }
        var values = null;
        var visProperties = this.dataset.getMinervaMetadata().visProperties;
        var { name: scaleName, scale } = getScale(
            this.geoData.summary[this.propertyForY],
            visProperties.polygon.logFlag,
            visProperties.polygon.quantileFlag,
            visProperties.polygon.clampingFlag,
            visProperties.polygon.minClamp,
            visProperties.polygon.maxClamp,
            this.geoData.features.map((feature) => feature.properties[this.propertyForY])
        );

        var scaledPropertyForY = (scaleName === 'linear' && !visProperties.polygon.clampingFlag) ? null : `${this.propertyForY} (${scaleName})`;
        var x = this.propertiesForX.length ? this.propertiesForX.join(', ') : 'record';
        values = this.geoData.features.map((feature, i) => {
            var xValue = this.propertiesForX.length
                ? this.propertiesForX.map((property) => {
                    return feature.properties[property];
                }).join(', ')
                : i;
            if (!scaledPropertyForY) {
                return {
                    [this.propertyForY]: feature.properties[this.propertyForY],
                    [x]: xValue
                };
            } else {
                return {
                    [scaledPropertyForY]: scale(feature.properties[this.propertyForY]),
                    [this.propertyForY]: feature.properties[this.propertyForY],
                    [x]: xValue
                };
            }
        });

        if (!this.modalOpen) {
            this.modalOpen = true;
            let $element = $(template(this));
            $element.dialog({
                width: 600,
                height: 500,
                classes: { 'ui-dialog': 'm-infoviz-widget-dialog' },
                title: '<i class="icon-chart-bar"></i>&nbsp;' + this.dataset.get('name'),
                close: (event, ui) => {
                    $element.dialog('destroy');
                    $element.remove();
                    this.trigger('removed');
                },
                position: { my: 'right top', at: 'right-15 top+' + (5 + $('.m-session-header').outerHeight()), of: '#m-map-panel' },
                resize: () => {
                    this._debouncedUpdateVegaViewHeight();
                }
            });
            this.setElement($element);
        } else {
            let $element = $(template(this));
            this.$el.empty();
            this.$el.append($element.children());
        }

        var $chartContainer = this.$el.find('.chart-container');
        var spec = {
            $schema: 'https://vega.github.io/schema/vega-lite/v2.json',
            data: {
                values: values
            },
            mark: 'bar',
            encoding: {
                x: {
                    field: x,
                    type: 'ordinal',
                    axis: {
                        labelAngle: -45,
                        labelOverlap: false
                    }
                },
                y: {
                    field: scaledPropertyForY || this.propertyForY,
                    type: 'quantitative',
                    axis: {
                        labels: !scaledPropertyForY
                    }
                }
            },
            height: $chartContainer.height() - 30,
            autosize: { type: 'fit-y', resize: true, contains: 'padding' }
        };

        var view = new vega.View(vega.parse(vl.compile(spec).spec))
            .renderer('svg')
            .initialize($chartContainer[0])
            .run();

        vegaTooltip.vegaLite(view, spec, {
            showAllFields: false,
            fields: [{
                field: this.propertyForY
            }, {
                field: x
            }]
        });

        this.vegaView = view;
        return this;
    },

    _updateVegaViewHeight() {
        this.vegaView.height($(this.vegaView.container()).height() - 30);
        this.vegaView.run();
    }
});

// Overwrite to make jQuery dialog support html title
$.widget('ui.dialog', $.extend({}, $.ui.dialog.prototype, {
    _title: function (title) {
        if (!this.options.title) {
            title.html('&#160;');
        } else {
            title.html(this.options.title);
        }
    }
}));

function getScale(summary, logFlag, quantileFlag, clampingFlag, minClamp, maxClamp, data) {
    // handle the case when all values are the same
    if (summary.min >= summary.max) {
        summary.max = summary.min + 1;
    }
    if (logFlag && summary.min > 0) {
        return { name: 'log', scale: Math.log };
    } else if (quantileFlag) {
        return {
            name: 'quantile',
            scale: d3.scale.quantile()
                .domain(data)
                .range(_.range(1, 100))
        };
    } else {
        // linear scaling
        if (clampingFlag) {
            return {
                name: 'clamped linear',
                scale: function (value) {
                    if (value < minClamp) {
                        return minClamp;
                    } else if (value > maxClamp) {
                        return maxClamp;
                    } else {
                        return value;
                    }
                }
            };
        } else {
            return {
                name: 'linear',
                scale: (value) => value
            };
        }
    }
}

export default InfovizWidget;
