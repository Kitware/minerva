minerva.models.TerraDatasetModel = minerva.models.DatasetModel.extend({
    deepClone: function (value) {
        var clonedValue = JSON.parse(JSON.stringify(value));

        _.each(clonedValue, function(val) {
            if (_.has(val, 'data')) {
                _.each(val.data, function(datum) {
                    if (_.has(datum, 'date')) {
                        datum.date = new Date(datum.date);
                    }
                });
            }
        });

        if (_.has(clonedValue, 'data')) {
            _.each(clonedValue.data, function(datum) {
                if (_.has(datum, 'date')) {
                    datum.date = new Date(datum.date);
                }
            });
        }

        return clonedValue;
    },

    _grouper: function(groupBy) {
        // Defaults to group by month
        var grouper = {
            keyFunc: function(d) {
                return new Date(d.date.getUTCFullYear(), d.date.getUTCMonth());
            },
            dateToKeyFunc: function(d) {
                return new Date(d);
            }
        };

        if (groupBy === 'yearly') {
            grouper.keyFunc = function(d) {
                return d.date.getUTCFullYear();
            };

            grouper.dateToKeyFunc = function(d) {
                return new Date(d, 0);
            };
        } else if (groupBy === 'weekly') {
            grouper.keyFunc = function(d) {
                return [d.date.getUTCFullYear(), d3.time.format("%U")(d.date)];
            };

            grouper.dateToKeyFunc = function(d) {
                // d3 can not parse the week number without the day of week,
                // so we always pass 0 as the day of week.
                // see https://github.com/mbostock/d3/issues/1914
                d += ",0";
                return d3.time.format("%Y,%U,%w").parse(d);
            };
        } else if (groupBy === 'daily') {
            grouper.keyFunc = function(d) {
                return new Date(d.date.getUTCFullYear(), d.date.getUTCMonth(), d.date.getUTCDate());
            };

            grouper.dateToKeyFunc = function(d) {
                return new Date(d);
            };
        }

        return grouper;
    }
});
