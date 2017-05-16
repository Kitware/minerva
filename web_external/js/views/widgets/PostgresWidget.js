minerva.views.PostgresWidget = minerva.View.extend({
    events: {
        'submit #m-postgres': 'getGeojson',
        'change #m-postgres-source': '_sourceChanged',
        'change #m-postgres-dataset-name': '_datasetNameChanged',
        'change #m-postgres-field': '_valueFieldChanged',
        'change select#geometry-built-in-field': '_geometryBuiltInFieldChange',
        'change .geometry-field-type': '_geometryFieldTypeChange',
        'change select#link-target': '_linkTargetChange',
        'change select.link-field': '_linkFieldChange',
        'change select.link-operator': '_linkOperatorChange',
        'change select.link-value,input.link-value': '_linkValueChange',
        'click button.add-link': '_addLinkClick',
        'click button.remove-link': '_removeLinkClick',
    },
    formToTable: {
    },
    initialize: function () {
        this.linkFields = this.linkFields.bind(this);

        this.$queryBuilder = null;

        this.filters = null;

        var Query = Backbone.Model.extend({
            defaults: this._getDefaults
        });
        this.queryParams = new Query();

        this.datasetName = '';
        this.sources = [];
        this.selectedSource = null;
        this.columns = [];
        this.valueField = null;

        this.geometryFieldType = 'link';
        this.geometryBuiltInField = null;
        this.geometryLinks = [{}];
        this.geometryLinkTargets = ['state'];
        this.geometryLinkTarget = null;
        this.linkOperators = ['=', 'constant'];

        this.validation = {
            datasetNameRequired: false,
            valueFieldRequired: false,
            geometryBuiltInFieldRequired: false,
            geometryLinkTargetRequired: false,
            geometryLinksRequired: false,
            geometryLinksInvalid: false
        }

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
        if (!result | !this.validate()) {
            return;
        }

        queryFilter = buildQueryFilter(result);

        var geometryFieldGenerator = function () {
            var geometryField = {
                type: this.geometryFieldType
            };
            if (this.geometryFieldType == 'built-in') {
                geometryField['field'] = this.geometryBuiltInField
            }
            else if (this.geometryFieldType = 'link') {
                geometryField['target'] = this.geometryLinkTarget;
                geometryField['links'] = this.geometryLinks;
            }
            return geometryField;
        }.bind(this);
        link = this.geometryFieldType == 'link';

        girder.restRequest({
            path: link ? '/minerva_postgres_geojson/json' : '/minerva_postgres_geojson/geojson',
            type: 'GET',
            error: null,
            data: {
                datasetName: this.datasetName,
                table: this.selectedSource,
                field: this.valueField,
                filter: JSON.stringify(queryFilter),
                geometryField: JSON.stringify(geometryFieldGenerator())
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
            if (this.filters && this.filters.length) {
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
        this.validation.datasetNameRequired = !datasetName;
        this.render();
    },
    _sourceChanged: function (e) {
        var source = $(e.target).val();
        this.selectedSource = source;
        this.filters = [];
        this.columns = [];
        this.geometryLinkTarget = '';
        this.geometryLinks = [];
        if (source) {
            this._loadFilterConfiguration(source);
        }
        else {
            this.render();
        }
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
                if (['number'].indexOf(columns[i].datatype) != -1) {
                    this.valueField = columns[i].name;
                    break;
                }
            }
            var values = data[1];
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
            }
            for (var i = 0; i < columns.length; i++) {
                var filter = {};
                var filterType = convertFilterType(columns[i].datatype);
                if (!filterType) {
                    continue;
                }
                filter['id'] = columns[i].name;
                filter['type'] = filterType;
                if (filterType == 'string') {
                    filter['multiple'] = true;
                    filter['values'] = values[columns[i].name].sort();
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
    _valueFieldChanged: function (e) {
        this.valueField = $(e.target).val();
        this.validation.valueFieldRequired = !this.valueField;
        this.render();
    },
    _geometryBuiltInFieldChange: function (e) {
        this.geometryBuiltInField = $(e.target).val();
        this.validation.geometryBuiltInFieldRequired = !this.geometryBuiltInField;
        this.render();
    },
    _geometryFieldTypeChange: function (e) {
        this.geometryFieldType = $(e.target).val();
        this.geometryLinkTarget = '';
        this.geometryLinks = [];
        this.render();
    },
    linkFields: function () {
        switch (this.geometryLinkTarget) {
            case 'state':
                return ['name', 'abbr'];
            case 'zipcode':
                return [];
            default:
                return [];
        }
    },
    _linkTargetChange: function (e) {
        this.geometryLinkTarget = $(e.target).val();
        this.validation.geometryLinkTargetRequired = !this.geometryLinkTarget;
        this.geometryLinks = [];
        this.render();
    },
    _linkFieldChange: function (e) {
        var linkIndex = $(e.target).data('link-index');
        this.geometryLinks[linkIndex].field = $(e.target).val();
        this.render();
    },
    _linkOperatorChange: function (e) {
        var linkIndex = $(e.target).data('link-index');
        this.geometryLinks[linkIndex].operator = $(e.target).val();
        this.geometryLinks[linkIndex].value = '';
        this.render();
    },
    _linkValueChange: function (e) {
        var linkIndex = $(e.target).data('link-index');
        this.geometryLinks[linkIndex].value = $(e.target).val();
        this.render();
    },
    _addLinkClick: function (e) {
        this.geometryLinks.push({});
        this.validation.geometryLinksRequired = false;
        this.render();
    },
    _removeLinkClick: function (e) {
        var linkIndex = $(e.currentTarget).data('link-index');
        this.geometryLinks.splice(linkIndex, 1);
        if (this.geometryLinks.length == 0) {
            this.validation.geometryLinksRequired = true;
        }
        this.render();
    },
    validate: function () {
        this.validation.datasetNameRequired = !this.datasetName;
        this.validation.valueFieldRequired = !this.valueField;
        this.validation.geometryLinkTargetRequired = (!this.geometryLinkTarget && this.geometryFieldType == 'link');
        this.validation.geometryBuiltInFieldRequired = (!this.geometryBuiltInField && this.geometryFieldType == 'built-in');
        this.validation.geometryLinksRequired = (!this.geometryLinks.length && this.geometryLinkTarget && this.geometryFieldType == 'link');
        this.validation.geometryLinksInvalid = false;
        if (this.geometryFieldType == 'link' && this.geometryLinkTarget && this.geometryLinks) {
            this.validation.geometryLinksInvalid =
                !_.some(this.geometryLinks, function (link) {
                    return link.operator == '=';
                })
                || _.some(this.geometryLinks, function (link) {
                    return !link.field || !link.operator || !link.value;
                })
        }
        this.render();
        return !_.some(_.values(this.validation), function (value) { return value });
    }
});
