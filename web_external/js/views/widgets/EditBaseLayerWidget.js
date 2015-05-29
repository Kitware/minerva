/**
* This widget is used to edit an existing Base Layer of a Map Session.
*/
minerva.views.EditBaseLayerWidget = minerva.View.extend({
    events: {
        'submit #m-edit-baselayer-form': function (e) {
            e.preventDefault();

            var fields = {
                centerx: this.$('#m-baselayer-centerx').val(),
                centery: this.$('#m-baselayer-centery').val()
            };

            this.updateBaseLayer(fields);

            this.$('button.m-save-baselayer').addClass('disabled');
            this.$('.g-validation-failed-message').text('');
        }
    },

    initialize: function (settings) {
        this.model = settings.model || null;
    },

    render: function () {
        var view = this;
        var modal = this.$el.html(minerva.templates.editBaseLayerWidget({
            session: this.model
        })).girderModal(this).on('shown.bs.modal', function () {
            view.$('#m-baselayer-basemap').focus();
        }).on('hidden.bs.modal', function () {
        }).on('ready.girder.modal', function () {
            view.$('#m-baselayer-centerx').val(view.model.sessionJsonContents.center.x);
            view.$('#m-baselayer-centery').val(view.model.sessionJsonContents.center.y);
        });
        modal.trigger($.Event('ready.girder.modal', {relatedTarget: modal}));
        view.$('#m-baselayer-basemap').focus();

        return this;
    },

    updateBaseLayer: function (fields) {
        this.model.sessionJsonContents.center.x = fields.centerx;
        this.model.sessionJsonContents.center.y = fields.centery;
        this.model.on('m:saved', function () {
            this.$el.modal('hide');
            this.trigger('g:saved', this.model);
        }, this).off('g:error').on('g:error', function (err) {
            this.$('.g-validation-failed-message').text(err.responseJSON.message);
            this.$('button.m-save-baselayer').removeClass('disabled');
            this.$('#m-baselayer-' + err.responseJSON.field).focus();
        }, this).saveSession();
    }
});
