/**
 * This view is in charge of viewing the details on an individual compute
 * resource, which is one or more machines as part of a cluster.
 * This panel is backed by a single compute resource model.
 *
 * The majority of the logic in this panel pertains to the live streaming
 * of log events occurring.
 * A ComputeResource is considered "working" if it is in the middle of doing
 * anything that involves streaming output from Ansible playbooks back to Girder.
 *
 * Raw logs are stored as part of the cluster, and an abbreviated log that most
 * users will probably look at is stored in the model's abbrev_log attribute.
 *
 * When the view is initialized, an event stream is opened if the resource is working.
 * Otherwise, logs are fetched and processed for viewing.
 *
 * Event Listening
 * 1) If the model is changed then the modal contents need to be re-rendered. Additional
 * care is taken to close the event stream if the resource moves from a working to a
 * non-working state.
 * 2) If the modal is hidden, the event stream is closed and we stop listening for model
 * changes. This is because each compute resource can have its own modal with streaming output.
 **/
minerva.views.ComputeResourceDetailWidget = minerva.View.extend({
    events: {
        'click .nav-tabs a': function (e) {
            this.activeTab = $(e.currentTarget).data('tab');
        }
    },

    initialize: function(settings) {
        this.model = settings.model;

        // Re-render the contents of the modal if there is a change to the model.
        // This is useful for when logs get updated and/or the status gets changed.
        // If the status changes and the cluster is no longer working, close
        // any event stream that might be open since we won't be receiving any more
        // messages.
        this.listenTo(this.model, 'change', _.bind(function () {
            if (!this.model.hasPendingOperation() && _.has(this, 'eventStream')) {
                this.eventStream.close();
            }

            this.render();
        }, this));

        // If a compute resource is removed, stop listening for changes and close
        // the event stream
        this.listenTo(this.model, 'remove', _.bind(this._destroy, this));


        this.model.set('log', []);
        this.model.set('abbrev_log', []);

        girder.restRequest({
            path: '/clusters/' + this.model.id + '/log'
        }).done(_.bind(function (resp) {
            this.model.set('log', resp.log, { silent: true });

            /**
             * If pulling a clusters entire log history at once, each processLogEvent
             * call will trigger change on the model - re-rendering the modal. This
             * is fine when logs are coming in one at a time, but when loading the
             * modal and fetching (potentially) hundreds of logs this becomes
             * unusable. Trigger a change on the model once after fetching all logs.
             **/
            _.each(resp.log, _.bind(function (msg) {
                this.processLogEvent(msg, true);
            }, this));

            this.model.trigger('change');

            if (this.model.hasPendingOperation()) {
                this.startEventStream();
            }
        }, this));

        return this;
    },

    /**
     * We want to update the contents of the modal on resource model change, without
     * actually triggering the modal to re-open. So a firstRender flag is passed.
     * This could potentially be done in a more general way.
     **/
    render: function (firstRender) {
        this.modal = this.$el.html(girder.templates.computeResourceDetailWidget({
            resource: this.model,
            activeTab: this.activeTab || 'log-output'
        }));

        if (firstRender === true) {
            this.modal.girderModal(this).on('hidden.bs.modal', _.bind(function () {
                /**
                 * The idea is to only have an event stream open for working clusters
                 * that have their detail pane open. So when the modal is hidden, close the stream.
                 **/
                this._destroy();
                // Ideally, this.destroy would be called on modal hide - but it's not for some reason.
            }, this));
            this.modal.trigger($.Event('ready.girder.modal', {relatedTarget: this.modal}));
        }

        return this;
    },

    /**
     * Starts an event stream on the compute resource model.
     * The reason this is in the view is due to the fact that we don't want
     * to open up live event streams unless the user is trying to actually view the live output.
     **/
    startEventStream: function () {
        if (!_.has(this, 'eventStream')) {
            this.eventStream = new girder.EventStream({
                streamPath: '/clusters/' + this.model.id + '/log/stream'
            });

            this.eventStream.on('g:event.task', _.bind(function (event) {
                this.processLogEvent(event);
                this.render();
            }, this));
            this.eventStream.open();
        }
    },

    /**
     * This processes an event thrown by a log (i.e. ansible playbooks).
     * It formats it into a user friendly log.
     **/
    processLogEvent: function (event, inhibitEvents) {
        var setOptions = (inhibitEvents === true) ? { silent: true }: {}

        if (event.status === 'starting') {
            this.model.set('abbrev_log',
                           this.model.get('abbrev_log').concat({
                               message: event.msg
                           }), setOptions);
        } else {
            var logs = this.model.get('abbrev_log');
            logs[logs.length - 1].status = event.status;
            this.model.set('abbrev_log', logs, setOptions);
        }

        this.model.set('log', this.model.get('log').concat(event), setOptions);
    },

    _destroy: function () {
        if (_.has(this, 'eventStream')) {
            this.eventStream.close();
        }

        this.stopListening(this.model);
    },

    /**
     * Handles the closing of an event stream, if applicable.
     **/
    destroy: function () {
        this._destroy();
        minerva.View.prototype.destroy.apply(this, arguments);
    }
});
