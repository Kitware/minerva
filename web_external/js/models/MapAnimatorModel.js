minerva.models.MapAnimatorModel = minerva.models.MinervaModel.extend({

    defaults: {
        startDate: '2012-01-01',
        endDate: '2016-01-01'
    },

    initialize: function (settings) {
        this.set('map', window.minerva_map);
        this.set('geomap', this.get('map').map);

        this.animationData = this.animationData || {};
        this.animationData.statusElem = '#ga-cycle-anim';
        this.animationData.sliderElem = '#ga-step-slider';
    },

    getAnimationOptions: function () {
        // Return a copy of animationOptions
        return $.extend({}, this.animationOptions);
    },

    hasAnyData: function () {
        // @dl this should be defined elsewhere
        this.layers = [this.get('map').esFeatureLayer];

        // @dl hardcode
        var features = _.flatten(_.invoke(this.layers, 'features'));

        var anyData = _.some(features, function (feature) {
            return feature.data();
        });

        return anyData;
    },

    /* Get the actual cycle date range based on available data.
     *
     * @param defaultStart: the fall-back moment to use for the start if no
     *                      date range is specified.
     * @param noDefaultRange: if true, and no ranges were specified, don't use
     *                        the default range.
     * @return: an object with start and end moments.
     */
    getCycleDateRange: function (defaultStart, noDefaultRange) {
        // @dl hardcode
        var m_cycleDateRange = {
            start: 1193696100000,
            end: 1444801320000
        };

        defaultStart = defaultStart || moment.utc(this.defaults.startDate);
        var start = moment(defaultStart),
            end = null;
        if (m_cycleDateRange || !noDefaultRange) {
            start = moment.utc(this.defaults.startDate);
            end = moment.utc(this.defaults.endDate);
        }
        if (m_cycleDateRange) {
            if (m_cycleDateRange.date_min) {
                start = moment.utc(m_cycleDateRange.date_min);
            }
            if (m_cycleDateRange.date_max) {
                end = moment.utc(m_cycleDateRange.date_max);
            }
        }
        if (!end) {
            start = null;
            var dateRange;
            _.each(this.layers, function (layer) {
                if (layer.getDateRange) {
                    dateRange = layer.getDateRange();
                    if (dateRange && dateRange.start && dateRange.end) {
                        if (!start || dateRange.start < start) {
                            start = dateRange.start;
                        }
                        if (!end || dateRange.end > end) {
                            end = dateRange.end;
                        }
                    }
                }
            });
            if (!start) {
                start = defaultStart;
            }
            start = moment.utc(start).startOf('day');
            if (end) {
                end = moment.utc(end).endOf('day').add(1, 'ms');
            } else {
                end = moment.utc(this.defaults.endDate);
            }
        }
        start = moment.utc(start);
        return {start: start, end: end};
    },

    /* Calculate everything necessary to animate the map in an efficient
     * manner.
     *
     * @param options: if present, override the internal options set with
     *                 updateMapAnimation.
     */
    prepareAnimation: function (options) {
        this.animationOptions = this.animationOptions || {};
        this.animationData = this.animationData || {};

        var i, cycle, start, range, end, duration,
            steps, substeps, numBins, group;
        var units = {
            none: {format: 'ddd MMM D HH:mm'},
            year: {format: 'ddd MMM D HH:mm'},
            month: {format: 'DD HH:mm'},
            week: {
                format: 'ddd HH:mm',
                start: moment.utc(this.defaults.startDate).day(0)
            },
            day: {format: 'HH:mm'},
            hour: {format: 'mm:ss'}
        };
        options = options || this.animationOptions;
        this.animationOptions = options;
        this.animationData = null;
        if (!this.hasAnyData() || options.playState === 'stop') {
            return;
        }
        if (!options['cycle-steps'] && !options['cycle-group']) {
            return;
        }
        cycle = moment.normalizeUnits(options.cycle);
        if (!units[cycle]) {
            cycle = 'none';
        }
        start = units[cycle].start || moment.utc(this.defaults.startDate);
        range = moment.duration(1, cycle);
        if (cycle === 'none') {
            var curRange = this.getCycleDateRange(start, true);
            start = curRange.start;
            end = curRange.end;

            // @dl graph range code was here?

            range = moment.duration(moment.utc(end) - moment.utc(start));
        }
        steps = parseInt(options['cycle-steps'] || 1);
        if (steps <= 1 && options['cycle-group']) {
            var roundTo = (options['cycle-group'] === '3-hour' ? 'day' :
                           options['cycle-group']);
            group = (options['cycle-group'] === '3-hour' ?
                     moment.duration(3, 'hours') :
                     moment.duration(1, options['cycle-group']));
            /* Start and end on group boundaries */
            end = moment.utc(start + range);
            start = start.startOf(roundTo);
            end = end.subtract(1, 'ms').endOf(roundTo).add(1, 'ms');
            range = moment.duration(end - start);
            steps = Math.ceil(range / group);
        }
        if (options['cycle-duration']) {
            var parts = ('' + options['cycle-duration']).split('-');
            if (parts.length === 1) {
                duration = ($.isNumeric(parts[0]) ? parseInt(parts[0]) :
                            0 + moment.duration(1, parts[0]));
            } else {
                duration = 0 + moment.duration(parseFloat(parts[0]), parts[1]);
            }
        } else {
            duration = steps * (options['cycle-steptime'] || 1000);
        }
        if (options['cycle-framerate']) {
            if ($.isNumeric(options['cycle-framerate']) &&
                parseFloat(options['cycle-framerate']) > 0) {
                /* Honor the fps, but don't step through the data faster than
                 * 1 minute intervals, and always show an integer number of
                 * frames per major step */
                var fpms = parseFloat(options['cycle-framerate']) / 1000;
                substeps = Math.max(1, Math.floor(Math.min(
                    duration * fpms / steps,
                    range / steps / moment.duration(1, 'minute'))));
            } else {
                substeps = 1;
            }
        } else {
            substeps = parseInt(options['cycle-substeps'] || 1);
        }
        numBins = steps * substeps;
        if (steps <= 1 || numBins <= 1 || duration <= 0) {
            return;
        }

        var params = {
            numBins: numBins,
            steps: steps,
            substeps: substeps,
            bins: [],
            opacity: options.opacity,
            timestep: duration / numBins,
            loops: options.loops,
            statusElem: '#ga-cycle-anim',
            sliderElem: '#ga-step-slider',
            playState: options.playState || 'play',
            layers: {},
            map: this.get('map')
        };
        var binWidth = moment.duration(Math.floor(
            (range.asMilliseconds() + numBins - 1) / numBins));
        var binStart = start;
        for (i = 0; i < numBins; i += 1) {
            var binEnd = moment.utc(binStart + binWidth);
            var bin = {
                index: i,
                start: binStart,
                end: binEnd,
                startDesc: binStart.utcOffset(0).format(units[cycle].format),
                endDesc: binEnd.utcOffset(0).format(units[cycle].format)
            };
            params.bins.push(bin);
            binStart = binEnd;
        }
        _.each(this.layers, function (layer) {
            if (layer.binForAnimation) {
                layer.binForAnimation(params, 0 + start, 0 + range,
                                      0 + binWidth);
            }
        });
        this.animationData = params;
    },

    /* Start an animation.  See updateMapAnimation for option details.
     *
     * @param options: a dictionary of options.  If unset, use the last
     *                 options passed to updateMapAnimation.
     * @param startStep: step to start on within the animation.
     */
    animate: function (options, startStep) {
        if (this.animTimer) {
            window.clearTimeout(this.animTimer);
            this.animTimer = null;
        }

        if (options || !this.animationData) {
            this.prepareAnimation(options);
        }

        if (!this.animationData) {
            return;
        }

        if (startStep === undefined && this.animationData.playState &&
            this.animationData.playState.substr(0, 4) === 'step') {
            startStep = parseInt(this.animationData.playState.substr(4));
        }

        this.animationData.step = (((startStep || 0) +
                                    this.animationData.numBins - 1) % this.animationData.numBins);
        this.animationData.timestep = this.animationData.timestep || 1000;
        this.animationData.startTime = this.animationData.nextStepTime =
            new Date().getTime();


        this.animateFrame();
    },

    getStepDescription: function (step) {
        if (!this.animationData || this.animationData.playState === 'stop') {
            return 'Stopped';
        }

        if (_.isUndefined(step)) {
            step = this.animationData.step;
        }

        step = step % this.animationData.numBins;
        var desc = this.animationData.bins[step].startDesc + ' - ' +
                this.animationData.bins[(step + this.animationData.substeps - 1) %
                                        this.animationData.numBins].endDesc;
        return desc;
    },

    /* Draw a frame of an animation.  If the current playState is 'play', set
     * a timer to play the next frame.
     */
    animateFrame: function () {
        var view = this,
            options = this.animationData;

        if (!options || !this.hasAnyData()) {
            return;
        }
        options.step = (options.step + 1) % options.numBins;
        options.renderedSteps = (options.renderedSteps || 0) + 1;
        _.each(this.layers, function (layer) {
            if (layer.animateFrame) {
                layer.animateFrame(options);
            }
        });
        this.get('geomap').draw();

        var desc = this.getStepDescription(options.step);
        $(options.statusElem).text(desc);
        $(options.sliderElem).slider('enable').slider(
            'setAttribute', 'max', options.numBins - 1).slider(
                'setValue', options.step);

        $(options.sliderElem).show();

        var curTime = new Date().getTime();
        var frameTime = parseInt(curTime - options.nextStepTime);
        options.totalFrameTime = (options.totalFrameTime || 0) + frameTime;
        options.nextStepTime += options.timestep;
        var delay = parseInt(options.nextStepTime - curTime);
        // @dl removed logging level
        if (true) {
            console.log([delay, frameTime, options.step]);
        }
        while (delay < 0 && options.playState === 'play') {
            /* We have to skip some frames */
            options.step = (options.step + 1) % options.numBins;
            options.nextStepTime += options.timestep;
            delay = parseInt(options.nextStepTime - curTime);
            options.skippedSteps = (options.skippedSteps || 0) + 1;
        }
        if (options.loops && options.renderedSteps >= options.loops *
            options.numBins || options.playState !== 'play') {
            return;
        }
        this.animTimer = window.setTimeout(
            function () {
                view.animateFrame();
            }, delay <= 0 ? 1 : delay);
    },

    updateMapParams: function (datakey, params, update) {
        var startTime = new Date().getTime();
        params = params || {};
        params.opacity = params.opacity || 0.05;
        var origParams = {};

        if (update === false) {
            return {};
        }

        var animStartStep;
        var changed = true;
        _.each(this.layers, function (layer, layerkey) {
            if (datakey === 'all' || datakey === layerkey) {
                changed = changed || layer.paramsChanged(
                    params, origParams, update);
            }
        });
        if (changed) {
            /* clear animation preparation, but don't clear current step. */
            if (this.animationData && this.animationData.playState) {
                animStartStep = this.animationData.step;
            }
            if (this.animationData && this.animationData.playState &&
                this.animationOptions && this.animationOptions.playState) {
                this.animationOptions.playState = this.animationData.playState;
            }
            this.animationData = null;
            _.each(this.layers, function (layer, layerkey) {
                //if (datakey === 'all' || datakey === layerkey) {
                layer.updateMapParams(params);
                //}
            });
        }
        var loadTime = new Date().getTime();
        this.get('geomap').draw();
        var drawTime = new Date().getTime();
        if (changed) {
            this.animate(undefined, animStartStep);
        }
        var animTime = new Date().getTime();
        if (true) {
            console.log(
                'updateMapParams load ' + (loadTime - startTime) + ' draw ' +
                    (drawTime - loadTime) + ' anim ' + (animTime - drawTime) +
                    ' total ' + (animTime - startTime));
        }
    },

    updateMapAnimation: function (options, onlyUpdateOnChange) {
        var different = !_.isEqual(this.getAnimationOptions(), options);
        this.animationOptions = options;
        if (different) {
            this.animationData = null;
        }
        if (this.animationData &&
            this.animationData.playState !== (options.playState || 'play')) {
            this.animationData.playState = (options.playState || 'play');
            different = true;
        }
        if (different || !onlyUpdateOnChange) {
            this.animate({
                'cycle': $('#ga-cycle').val(),
                'cycle-group': $('#ga-cycle-group').val(),
                'cycle-duration': $('#ga-cycle-duration').val(),
                'cycle-framerate': $('#ga-cycle-framerate').val()
            });
        }
    },

    showMap: function (datakey, params) {
        this.updateMapParams(datakey, params, 'always');
    },

    animationAction: function (action, stepnum) {
        var curPlayState = null;

        if (action === 'jump' && this.animationData &&
            this.animationData.step === stepnum) {
            return;
        }
        if (this.animTimer) {
            window.clearTimeout(this.animTimer);
            this.animTimer = null;
        }
        if (this.animationData) {
            curPlayState = this.animationData.playState;
            if (action === curPlayState) {
                return;
            }
            if (action !== 'jump') {
                this.animationData.playState = action;
            }
        }
        switch (action) {
        case 'jump':
            if (curPlayState !== 'stop') {
                if (!this.animationData) {
                    this.animate(undefined, stepnum);
                } else if (this.animationData.step !== stepnum) {
                    this.animationData.step = ((stepnum +
                                                this.animationData.numBins - 1) %
                                               this.animationData.numBins);
                    this.animationData.nextStepTime = new Date().getTime();
                    this.animateFrame();
                }
            }
            break;
        case 'pause': case 'play': case 'step': case 'stepback':
            if (!this.animationData) {
                if (this.animationOptions &&
                    this.animationOptions.playState === 'stop') {
                    this.animationOptions.playState = (
                        action === 'play' ? action : 'pause');
                }
                this.animate();
            } else {
                if (curPlayState === 'stop') {
                    this.animationData.step = -1;
                } else if (action === 'stepback') {
                    this.animationData.step = ((this.animationData.step +
                                                this.animationData.numBins * 2 - 2) %
                                               this.animationData.numBins);
                }
                this.animationData.nextStepTime = new Date().getTime();
                this.animateFrame();
            }
            break;
        case 'stop':
            if (!this.hasAnyData()) {
                return;
            }
            _.each(this.layers, function (layer) {
                if (layer.animateStop) {
                    layer.animateStop();
                }
            });
            this.get('geomap').draw();
            if (this.animationData) {
                $(this.animationData.sliderElem).slider('disable').slider(
                    'setValue', 0);
            }
            if (this.animationOptions) {
                this.animationOptions.playState = 'stop';
            }
            break;
        }
        if (this.animationData) {
            var lastStep = ((this.animationData.step + this.animationData.numBins -
                             1) % this.animationData.numBins);
            if (this.animationData.playState === 'step' ||
                this.animationData.playState === 'stepback') {
                this.animationData.playState = 'step' + lastStep;
            }
            if (this.animationData.playState !== curPlayState &&
                (!curPlayState || !this.animationData ||
                 curPlayState.substr(0, 4) !== 'step' ||
                 this.animationData.playState.substr(0, 4) !== 'step')) {
            }
            return lastStep;
        }
    }
});
