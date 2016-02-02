minerva.views.SelectAWSProfile = minerva.View.extend({
    events: {
        "click .m-select-profile": function(e){

        },

        "click .m-create-aws-profile-button": function(e){
            e.preventDefault();

            var container = $("#g-dialog-container");
            var settings = {
                el: container,
                parentView: this.parentView
            };

            var widget = new minerva.views.CreateAWSProfile(settings);
            widget.render();
        }
    },


    initialize: function(settings){
        this.profiles = settings.profiles;
    },

    render: function(){
        this.$el.html(girder.templates.selectAWSProfile({
            profiles: this.profiles
        }));
    }
})
