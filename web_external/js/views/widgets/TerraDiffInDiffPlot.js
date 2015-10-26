minerva.views.TerraDiffInDiffPlot = minerva.View.extend({

    events: {
        'change #dd-analysis-grouping': 'changeGrouping'
    },

    initialize: function (options) {
        this.model = options.model;
        this.groupedBy = 'yearly';
        this.model.groupedBy(this.groupedBy);
        this.model.on('change:ddDisplayData', this.render, this);

        this.render();
    },

    changeGrouping: function (event) {
        this.groupedBy = $(event.currentTarget).find('input:checked').val();
        this.model.groupedBy(this.groupedBy);
    },

    render: function () {
        var data = this.model.get('ddDisplayData');

        this.$el.html(minerva.templates.terraDiffInDiffPlot({
            groupedBy: this.groupedBy,
            msa: this.model.get('location'),
            similarMsas: this.model.get('similarModels')
        }));

        var chartSize =  {
            height: 330,
            width: 600
        };

        var chart = c3.generate({
            size: chartSize,
            data: {
                type: 'bar',
                json: data.data,
                keys: {
                    x: 'date',
                    value: ['Target', 'Comparison']
                },
                colors: {
                    Target: '#d62728',
                    Comparison: '#ff7f0e'
                }
            },
            axis: {
                x: {
                    type: 'categories',
                    tick: {
                        culling: {
                            max: 10
                        },
                        rotate: -60,
                        multiline: false,
                        fit: true,
                        format: function(i) {
                            if (data.groupedBy === 'yearly') {
                                return d3.time.format('%Y')(data.data[i].date);
                            } else if (data.groupedBy === 'monthly') {
                                return d3.time.format('%b %Y')(data.data[i].date);
                            } else if (data.groupedBy === 'daily') {
                                return d3.time.format('%d %b %Y')(data.data[i].date);
                            }
                        }
                    },
                    height: 50
                }
            },
            bar: {
                width: {
                    ratio: 0.5
                }
            },
            bindto: '#dd-analysis-overlay > .plot',
            subchart: {
                show: true
            },
            zoom: {
                enabled: true
            },
            legend: {
                show: false
            },
            grid: {
                x: {
                    lines: [{
                        value: indexOfFirstDataPointIncludingOrAfterEventDate(),
                        text: 'Event'
                    }]
                }
            }
        });

        var svg = d3.select('#dd-analysis-overlay > .plot > svg');

        // Legend
        var legend = svg.selectAll(".legend")
                .data([{variable: 'b',
                        value: data.stats.b[0]},
                       {variable: 'se',
                        value: data.stats.se[0]},
                       {variable: 'p',
                        value: data.stats.p[0]}])
                .enter().append("g")
                .attr("class", "legend")
                .attr("transform", function(d, i) { return "translate(0," + i * 20 + ")"; });


        legend.append("text")
            .attr("x", chartSize.width - 5)
            .attr("y", 9)
            .attr("dy", ".35em")
            .style("text-anchor", "end")
            .text(function(d) { return d.variable + " = " + d.value.toString(); })
            .style("text-anchor", "end");

        // Event indicator
        // @todo This is another consequence of using an ordinal scale, instead
        // of saying "place a line where this date occurs", we have to find the first
        // point that is applicable to drawing a line. Meaning if it's grouped monthly
        // and the event date is Jan 10th.. we need to place the line at the Jan month marker.
        function indexOfFirstDataPointIncludingOrAfterEventDate() {
            var thisDate;
            var eventDate = new Date(data.eventDate);
            var ret = -1;

            _.each(data.data, function(dataPoint, index) {
                thisDate = dataPoint.date;

                if (data.groupedBy === 'daily') {
                    if (thisDate.getUTCDate() === eventDate.getUTCDate()) {
                        ret = index;
                        return false;
                    }
                } else if (data.groupedBy === 'monthly') {
                    // This is a data point in the same month/year
                    if ((thisDate.getUTCMonth() == eventDate.getUTCMonth() &&
                         thisDate.getUTCFullYear() == eventDate.getUTCFullYear()) ||
                        // Or we're past it - so start here
                        thisDate > eventDate) {
                        ret = index;
                        return false; // break out of loop
                    }
                } else if (data.groupedBy === 'yearly') {
                    if ((thisDate.getUTCFullYear() >= eventDate.getUTCFullYear())) {
                        ret = index;
                        return false;
                    }
                }
            });

            return ret;
        }
    }

});
