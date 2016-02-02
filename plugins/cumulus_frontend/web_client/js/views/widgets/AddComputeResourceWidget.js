minerva.views.AddComputeResourceWidget = minerva.View.extend({
    events: {
        'click button.m-add-resource-type': function(e){
            e.preventDefault();
            var resourceType = e.currentTarget.id.split('-')[1];

            var container = $("#g-dialog-container");
            var settings = {
                el: container,
                parentView: this.parentView
            };

            if (_.has(this.resourceTypes, resourceType)) {
                girder.restRequest({
                    path: "user/" + girder.currentUser.get("_id") + "/aws/profiles",
                    type: "GET"
                }).done(_.bind(function(profiles) {
                    settings.profiles = profiles;
                    var widget = new this.resourceTypes[resourceType].widget(settings);
                    widget.render();
                }, this));

            } else {
                console.error('Unknown source type');
            }

        }
    },

    initialize: function(settings) {
        this.collection = settings.collection;
        this.resourceTypes = {
            'aws': {
                label: 'Amazon Web Services',
                icon: 'icon-cloud',
                widget: minerva.views.SelectAWSProfile
            }

        };
    },


    render: function () {
        var view = this;
        var modal = this.$el.html(girder.templates.addComputeResourceWidget({
            resources: this.model,
            resourceTypes: this.resourceTypes
        })).girderModal(this);


    }
})
