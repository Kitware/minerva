minerva.views.CreateAWSProfile = minerva.View.extend({
    events: {
        "click .m-create-aws-profile-button": function (e) {
            e.preventDefault();

            var paramaters = {
                name: $("#m-aws-profile-name").val(),
                accessKeyId: $("#m-accessKeyId-awsprofile").val(),
                secretAccessKey: $("#m-secretAccessKey-awsprofile").val(),
                regionName: $("#m-regionName-awsprofile").val(),
                availabilityZone: $("#m-availabilityZone-awsprofile").val()
            };

            var container = $("#g-dialog-container");
            var settings = {
                el: container,
                parentView: this.parentView
            };

            girder.restRequest({
                path: "user/" + girder.currentUser.get("_id") + "/aws/profiles",
                type: "POST",
                data: paramaters
            }).done(function (resp) {
                girder.restRequest({
                    path: "user/" + girder.currentUser.get("_id") + "/aws/profiles",
                    type: "GET"
                }).done(_.bind(function(profiles) {
                    settings.profiles = profiles;
                    var widget = new this.resourceTypes[resourceType].widget(settings);
                    widget.render();
                }, this));

            });


        }

    },

    render: function () {
        this.$el.html(girder.templates.createAWSProfile({}));
    }

});
