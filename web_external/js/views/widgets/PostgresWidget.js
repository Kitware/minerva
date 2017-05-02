minerva.views.PostgresWidget = minerva.View.extend({
    events: {
        'submit #m-postgres': 'getGeojson',
        'change #m-postgres-source': 'sourceChanged'
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

        this.sources = [];
        this.selectedSource = null;

        this.getSources();
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
        }
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
                default:
                    return value;
            }
        }
        var filters = [];
        var rules = this.$queryBuilder[0].queryBuilder.getRules().rules;
        for (var i = 0; i < rules.length; i++) {
            filters.push({
                field: rules[i].field,
                operator: operatorConverter(rules[i].operator),
                value: valueConverter(rules[i].operator, rules[i].value)
            });
        }

        girder.restRequest({
            path: '/minerva_postgres_geojson/geojson',
            type: 'GET',
            error: null,
            data: {
                table: this.selectedSource,
                filter: JSON.stringify(filters)
            }
        })
        // .done(function (datasetId) {
        //     this.trigger('m:dataset_created', datasetId);
        //     that.$el.modal('hide');
        // }.bind(this));
    },
    render: function () {
        if (!this.modalOpenned) {
            var el = this.$el.html(minerva.templates.postgresWidget(this));
            this.modalOpenned = true;
            var modal = el.girderModal(this);

            this.$queryBuilder = this.$('.m-query-builder').queryBuilder({
                filters: [{ id: 'a', type: 'string' }],
                operators: ['equal', 'not_equal', 'less', 'less_or_equal', 'greater', 'greater_or_equal', 'is_empty', 'is_not_empty', 'is_null', 'is_not_null'],
                icons: {
                    add_group: 'icon-plus-squared',
                    add_rule: 'icon-plus',
                    remove_group: 'icon-cancel',
                    remove_rule: 'icon-cancel',
                    error: 'icon-cancel-circled2'
                },
                allow_groups: false,
                conditions: ['AND']
            });
            this.$queryBuilder.hide();

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
    getSources: function () {
        Promise.resolve(girder.restRequest({
            path: '/minerva_postgres_geojson/tables',
            type: 'GET'
        })).then(function (tables) {
            this.sources = tables;
            this.render();
        }.bind(this));
    },
    sourceChanged: function (e) {
        var source = $(e.target).val();
        this.selectedSource = source;
        this._getFilter(source).then(function (filters) {
            this.filters = filters;
            this.$queryBuilder[0].queryBuilder.reset();
            if (filters) {
                this.$queryBuilder[0].queryBuilder.setFilters(filters);
            }
            this.render();
        }.bind(this));
    },
    _getFilter: function (sourceName) {
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
                    filter['values'] = values[columns[i].column_name];
                    filter['input'] = 'select';
                }
                filters.push(filter);
            }
            return filters;
        }.bind(this))
    },
});
