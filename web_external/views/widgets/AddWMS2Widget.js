import { restRequest } from 'girder/rest';

import View from '../view';
import template from '../../templates/widgets/addWMS2Widget.pug';
/**
* This widget is used to diplay minerva metadata for a dataset.
*/
const AddWMS2Widget = View.extend({
    events: {
        'change input#name': function (e) {
            this.name = e.target.value;
        },
        'change input#url': function (e) {
            this.url = e.target.value;
        },
        'submit form': function (e) {
            e.preventDefault();
            return restRequest({
                type: 'POST',
                url: `minerva_dataset_wms2/`,
                data: {
                    name: this.name,
                    url: this.url
                }
            }).then((dataset) => {
                this.trigger('m:dataset_created', dataset);
                this.$el.modal('hide');
            });
        }
    },

    initialize(settings) {
        this.name = '';
        this.url = '';
    },

    render() {
        if (!this.modalOpenned) {
            this.modalOpenned = true;
            var modal = this.$el.html(template(this))
                .girderModal(this);

            modal.trigger($.Event('ready.girder.modal', { relatedTarget: modal }));
        } else {
            this.$el.html(template(this));
        }
        return this;
    }
});
export default AddWMS2Widget;
