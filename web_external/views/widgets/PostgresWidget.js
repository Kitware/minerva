import _ from 'underscore';
import { restRequest } from 'girder/rest';
import Backbone from 'backbone';
import bootbox from 'bootbox';
import 'dot/doT';
import 'jquery-extendext';
import 'jQuery-QueryBuilder/dist/js/query-builder';

import View from '../view';
import template from '../../templates/widgets/postgresWidget.pug';
import '../../stylesheets/widgets/postgresWidget.styl';
import 'jQuery-QueryBuilder/dist/css/query-builder.default.min.css';

const PostgresWidget = View.extend({
    events: {
        'submit #m-postgres': 'createDataset',
        'click #result-metadata': 'getResultMetadata',
        'change #m-postgres-assetstore': '_assetstoreChanged',
        'change #m-postgres-source': '_sourceChanged',
        'change #m-postgres-dataset-name': '_datasetNameChanged',
        'change #m-postgres-field': '_valueFieldChanged',
        'change select#m-postgres-aggregation': '_aggregationFunctionChanged',
        'change select#geometry-built-in-field': '_geometryBuiltInFieldChange',
        'change .geometry-field-type': '_geometryFieldTypeChange',
        'change select.link-target': '_linkTargetChange',
        'change select.link-field': '_linkFieldChange',
        'change select.link-operator': '_linkOperatorChange',
        'change select.link-value,input.link-value': '_linkValueChange',
        'click button.add-link': '_addLinkClick',
        'click button.remove-link': '_removeLinkClick',
        'change input.interactive-filter-checkbox': '_interactiveFilterModeChange'
    },
    initialize: function () {
        this.primativeColumns = this.primativeColumns.bind(this);
        this.geometryColumns = this.geometryColumns.bind(this);
        this.getAvailableAggregateFunctions = this.getAvailableAggregateFunctions.bind(this);

        this.$queryBuilder = null;
        this.filters = null;
        this.interactiveFilterBuilder = false;

        var Query = Backbone.Model.extend({
            defaults: this._getDefaults
        });
        this.queryParams = new Query();

        this.assetstores = [];
        this.selectedAssetstoreId = null;
        this.datasetName = '';
        this.sources = [];
        this.selectedSource = null;
        this.columns = [];
        this.valueField = null;
        this.aggregateFunction = null;
        this.metadata = null;
        this.metadataPending = false;

        this.geometryFieldType = 'link';
        this.geometryBuiltInField = null;
        this.geometryLink = {
            targets: [],
            target: null,
            fields: [],
            links: [{}],
            operators: ['=', 'constant']
        };

        this.validation = {
            datasetNameRequired: false,
            valueFieldRequired: false,
            geometryBuiltInFieldRequired: false,
            geometryLinkTargetRequired: false,
            geometryLinksRequired: false,
            geometryLinksInvalid: false
        };

        this._getAssetstores();
        this._loadGeometryLinks();
    },
    buildQueryFilter(element) {
        if (element.value && element.value.length &&
            (element.value[0] === 'loading...' || element.value[0] === undefined)
        ) {
            return;
        }
        var operatorConverter = (operator) => {
            switch (operator) {
                case 'equal':
                    return 'eq';
                case 'not_equal':
                    return 'ne';
                case 'less':
                    return 'lt';
                case 'in':
                    return 'in';
                case 'less_or_equal':
                    return 'lte';
                case 'greater':
                    return 'gt';
                case 'greater_or_equal':
                    return 'gte';
                case 'is_empty':
                    return 'eq';
                case 'is_not_empty':
                    return 'ne';
                case 'is_null':
                    return 'is';
                case 'is_not_null':
                    return 'notis';
                default:
                    throw 'unsupported operator';
            }
        };
        var valueConverter = (operator, value) => {
            switch (operator) {
                case 'is_empty':
                    return '';
                case 'is_not_empty':
                    return '';
                case 'is_null':
                    return null;
                case 'is_not_null':
                    return null;
                case 'equal':
                case 'not_equal':
                case 'less':
                case 'less_or_equal':
                case 'greater':
                case 'greater_or_equal':
                    if (Array.isArray(value)) {
                        return value[0];
                    }
                    return value;
                default:
                    return value;
            }
        };
        var groupRelationConverter = (relation) => {
            switch (relation) {
                case 'AND':
                    return 'and';
                case 'OR':
                    return 'or';
            }
        };
        var expression = {};
        if (element.condition) {
            var group = [];
            expression[groupRelationConverter(element.condition)] = group;
            for (var i = 0; i < element.rules.length; i++) {
                var result = this.buildQueryFilter(element.rules[i]);
                if (result) {
                    group.push(result);
                }
            }
        } else {
            expression['field'] = element.field;
            expression['operator'] = operatorConverter(element.operator);
            expression['value'] = valueConverter(element.operator, element.value);
        }
        return expression;
    },
    geometryFieldGenerator() {
        var geometryField = {
            type: this.geometryFieldType
        };
        if (this.geometryFieldType === 'built-in') {
            geometryField['field'] = this.geometryBuiltInField;
        } else if (this.geometryFieldType === 'link') {
            geometryField['itemId'] = this.geometryLink.target._id;
            geometryField['links'] = this.geometryLink.links;
        }
        return geometryField;
    },
    _getQueryFilter() {
        var result = this.$queryBuilder[0].queryBuilder.getRules({ skip_empty: true });
        if (!result) {
            return;
        }
        return this.buildQueryFilter(result);
    },
    createDataset: function (e) {
        e.preventDefault();
        var queryFilter = this._getQueryFilter();
        if (!queryFilter) return;
        if (!this._validate()) {
            return;
        }

        restRequest({
            url: '/minerva_postgres_geojson',
            type: 'POST',
            data: {
                datasetName: this.datasetName,
                assetstoreId: this.selectedAssetstoreId,
                table: this.selectedSource,
                field: this.valueField,
                aggregateFunction: this.aggregateFunction,
                filter: JSON.stringify(queryFilter),
                geometryField: JSON.stringify(this.geometryFieldGenerator())
            }
        }).done((datasetId) => {
            this.trigger('m:dataset_created', datasetId);
            this.$el.modal('hide');
        });
    },
    getResultMetadata() {
        var queryFilter = this._getQueryFilter();
        if (!queryFilter) return;
        if (!this._validate(false)) {
            return;
        }

        var hasFilter = _.some(Array.from(Object.values(queryFilter)), 'length');
        var p = Promise.resolve();
        if (!hasFilter) {
            p = new Promise((resolve, reject) => {
                bootbox.confirm(
                    'Query could take long time to execute without filters, do you want to continue?',
                    (result) => {
                        if (result) {
                            resolve();
                        }
                    });
            });
        }
        p.then(() => {
            this.metadata = null;
            this.metadataPending = true;
            this.render();
            restRequest({
                url: '/minerva_postgres_geojson/result_metadata',
                type: 'GET',
                data: {
                    assetstoreId: this.selectedAssetstoreId,
                    table: this.selectedSource,
                    field: this.valueField,
                    aggregateFunction: this.aggregateFunction,
                    filter: JSON.stringify(queryFilter),
                    geometryField: JSON.stringify(this.geometryFieldGenerator())
                }
            }).done((metadata) => {
                this.metadataPending = false;
                this.metadata = metadata;
                this.render();
            });
        });
    },
    render() {
        if (!this.modalOpenned) {
            var el = this.$el.html(template(this));
            this.modalOpenned = true;
            var modal = el.girderModal(this);

            this.$queryBuilder = this.$('.m-query-builder').queryBuilder({
                filters: [{ id: 'a', type: 'string' }],
                operators: ['equal', 'not_equal', 'in', 'not_in', 'less',
                    'less_or_equal', 'greater', 'greater_or_equal', 'is_empty',
                    'is_not_empty', 'is_null', 'is_not_null'],
                icons: {
                    add_group: 'icon-plus-squared',
                    add_rule: 'icon-plus',
                    remove_group: 'icon-cancel',
                    remove_rule: 'icon-cancel',
                    error: 'icon-cancel-circled2'
                },
                allow_empty: true
            })
                .hide()
                .on(['afterCreateRuleInput.queryBuilder', 'afterUpdateRuleValue.queryBuilder',
                    'afterUpdateRuleOperator.queryBuilder', 'afterUpdateRuleFilter.queryBuilder',
                    'afterUpdateGroupCondition.queryBuilder', 'afterAddRule.queryBuilder',
                    'afterDeleteRule.queryBuilder', 'afterAddGroup.queryBuilder',
                    'afterDeleteGroup.queryBuilder'
                ].join(' '), () => {
                    this.metadata = null;
                    this.render();
                })
                .on(['beforeDeleteRule.queryBuilder', 'afterUpdateRuleOperator.queryBuilder',
                    'afterUpdateRuleValue.queryBuilder'
                ].join(' '), (e, rule) => {
                    if (this.interactiveFilterBuilder) {
                        // Values of later created rules are derived from former rules,
                        // so they are invalid now
                        this._removeLaterRules(e.builder, rule);
                    }
                })
                .on('afterCreateRuleInput.queryBuilder afterUpdateRuleOperator.queryBuilder',
                    function (e, rule) {
                        if (rule.filter.input === 'select') {
                            if (rule.operator.multiple) {
                                rule.$el
                                    .find($.fn.queryBuilder.constructor.selectors.rule_value)
                                    .attr('multiple', true)
                                    .attr('size', 5);
                            } else {
                                rule.$el
                                    .find($.fn.queryBuilder.constructor.selectors.rule_value)
                                    .attr('multiple', false)
                                    .removeAttr('size');
                            }
                        }
                    })
                .on('afterUpdateRuleFilter.queryBuilder', function (e, rule) {
                    if (
                        // Don't load values when no filter selected
                        !rule.filter ||
                        // Don't load values for number column
                        rule.filter.input === 'number' ||
                        // Don't load if already loaded
                        (!this.interactiveFilterBuilder && rule.filter.populated) ||
                        (this.interactiveFilterBuilder &&
                            rule.populatedWithFilter &&
                            rule.populatedWithFilter === rule.filter.id)) {
                        return;
                    }
                    var queryData = {
                        assetstoreId: this.selectedAssetstoreId,
                        table: this.selectedSource,
                        column: rule.filter.id
                    };
                    if (this.interactiveFilterBuilder) {
                        let filter = this._getQueryFilter();
                        if (!filter) {
                            return;
                        } else {
                            queryData.filter = JSON.stringify(filter);
                        }
                    }
                    Promise.resolve(restRequest({
                        url: '/minerva_postgres_geojson/values',
                        type: 'GET',
                        data: queryData
                    })).then(function (values) {
                        rule.filter.values = [''].concat(values.sort());
                        this.$queryBuilder[0].queryBuilder.setFilters(this.filters);
                        this.$queryBuilder[0].queryBuilder.createRuleInput(rule);
                        if (!this.interactiveFilterBuilder) {
                            rule.filter.populated = true;
                        } else {
                            rule.populatedWithFilter = rule.filter.id;
                            rule.filter.values = ['loading...'];
                            this.$queryBuilder[0].queryBuilder.setFilters(this.filters);
                        }
                    }.bind(this));
                }.bind(this));

            modal.trigger($.Event('ready.girder.modal', { relatedTarget: modal }));
        } else {
            this.$queryBuilder.detach();
            this.$el.html(template(this));
            this.$('.m-query-builder').replaceWith(this.$queryBuilder);
            if (this.columns && this.columns.length) {
                this.$queryBuilder.show();
            } else {
                this.$queryBuilder.hide();
            }
        }
        return this;
    },
    primativeColumns: function () {
        return this.columns.filter((column) => column.datatype !== 'geometry');
    },
    geometryColumns: function () {
        return this.columns.filter((column) => column.datatype === 'geometry');
    },
    getAvailableAggregateFunctions: function () {
        var datatype = this.columns.find((c) => c.name === this.valueField).datatype;
        var funcs = [];
        if (datatype === 'number' || datatype === 'date') {
            funcs = funcs.concat(['sum', 'avg', 'stddev', 'variance']);
        }
        if (datatype === 'string' || datatype === 'number') {
            funcs = funcs.concat(['count', 'max', 'min']);
        }
        return funcs;
    },
    _getAssetstores: function () {
        Promise.resolve(restRequest({
            url: '/minerva_postgres_geojson/assetstores',
            type: 'GET'
        })).then(function (assetstores) {
            this.assetstores = assetstores;
            this.render();
        }.bind(this));
    },
    _getSources: function () {
        Promise.resolve(restRequest({
            url: '/minerva_postgres_geojson/tables',
            type: 'GET',
            data: {
                assetstoreId: this.selectedAssetstoreId
            }
        })).then(function (sources) {
            this.sources = sources;
            this.render();
        }.bind(this));
    },
    _datasetNameChanged: function (e) {
        var datasetName = $(e.target).val();
        this.datasetName = datasetName;
        this.validation.datasetNameRequired = !datasetName;
        this.render();
    },
    _assetstoreChanged: function (e) {
        var assetstoreId = $(e.target).val();
        this.selectedAssetstoreId = assetstoreId;
        this.valueField = '';
        this.sources = [];
        this.filters = [];
        this.columns = [];
        this.geometryLink.target = '';
        this.geometryLink.links = [];
        this.metadata = null;
        if (this.selectedAssetstoreId) {
            this._getSources(this.selectedSource);
        }
        this.render();
    },
    _sourceChanged: function (e) {
        var source = $(e.target).val();
        this.selectedSource = source;
        this.valueField = '';
        this.filters = [];
        this.columns = [];
        this.geometryLink.target = '';
        this.geometryLink.links = [];
        this.metadata = null;
        if (this.selectedSource) {
            this._loadFilterConfiguration(this.selectedSource);
        }
        this.render();
    },
    _loadFilterConfiguration: function () {
        Promise.resolve(restRequest({
            url: '/minerva_postgres_geojson/columns',
            type: 'GET',
            data: {
                table: this.selectedSource,
                assetstoreId: this.selectedAssetstoreId
            }
        })).then(function (columns) {
            this.columns = columns;
            for (var i = 0; i < columns.length; i++) {
                if (['number'].indexOf(columns[i].datatype) !== -1) {
                    this.valueField = columns[i].name;
                    break;
                }
            }
            if (this.valueField && this.selectedSource) {
                this.aggregateFunction = this.getAvailableAggregateFunctions()[0];
            }
            var filters = [];
            var convertFilterType = function (dataType) {
                switch (dataType) {
                    case 'number':
                        return 'double';
                    case 'string':
                        return 'string';
                    case 'date':
                        return 'datetime';
                    default:
                        return undefined;
                }
            };
            for (var j = 0; j < columns.length; j++) {
                var filter = {};
                var filterType = convertFilterType(columns[j].datatype);
                if (!filterType) {
                    continue;
                }
                filter['id'] = columns[j].name;
                filter['type'] = filterType;
                if (filterType === 'string') {
                    filter['multiple'] = true;
                    filter['values'] = ['loading...'];
                    filter['input'] = 'select';
                }
                filters.push(filter);
            }
            this.filters = filters;
            this.$queryBuilder[0].queryBuilder.reset();
            if (this.filters) {
                this.$queryBuilder[0].queryBuilder.setFilters(this.filters);
            }
            this.render();
        }.bind(this));
    },
    _removeAllRules(queryBuilder) {
        var rules = queryBuilder.model.root.rules;
        for (let i = rules.length - 1; i >= 0; i--) {
            // Is a group
            if (rules[i].rules) {
                queryBuilder.deleteGroup(rules[i].rules);
            } else {
                queryBuilder.deleteRule(rules[i]);
            }
        }
    },
    _removeLaterRules(queryBuilder, rule) {
        function getAllRules(rules) {
            var allRules = [];
            for (let rule of rules) {
                // Is a group
                if (rule.rules) {
                    allRules = allRules.concat(getAllRules(rule.rules));
                } else {
                    allRules.push(rule);
                }
            }
            return allRules;
        }
        var allRules = getAllRules(queryBuilder.model.root.rules);
        var index = allRules.indexOf(rule);
        for (let i = allRules.length - 1; i > index; i--) {
            queryBuilder.deleteRule(allRules[i]);
        }
    },
    _interactiveFilterModeChange(e) {
        this.interactiveFilterBuilder = e.target.checked;
        this._removeAllRules(this.$queryBuilder[0].queryBuilder);
    },
    _valueFieldChanged: function (e) {
        this.valueField = $(e.target).val();
        this.validation.valueFieldRequired = !this.valueField;
        if (this.valueField) {
            this.aggregateFunction = this.getAvailableAggregateFunctions()[0];
        } else {
            this.aggregateFunction = '';
        }
        this.render();
    },
    _aggregationFunctionChanged: function (e) {
        this.aggregateFunction = $(e.target).val();
    },
    _geometryBuiltInFieldChange: function (e) {
        this.geometryBuiltInField = $(e.target).val();
        this.validation.geometryBuiltInFieldRequired = !this.geometryBuiltInField;
        this.render();
    },
    _geometryFieldTypeChange: function (e) {
        this.geometryFieldType = $(e.target).val();
        this.geometryLink.target = '';
        this.geometryLink.links = [];
        this.metadata = null;
        this.render();
    },
    _linkTargetChange: function (e) {
        var id = $(e.target).val();
        this.geometryLink.target = this.geometryLink.targets.find(function (target) {
            return target._id === id;
        });
        this.validation.geometryLinkTargetRequired = !this.geometryLink.target;
        this.geometryLink.links = [];
        this.metadata = null;
        if (this.geometryLink.target) {
            this._loadGeometryLinkField();
        }
        this.render();
    },
    _linkFieldChange: function (e) {
        var linkIndex = $(e.target).data('link-index');
        this.geometryLink.links[linkIndex].field = $(e.target).val();
        this.metadata = null;
        this.render();
    },
    _linkOperatorChange: function (e) {
        var linkIndex = $(e.target).data('link-index');
        this.geometryLink.links[linkIndex].operator = $(e.target).val();
        this.geometryLink.links[linkIndex].value = '';
        this.metadata = null;
        this.render();
    },
    _linkValueChange: function (e) {
        var linkIndex = $(e.target).data('link-index');
        this.geometryLink.links[linkIndex].value = $(e.target).val();
        this.metadata = null;
        this.render();
    },
    _addLinkClick: function (e) {
        this.geometryLink.links.push({});
        this.validation.geometryLinksRequired = false;
        this.metadata = null;
        this.render();
    },
    _removeLinkClick: function (e) {
        var linkIndex = $(e.currentTarget).data('link-index');
        this.geometryLink.links.splice(linkIndex, 1);
        if (this.geometryLink.links.length === 0) {
            this.validation.geometryLinksRequired = true;
        }
        this.metadata = null;
        this.render();
    },
    _loadGeometryLinks: function () {
        return Promise.resolve(restRequest({
            url: '/minerva_postgres_geojson/geometrylink',
            type: 'GET'
        })).then(function (links) {
            this.geometryLink.targets = links;
            this.render();
        }.bind(this));
    },
    _loadGeometryLinkField: function () {
        return Promise.resolve(restRequest({
            url: '/minerva_postgres_geojson/geometrylinkfields',
            type: 'GET',
            data: {
                itemId: this.geometryLink.target._id
            },
            error: null
        })).then(function (fields) {
            this.geometryLink.fields = fields;
            this.render();
        }.bind(this)).catch(function () {
            this.geometryLink.fields = [];
        }.bind(this));
    },
    _validate(includeDatasetName = true) {
        if (includeDatasetName) {
            this.validation.datasetNameRequired = !this.datasetName;
        }
        this.validation.valueFieldRequired = !this.valueField;
        this.validation.geometryLinkTargetRequired =
            (!this.geometryLink.target && this.geometryFieldType === 'link');
        this.validation.geometryBuiltInFieldRequired =
            (!this.geometryBuiltInField && this.geometryFieldType === 'built-in');
        this.validation.geometryLinksRequired =
            (!this.geometryLink.links.length && this.geometryLink.target && this.geometryFieldType === 'link');
        this.validation.geometryLinksInvalid = false;
        if (this.geometryFieldType === 'link' && this.geometryLink.target && this.geometryLink.links) {
            this.validation.geometryLinksInvalid =
                // needs to have at least on equal linking for joining
                !this.geometryLink.links.find(function (link) {
                    return link.operator === '=';
                }) ||
                _.some(this.geometryLink.links, function (link) {
                    return !link.field || !link.operator || !link.value;
                });
        }
        this.render();
        return !_.some(_.values(this.validation));
    }
});

export default PostgresWidget;
