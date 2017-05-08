minerva.views.PostgresWidget = minerva.View.extend({
    events: {
        'submit #m-postgres': 'getGeojson',
        'change #m-postgres-dataset-name': '_datasetNameChanged',
        'change #m-postgres-source': '_sourceChanged',
        'change #m-postgres-field': '_fieldChanged'
    },
    formToTable: {
    },
    initialize: function () {
        this.$queryBuilder = null;

        this.filters = null;

        var Query = Backbone.Model.extend({
            defaults: this._getDefaults
        });
        this.queryParams = new Query();

        this.datasetName = '';
        this.invalidDatasetName = false;
        this.sources = [];
        this.selectedSource = null;
        this.columns = [];
        this.selectedField = null;

        this._getSources();
    },
    getGeojson: function (e) {
        e.preventDefault();
        var operatorConverter = function (operator) {
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
        var valueConverter = function (operator, value) {
            switch (operator) {
                case 'is_empty':
                    return '';
                case 'is_not_empty':
                    return '';
                case 'is_null':
                    return 'null';
                case 'is_not_null':
                    return 'null';
                case 'equal':
                case 'not_equal':
                case 'less':
                case 'less_or_equal':
                case 'greater':
                case 'greater_or_equal':
                    if (Array.isArray(value)) {
                        return value[0];
                    }
                default:
                    return value;
            }
        };
        var groupRelationConverter = function (relation) {
            switch (relation) {
                case 'AND':
                    return 'and';
                case 'OR':
                    return 'or';
            }
        };
        var buildQueryFilter = function (element) {
            var expression = {};
            if (element.condition) {
                var group = [];
                expression[groupRelationConverter(element.condition)] = group;
                for (var i = 0; i < element.rules.length; i++) {
                    group.push(buildQueryFilter(element.rules[i]));
                }
            }
            else {
                expression['field'] = element.field;
                expression['operator'] = operatorConverter(element.operator);
                expression['value'] = valueConverter(element.operator, element.value);
            }
            return expression;
        };
        var filters = [];
        var result = this.$queryBuilder[0].queryBuilder.getRules();
        if (!result) {
            return;
        }
        if (!this.datasetName) {
            this.invalidDatasetName = true;
            this.render();
            return;
        }
        queryFilter = buildQueryFilter(result);
        girder.restRequest({
            path: '/minerva_postgres_geojson/geojson',
            type: 'GET',
            error: null,
            data: {
                datasetName: this.datasetName,
                table: this.selectedSource,
                field: this.selectedField,
                filter: JSON.stringify(queryFilter)
            }
        })
            .done(function (datasetId) {
                this.trigger('m:dataset_created', datasetId);
                this.$el.modal('hide');
            }.bind(this));
    },
    render: function () {
        if (!this.modalOpenned) {
            var el = this.$el.html(minerva.templates.postgresWidget(this));
            this.modalOpenned = true;
            var modal = el.girderModal(this);

            this.$queryBuilder = this.$('.m-query-builder').queryBuilder({
                filters: [{ id: 'a', type: 'string' }],
                operators: ['equal', 'not_equal', 'in', 'not_in', 'less', 'less_or_equal', 'greater', 'greater_or_equal', 'is_empty', 'is_not_empty', 'is_null', 'is_not_null'],
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
                .on('afterCreateRuleInput.queryBuilder afterUpdateRuleOperator.queryBuilder', function (e, rule) {
                    if (rule.filter.input == 'select') {
                        if (rule.operator.multiple) {
                            rule.$el.find($.fn.queryBuilder.constructor.selectors.rule_value).attr('multiple', true).attr('size', 5);
                        }
                        else {
                            rule.$el.find($.fn.queryBuilder.constructor.selectors.rule_value).attr('multiple', false).removeAttr('size');
                        }
                    }
                });

            modal.trigger($.Event('ready.girder.modal', { relatedTarget: modal }));
        }
        else {
            this.$queryBuilder.detach();
            this.$el.html(minerva.templates.postgresWidget(this));
            this.$('.m-query-builder').replaceWith(this.$queryBuilder);
            if (this.filters) {
                this.$queryBuilder.show();
            }
            else {
                this.$queryBuilder.hide();
            }
        }
    },
    _getSources: function () {
        Promise.resolve(girder.restRequest({
            path: '/minerva_postgres_geojson/tables',
            type: 'GET'
        })).then(function (sources) {
            this.sources = sources;
            this.render();
        }.bind(this));
    },
    _datasetNameChanged: function (e) {
        var datasetName = $(e.target).val();
        this.datasetName = datasetName;
        this.invalidDatasetName = !datasetName;
        this.render();
    },
    _sourceChanged: function (e) {
        var source = $(e.target).val();
        this.selectedSource = source;
        this._loadFilterConfiguration(source);
    },
    _loadFilterConfiguration: function (sourceName) {
        return Promise.all([
            Promise.resolve(girder.restRequest({
                path: '/minerva_postgres_geojson/columns',
                type: 'GET',
                data: {
                    table: sourceName
                }
            })),
            Promise.resolve(girder.restRequest({
                path: '/minerva_postgres_geojson/all_values',
                type: 'GET',
                data: {
                    table: sourceName
                }
            }))
        ]).then(function (data) {
            var columns = data[0];
            this.columns = columns;
            for (var i = 0; i < columns.length; i++) {
                if (['interger', 'numeric'].indexOf(columns[i].data_type) != -1) {
                    this.selectedField = columns[i].column_name;
                    break;
                }
            }
            var values = data[1];
            var filters = [];
            var convertFilterType = function (dataType) {
                switch (dataType) {
                    case 'integer':
                        return 'integer';
                    case 'numeric':
                        return 'double';
                    case 'character varying':
                    case 'character':
                        return 'string';
                    case 'date':
                        return 'datetime';
                    default:
                        return undefined;
                }
            }
            for (var i = 0; i < columns.length; i++) {
                var filter = {};
                var filterType = convertFilterType(columns[i].data_type);
                if (!filterType) {
                    continue;
                }
                filter['id'] = columns[i].column_name;
                filter['type'] = filterType;
                if (filterType == 'string') {
                    filter['multiple'] = true;
                    filter['values'] = values[columns[i].column_name].sort();
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
        }.bind(this))
    },
    _fieldChanged: function (e) {
        var field = $(e.target).val();
        this.selectedField = field;
    }
});
