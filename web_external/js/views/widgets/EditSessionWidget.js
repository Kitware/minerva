/**
* This widget is used to create a new session or edit an existing one.
*/
minerva.views.EditSessionWidget = minerva.View.extend({
    events: {
        'submit #m-session-edit-form': function (e) {
            e.preventDefault();

            var fields = {
                name: this.$('#m-session-name').val(),
                description: this.$('#m-session-description').val()
            };

            if (this.model) {
                this.updateSession(fields);
            } else {
                this.createSession(fields);
            }

            this.$('button.m-save-session').addClass('disabled');
            this.$('.g-validation-failed-message').text('');
        }
    },

    initialize: function (settings) {
        this.model = settings.model || null;
        // parentCollection only needed for a new session to know
        // the parent container for the new item
        this.parentCollection = settings.parentCollection;
    },

    render: function () {
        var view = this;
        var modal = this.$el.html(minerva.templates.editSessionWidget({
            session: this.model
        })).girderModal(this).on('shown.bs.modal', function () {
            view.$('#m-session-name').focus();
        }).on('hidden.bs.modal', function () {
            if (view.create) {
                girder.dialogs.handleClose('create');
            } else {
                girder.dialogs.handleClose('edit');
            }
        }).on('ready.girder.modal', function () {
            if (view.model) {
                view.$('#m-session-name').val(view.model.get('name'));
                view.$('#m-session-description').val(view.model.get('description'));

                view.create = false;
            } else {
                view.create = true;
            }
        });
        modal.trigger($.Event('ready.girder.modal', {relatedTarget: modal}));
        this.$('#m-session-name').focus();

        if (view.model) {
            girder.dialogs.handleOpen('edit');
        } else {
            girder.dialogs.handleOpen('create');
        }

        return this;
    },

    createSession: function (fields) {
        var session = new minerva.models.SessionModel();
        session.set(_.extend(fields, {
            folderId: this.parentCollection.folderId
        }));
        session.on('g:saved', function () {
            this.$el.modal('hide');
            session.on('m:session_saved', function () {
                this.trigger('g:saved', session);
            }, this);
            session.createSessionMetadata();
        }, this).off('g:error').on('g:error', function (err) {
            this.$('.g-validation-failed-message').text(err.responseJSON.message);
            this.$('button.m-save-phase').removeClass('disabled');
            this.$('#m-session-' + err.responseJSON.field).focus();
        }, this).save();
    },

    updateSession: function (fields) {
        this.model.set(fields);
        this.model.on('g:saved', function () {
            this.$el.modal('hide');
            this.trigger('g:saved', this.model);
        }, this).off('g:error').on('g:error', function (err) {
            this.$('.g-validation-failed-message').text(err.responseJSON.message);
            this.$('button.m-save-session').removeClass('disabled');
            this.$('#m-session-' + err.responseJSON.field).focus();
        }, this).save();
    }
});
