minerva.views.PostgresWidget = minerva.View.extend({
    events: {
        'click #m-get-geojson': 'getGeojson',
        'change #m-postgres-source': 'sourceChanged'
    },
    formToTable: {
    },
    initialize: function () {
        this.$queryBuilder = null;

        this.filter = null;

        var Query = Backbone.Model.extend({
            defaults: this._getDefaults
        });
        this.queryParams = new Query();

        this.sources = [];
        this.selectedSource = null;

        this.getSources();
    },
    getGeojson: function () {
        var that = this;
        if (this.filters) {
            girder.restRequest({
                path: '/minerva_postgres_geojson/geojson',
                type: 'GET',
                error: null,
                data: that.filters
            }).done(function (datasetId) {
                this.trigger('m:dataset_created', datasetId);
                that.$el.modal('hide');
            }.bind(this));
        } else {
            alert('Bad Selection');
        }
    },
    render: function () {
        if (!this.modalOpenned) {
            var el = this.$el.html(minerva.templates.postgresWidget(this));
            this.modalOpenned = true;
            var modal = el.girderModal(this);

            this.$queryBuilder = this.$('.m-query-builder').queryBuilder({
                filters: [{id:'a',type:'string'}],
                operators: ['equal', 'not_equal', 'less', 'less_or_equal', 'greater', 'greater_or_equal', 'between', 'not_between', 'begins_with', 'not_begins_with', 'contains', 'not_contains', 'ends_with', 'not_ends_with', 'is_empty', 'is_not_empty', 'is_null', 'is_not_null'],
                icons: {
                    add_group: 'icon-plus-squared',
                    add_rule: 'icon-plus',
                    remove_group: 'icon-cancel',
                    remove_rule: 'icon-cancel',
                    error: 'icon-cancel-circled2'
                }
            });
            this.$queryBuilder.hide();

            modal.trigger($.Event('ready.girder.modal', { relatedTarget: modal }));
        }
        else {
            this.$queryBuilder.detach();
            this.$el.html(minerva.templates.postgresWidget2(this));
            this.$('.m-query-builder').replaceWith(this.$queryBuilder);
            if (this.filter) {
                this.$queryBuilder.show();
            }
            else {
                this.$queryBuilder.hide();
            }
        }
    },
    getSources: function () {
        new Promise(function (resolve, reject) {
            setTimeout(function () {
                resolve();
            }, 1000);
        })
            .then(function () {
                this.sources = minerva.views.PostgresMockData.sources;
                this.render();
            }.bind(this));
    },
    sourceChanged: function (e) {
        var source = $(e.target).val();
        this.selectedSource = source;
        this.getFilter(source);
    },
    getFilter: function (sourceName) {
        new Promise(function (resolve, reject) {
            if (sourceName) {
                setTimeout(function () {
                    resolve(minerva.views.PostgresMockData.filters[sourceName]);
                })
            }
            else {
                resolve(null);
            }
        })
            .then(function (filter) {
                console.log(filter);
                this.filter = filter;
                this.$queryBuilder[0].queryBuilder.reset();
                if (filter) {
                    this.$queryBuilder[0].queryBuilder.setFilters(filter);
                }
                this.render();
            }.bind(this))
    }
});
