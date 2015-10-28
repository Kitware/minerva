minerva.views.AnimationControlsWidget = minerva.View.extend({

    events: {
        'click #ga-play': function (e) {
            e.preventDefault();

            if (_.isEqual(this.mapAnimator.getAnimationOptions(), {})) {
                $('#ga-anim-update').removeClass('btn-primary');
                if ($('#ga-play').val() === 'stop') {
                    $('#ga-play').val('play');
                }
                this.updateView(true, 'anim');
            } else {
                this.animationAction('playpause');
            }

            if (this.firstRender) {
                this.firstRender = false;
                this.mapAnimator.showMap('all');
            }
        },

        'click #ga-anim-stop': function () {
            this.animationAction('stop');
        },

        'click #ga-anim-step-back': function () {
            this.animationAction('stepback');
        },
        'click #ga-anim-step': function () {
            this.animationAction('step');
        }
    },

    updateAnimValues: function (updateNav) {
        var params = {}; // @dl this.updateSection('anim', updateNav);
        params.statusElem = '#ga-cycle-anim';
        params.sliderElem = '#ga-step-slider';
        return params;
    },

    updateView: function (updateNav, updateSection) {
        var results = {}, params;
        if (updateSection && $.type(updateSection) === 'string') {
            var sections = {};
            sections[updateSection] = true;
            updateSection = sections;
        }

        if (!updateSection || updateSection.anim) {
            results.anim = this.updateAnimValues(updateNav);
        }

        if (results.anim) {
            this.mapAnimator.updateMapAnimation(results.anim);
        }
    },

    animationAction: function (action, stepnum) {
        var playState = action, step;

        if (stepnum !== undefined) {
            step = this.mapAnimator.animationAction('jump', stepnum);
            playState = $('#ga-play').val();
            if ($('#ga-play').val() !== 'play') {
                if (step !== undefined) {
                    playState = 'step' + step;
                }
            }
            action = 'none';
        }
        switch (action) {
        case 'playpause':
            if ($('#ga-play').val() !== 'play') {
                playState = 'play';
                this.mapAnimator.animationAction('play');
                break;
            }
            /* intentionally fall through to 'step' */
            /* jshint -W086 */
        case 'step':
            step = this.mapAnimator.animationAction('step');
            if (step !== undefined) {
                playState = 'step' + step;
            }
            break;
        case 'stepback':
            step = this.mapAnimator.animationAction('stepback');
            if (step !== undefined) {
                playState = 'step' + step;
            }
            break;
        case 'stop':
            $('#ga-cycle-anim').text('Full Data');
            this.mapAnimator.animationAction('stop');
            break;
        }
        $('#ga-play').val(playState);
    },

    initialize: function (options) {
        this.firstRender = true;

        // The map is already rendered by the time this widget is initialized
        this.mapAnimator = new minerva.models.MapAnimatorModel();
        this.render();
    },

    render: function () {
        this.$el.html(minerva.templates.animationControlsWidget({

        }));

        $('#ga-step-slider').slider({
                focus: true
        }).slider('disable');
    }
});
