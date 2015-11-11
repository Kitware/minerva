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
        var _this = this;
        this.$el.html(minerva.templates.terraSimilarityPlot({
            msa: this.model.get('location'),
            similarMsas: this.model.get('similarModels')
        }));

        var data = {
                xs: {
                    'raw': 'x1',
                    'Similar MSAs': 'x2'
                },
                columns: [
                    ['x1'].concat(_.pluck(this.model.get('tsDisplayData')[0].data, 'date')),
                    ['x2'].concat(_.pluck(this.model.get('tsDisplayData')[1].data, 'date')),
                    ['raw'].concat(_.pluck(this.model.get('tsDisplayData')[0].data, 'value')),
                    ['Similar MSAs'].concat(_.pluck(this.model.get('tsDisplayData')[1].data, 'value'))
                ]
        };

        data.xs[this.model.get('location')] = data.xs.raw;
        data.columns[2][0] = this.model.get('location');
        delete data.xs.raw;

        c3.generate({
            size: {
                width: 535,
                height: 300
            },
            bindto: '#terra-sim-plot',
            data: data,
            axis: {
                x: {
                    tick: {
                        culling: {
                            max: 8
                        },
                        rotate: -50,
                        format: function(i) {
                            return moment(i).format('MMM YYYY');
                        }
                    },
                    height: 60
                }
            },
            legend: {
                item: {
                    onmouseover: function (d) {
                        if (d === 'Similar') {
                            console.log(_this.model.get('similarModels').join(', '));
                        }
                    }
                }
            }
        });

      $('.graphsPanel').show();
      if ($('.graphsPanel > .panelTitle').hasClass('collapsed')) {
        $('.graphsPanel > .panelTitle').click();
      }


    }
});
