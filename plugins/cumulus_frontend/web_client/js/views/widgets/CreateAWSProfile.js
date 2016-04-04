minerva.views.CreateAWSProfile = minerva.View.extend({
    events: {
        'click .m-create-aws-profile-button': 'createAwsProfile'
    },

    params: function () {
        return {
            name: $('#m-name-awsprofile').val(),
            accessKeyId: $('#m-accessKeyId-awsprofile').val(),
            secretAccessKey: $('#m-secretAccessKey-awsprofile').val(),
            regionName: $('#m-regionName-awsprofile').val(),
            availabilityZone: $('#m-availabilityZone-awsprofile').val()
        };
    },

    render: function () {
        this.$el.html(girder.templates.createAWSProfile({}));
        return this;
    },

    createAwsProfile: _.debounce(function (e) {
        e.preventDefault();

        var settings = {
            el: $('#g-dialog-container'),
            parentView: this.parentView
        };

        girder.restRequest({
            path: 'user/' + girder.currentUser.id + '/aws/profiles',
            type: 'POST',
            data: JSON.stringify(this.params()),
            contentType: 'application/json'
        }).done(function (resp) {
            girder.restRequest({
                path: 'user/' + girder.currentUser.id + '/aws/profiles',
                type: 'GET'
            }).done(_.bind(function(profiles) {
                settings.profiles = profiles;
                new minerva.views.SelectAWSProfile(settings).render();
            }, this));
        }, this);
    }, 500, true)
});
