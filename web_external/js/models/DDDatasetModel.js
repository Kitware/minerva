minerva.models.DDDatasetModel = minerva.models.TerraDatasetModel.extend({
    initialize: function (options) {
        if (!_.has(options, 'targetLocation') ||
            !_.has(options, 'comparisonLocations') ||
            !_.has(options, 'eventDate')) {
            throw "Dd Analysis must have target loc, comp locs, and date.";
        } else if (!_.isArray(options.comparisonLocations)) {
            throw "comparisonLocations must be an array.";
        } else if (!_.isDate(options.eventDate)) {
            throw "eventDate must be of type Date";
        }

        // @todo lazy load this instead?
        this.fetchDiffInDiffData();

        this.set('ddDisplayData', this.deepClone(this.get('ddData')));
    },

    _setData: function(data) {
        // Filter dates with 0 as their data points, and
        // convert all date strings to date objects
        this.set('ddData', {
            stats: data.diff_in_diff,
            data: _.map(_.filter(data.data, function(datum) {
                return !(datum.Comparison === 0 &&
                         datum.Target === 0);
            }), function(datum) {
                datum.date = new Date(datum.date);
                return datum;
            })
        });
    },

    getEventDateAsStr: function() {
        return this.get('eventDate').getUTCFullYear() + '-' +
            ('0' + (this.get('eventDate').getUTCMonth()+1)).slice(-2) + '-' +
            ('0' + this.get('eventDate').getUTCDate()).slice(-2);
    },

    groupedBy: function(type, data) {
        var grouper = this._grouper(type);
        data = data || this.deepClone(this.get('ddData'));

        data.data = _.map(d3.nest()
                          .key(grouper.keyFunc)
                          .rollup(function(d) {
                              return {
                                  Comparison: d3.sum(d, function(g) {
                                      return g.Comparison;
                                  }),
                                  Target: d3.sum(d, function(g) {
                                      return g.Target;
                                  })
                              };
                          })
                          .entries(data.data), function(datum) {
                              return {
                                  date: grouper.dateToKeyFunc(datum.key),
                                  Target: datum.values.Target,
                                  Comparison: datum.values.Comparison
                              };
                          });

        this.set('ddDisplayData', data);
    },

    fetchDiffInDiffData: function() {
        var _this = this;

        $.ajax({
            url: 'https://tempus-demo.ngrok.com/api/diffindiff',
            data: {
                target: _this.get('targetLocation'),
                comparisons: _this.get('comparisonLocations').join('|'),
                date: _this.getEventDateAsStr()
            },
            async: false,
            dataType: 'json',
            success: _.bind(_this._setData, _this)
        });
    }
});
