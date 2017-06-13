minerva.views.SelectAWSProfile = minerva.View.extend({
    events: {
        'click .m-select-profile': 'selectAwsProfile',
        'click .m-create-new-aws-profile-button': 'createAwsProfileWidget',
        'click .m-aws-delete-profile': 'deleteAwsProfile'
    },

    initialize: function(settings){
        this.profiles = settings.profiles;
        this.parentView = settings.parentView;
        this.el = settings.el;

        return this;
    },

    render: function(){
        this.$el.html(girder.templates.selectAWSProfile({
            profiles: this.profiles
        }));

        return this;
    },

    selectAwsProfile: function(e){
        var container = $("#g-dialog-container");
        var settings = {
            el: container,
            parentView: this.parentView,
            profileId: e.currentTarget.id
        };

        this.addClusterWidget = new minerva.views.AddClusterWidget(settings).render();
    },

    createAwsProfileWidget: function(e) {
        var container = $("#g-dialog-container");
        var settings = {
            el: container,
            parentView: this.parentView
        };

        var widget = new minerva.views.CreateAWSProfile(settings);
        widget.render();
    },

    deleteAwsProfile: function (e) {
        e.preventDefault();
        e.stopPropagation();

        var button = $(e.currentTarget.parentElement);

        if (confirm('Are you sure you want to delete this profile?')) {
            girder.restRequest({
                path: 'user/' + girder.currentUser.id + '/aws/profiles/' + button.attr('id'),
                type: 'DELETE'
            }).done(_.bind(function () {
                this.profiles = _.reject(this.profiles, function (profile) {
                    return profile._id == button.attr('id');
                });
                this.render();
            }, this)).fail(function () {
                console.error('There was an error deleting the profile.');
            });
        }
    }
});
