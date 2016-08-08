/**
* This widget is used to add a new source
*/
minerva.views.AddSourceWidget = minerva.View.extend({
    events: {
        'submit #m-add-source-form': function (e) {
            e.preventDefault();

            // TODO better to have single buttons instead of radio?
            // That way user only has to click once instead of radio + Add
            var sourceType = $('#m-add-source-form input:radio:checked').attr('id');
            // get sourcetype from m-sourcetype-source
            sourceType = sourceType.split('-')[1];
            var container = $('#g-dialog-container');

            var settings = {
                el: container,
                noParent: true,
                collection: this.collection,
                parentView: this.parentView
            };

            if (_.has(this.sourceTypes, sourceType)) {
                var widget = new this.sourceTypes[sourceType].widget(settings); // eslint-disable-line new-cap
                widget.render();
            } else {
                console.error('Unknown source type');
            }
        },
        'click .m-add-source-radio': function (e) {
            $(e.currentTarget).find('input:radio').first().prop('checked', true);
        }
    },

    initialize: function (settings) {
        this.collection = settings.collection;
        // TODO would be nice if new source types could register themselves,
        // perhaps with a method on the minerva object, that we could then
        // query here.  All the source types register themselves upon definition,
        // and we query here upon instantation.  This registration process
        // should also add them to the SourceCollection model function.
        this.sourceTypes = {
            wms: {
                label: 'WMS',
                icon: 'icon-layers',
                widget: minerva.views.AddWmsSourceWidget
            }
        };
    },

    render: function () {
        var view = this;
        var modal = this.$el.html(minerva.templates.addSourceWidget({
            session: this.model,
            sourceTypes: this.sourceTypes
        })).girderModal(this).on('shown.bs.modal', function () {
            view.$('#m-wms-name').focus();
        }).on('hidden.bs.modal', function () {
        }).on('ready.girder.modal', function () {
        });
        modal.trigger($.Event('ready.girder.modal', {relatedTarget: modal}));

        return this;
    }

});
