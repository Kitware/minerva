minerva.views.TerraSimilarityPlot = minerva.View.extend({

    events: {
        'change #ts-analysis-grouping': 'changeGrouping'
    },

    initialize: function (options) {
        this.model = options.model;
        this.groupedBy = 'monthly';
        this.model.groupedBy(this.groupedBy);
        this.model.on('change:tsDisplayData', this.renderPlot, this);

        this.render();
    },

    changeGrouping: function (event) {
        this.groupedBy = $(event.currentTarget).find('input:checked').val();
        this.model.groupedBy(this.groupedBy);
    },

    render: function () {
        this.$el.html(minerva.templates.terraSimilarityPlot({
            msa: this.model.get('location'),
            similarMsas: this.model.get('similarModels')
        }));
        this.renderPlot();
    },

    renderPlot: function () {
        var _this = this;

        if (!_.isEmpty(this.model.get('tsDisplayData'))) {
            // Setup group picker, time range picker
            var dateExtent = this.model.dateExtent();
            this.dateRangePicker = $('#ts-analysis-overlay input[name="daterangepicker"]').daterangepicker({
                startDate: dateExtent[0],
                endDate: dateExtent[1]
            }, function(start, end) {
                _this.model.spanningDate(start, end, _this.groupedBy);
            });

            // Draw (or redraw) graph
            if (_.isFunction(this.redraw)) {
                this.redraw(this.model.get('tsDisplayData'));
            } else {
                // Draw the graph with the data
                var opts = $.extend(
                    {
                        // @todo more selector nonsense
                        selector: '#ts-analysis-overlay .plot',
                        x: 'date',
                        y: 'value'},
                    {
                        datasets: this.model.get('tsDisplayData')
                    });

                this.redraw = this.d3TimeSeries(opts);
            }

            this.$el.show();
        }
    },

    d3TimeSeries: function (ts) {
        var data = _.reduce(ts.datasets, function(arr, dataset) {
            return arr.concat(dataset.data);
        }, []);

        var margin = {top: 20, right: 20, bottom: 30, left: 50},
            width = 600 - margin.left - margin.right,
            height = 330 - margin.top - margin.bottom;

        var x = d3.time.scale()
                .range([0, width]);

        var y = d3.scale.linear()
                .range([height, 0]);

        var xAxis = d3.svg.axis()
                .scale(x)
                .ticks(8)
                .orient("bottom");

        var yAxis = d3.svg.axis()
                .scale(y)
                .orient("left");

        var line = d3.svg.line()
                .interpolate("monotone")
                .x(function(d) { return x(d[ts.x]); })
                .y(function(d) { return y(d[ts.y]); });

        var svg = d3.select(ts.selector).append("svg")
                .attr("width", width + margin.left + margin.right)
                .attr("height", height + margin.top + margin.bottom)
                .append("g")
                .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

        x.domain(d3.extent(data, function(datum) { return datum[ts.x]; }));
        y.domain([0, d3.max(data, function(datum) { return datum[ts.y]; })]);

        // Draw axes
        svg.append("g")
            .attr("class", "x axis")
            .attr("transform", "translate(0," + height + ")")
            .call(xAxis);

        svg.append("g")
            .attr("class", "y axis")
            .call(yAxis)
            .append("text")
            .attr("transform", "rotate(-90)")
            .attr("y", 6)
            .attr("dy", ".71em")
            .style("text-anchor", "end");

        function draw(datasets) {
            // Update axes for both new lines
            data = _.reduce(datasets, function(arr, dataset) {
                return arr.concat(dataset.data);
            }, []);

            x.domain(d3.extent(data, function(datum) { return datum[ts.x]; }));
            y.domain([0, d3.max(data, function(datum) { return datum[ts.y]; })]);

            svg.selectAll("g .x.axis")
                .call(xAxis);

            svg.selectAll("g .y.axis")
                .call(yAxis);

            // Remove old lines/points, create new lines/points
            _.each(datasets, function(dataset) {
                svg.selectAll(".line." + dataset.label).remove();
                svg.selectAll(".point." + dataset.label).remove();

                var path = svg.selectAll(".line ." + dataset.label)
                        .data([dataset.data], function(d) { return d; });

                path.enter()
                    .append("path")
                    .attr("class", "line " + dataset.label)
                    .attr("d", line);

                svg.selectAll("point-" + dataset.label)
                    .data(dataset.data)
                    .enter().append("svg:circle")
                    .attr("class", "point " + dataset.label)
                    .attr("cx", function(d) { return x(d[ts.x]); })
                    .attr("cy", function(d) { return y(d[ts.y]); })
                    .attr("r", 3);
            });
        }

        draw(ts.datasets);

        return draw;
    }
});
