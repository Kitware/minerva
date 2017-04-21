minerva.views.PostgresWidget = minerva.View.extend({
    events: {
        'change #m-state-name': 'saveDropdownState',
        'change #m-production-category': 'saveDropdownState',
        'change #m-category': 'saveDropdownState',
        'change #m-sub-category': 'saveDropdownState',
        'change #m-data-derivation': 'saveDropdownState',
        'click #m-refresh-dropdowns': 'refreshDropdowns',
        'click #m-get-geojson': 'getGeojson'
    },
    formToTable: {
        'm-state-name': 'NAME',
        'm-production-category': 'PRODUCTION_CATEGORY',
        'm-category': 'CATEGORY',
        'm-sub-category': 'SUB_CATEGORY',
        'm-data-derivation': 'DATA_DERIVATION'
    },
    initialize: function () {
        var Query = Backbone.Model.extend({
            defaults: this._getDefaults
        });
        this.queryParams = new Query();
    },
    getDefaults: function () {
        return _.object(_.values(this.formToTable),
                        new Array(_.size(this.formToTable) + 1).join(''));
    },
    refreshDropdowns: function () {
        this.initialize();
        this.filters = {};
        this.render();
    },
    saveDropdownState: function (event) {
        var that = this;
        var id = event.currentTarget.id;
        this.queryParams.set(this.formToTable[id], this.$('#' + id).val());
        var filters = {};
        _.each(_.values(this.formToTable), function (value) {
            that._checkFilter(filters, value, that.queryParams.get(value));
        });
        this.filters = filters;
        this.render();
    },
    _configureFilter: function (value) {
        // Passing a str representation of a list
        // Like '["foo", "bar"]'
        return '[' + '"' + value + '"' + ']';
    },
    _checkFilter: function (filters, key, value) {
        if (value) {
            filters[key] = this._configureFilter(value);
        }
    },
    getGeojson: function () {
        var that = this;
        if (this.filters) {
            girder.restRequest({
                path: '/minerva_postgres_geojson/geojson',
                type: 'GET',
                error: null,
                data: that.filters
            }).done(function (data) {
                console.log(data);
            });
        } else {
            alert('Bad Selection');
        }
    },
    render: function () {
        var that = this;
        girder.restRequest({
            path: '/minerva_postgres_geojson',
            type: 'GET',
            error: null,
            data: that.filters
        }).done(function (data) {
            var modal = that.$el.html(minerva.templates.postgresWidget(data)).girderModal(that);
            modal.trigger($.Event('ready.girder.modal', {relatedTarget: modal}));
            return that;
        });
    }
});
