minerva.models.TSDatasetModel = minerva.models.TerraDatasetModel.extend({
    initialize: function (options) {
        this.set('location', options.location);
        this.set('covars', options.covars);

        this.fetchTimeSeriesData();

        this.set('tsDisplayData', this.deepClone(this.get('tsData')));
    },

    // Gets the min/max date from the displayed time series data
    dateExtent: function() {
        var minDate, maxDate;

        _.each(this.get('tsDisplayData'), function(dataset) {
            _.each(dataset.data, function(datum) {
                if (_.isUndefined(minDate) || datum.date < minDate) {
                    minDate = datum.date;
                }

                if (_.isUndefined(maxDate) || datum.date > maxDate) {
                    maxDate = datum.date;
                }
            });
        });

        return [minDate, maxDate];
    },

    groupedBy: function(type, datasets) {
        var grouper = this._grouper(type);
        datasets = datasets || this.deepClone(this.get('tsData'));

        datasets = _.map(datasets, function(dataset) {
            dataset.data = _.map(d3.nest()
                                 .key(grouper.keyFunc)
                                 .rollup(function(d) {
                                     return d3.sum(d, function(g) {
                                         return g.value;
                                     });
                                 }).entries(dataset.data),
                                 function(datum) {
                                     return {
                                         date: grouper.dateToKeyFunc(datum.key),
                                         value: datum.values
                                     };
                                 });
            return dataset;
        });

        this.set('tsDisplayData', datasets);
    },

    // @todo shouldn't groupby be optional?
    spanningDate: function(start, end, groupBy) {
        var datasets = this.deepClone(this.get('tsData'));

        datasets = _.map(datasets, function(dataset) {
            dataset.data = _.filter(dataset.data, function(datum) {
                return start.toDate() <= datum.date && datum.date <= end.toDate();
            });

            return dataset;
        });

        // groupedBy takes datasets (or operates on tsData)
        // Since grouping has to happen after filtering by time, pass it our now
        // filtered data
        this.set('tsDisplayData', datasets);
        this.groupedBy(groupBy, datasets);
    },

    fetchTimeSeriesData: function() {
        var _this = this;

        $.ajax({
            url: 'https://tempus-demo.ngrok.com/api/series',
            data: {
                table: 'escort_ads',
                sort: 1,
                response_col: 'price_per_hour',
                group_col: 'msaname',
                group: _this.get('location')
            },
            async: false,
            dataType: 'json',
            success: function(data) {
                _this.set('tsData', [{
                    label: 'raw',
                    data: data.result
                }]);

                $.ajax({
                    url: 'https://tempus-demo.ngrok.com/api/comparison',
                    data: {
                        table: 'escort_ads',
                        sort: 1,
                        response_col: 'price_per_hour',
                        group_col: 'msaname',
                        group: _this.get('location'),
                        covs: _this.get('covars')
                    },
                    async: false,
                    dataType: 'json',
                    success: function(compData) {
                        var similarModels = [],
                            tsData = _this.get('tsData');

                        compData.groups = _.map(compData.groups, function(s) {
                            return s.replace(/ MSA$/, '');
                        });

                        similarModels = compData.groups;

                        tsData.push({
                            label: 'comp',
                            groups: compData.groups,
                            data: compData.result
                        });

                        _this.set('tsData', tsData);
                        _this.set('similarModels', similarModels);
                    }
                });
            }
        });

        // Postprocess data
        var dateParser = d3.time.format("%Y-%m-%d %H:%M:%S").parse;
        _.each(this.get('tsData'), function(dataset) {
            dataset.data = _.map(dataset.data, function(datum) {
                datum[0] = dateParser(datum[0]);

                return {
                    date: datum[0],
                    value: datum[1]
                };
            });
        });
    }
});
