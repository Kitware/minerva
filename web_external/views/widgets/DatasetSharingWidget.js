import $ from 'jquery';
import { restRequest } from 'girder/rest';

import View from '../view';
import template from '../../templates/widgets/datasetSharingWidget.pug';

import '../../stylesheets/widgets/datasetSharingWidget.styl';

const DatasetSharingWidget = View.extend({
    events: {
        'change .checkbox-container input': function (e) {
            var datasetId = $(e.target).attr('data-dataset-id');
            this.sharedMap[datasetId] = !this.sharedMap[datasetId];
        },
        'click button.save': 'save'
    },
    initialize(settings) {
        this.modalOpenned = false;
        var datasetCollection = settings.datasetCollection;
        this.userFolderId = settings.datasetCollection.folderId;
        var user = settings.user;
        var datasets = datasetCollection.filter((dataset) => dataset.get('creatorId') === user.id);
        this.datasets = datasets;
        this.sharedMap = {};
        datasets.forEach((dataset) => {
            this.sharedMap[dataset.id] = dataset.get('folderId') !== this.userFolderId;
        });
    },
    render() {
        if (!this.modalOpenned) {
            var el = this.$el.html(template(this));
            this.modalOpenned = true;
            var modal = el.girderModal(this);

            modal.trigger($.Event('ready.girder.modal', { relatedTarget: modal }));
        } else {
            this.update(template(this));
        }
        return this;
    },
    save() {
        var changed = this.datasets.filter((dataset) => {
            return dataset.get('folderId') !== this.userFolderId !== this.sharedMap[dataset.id];
        });
        var shared = changed.filter((dataset) => this.sharedMap[dataset.id]);
        var unshared = changed.filter((dataset) => !this.sharedMap[dataset.id]);
        var update = (dataset, updatedDataset) => {
            dataset.set('folderId', updatedDataset.folderId);
        };
        Promise.all(
            shared.map((dataset) => {
                return restRequest({
                    type: 'PUT',
                    url: `minerva_dataset/share/${dataset.id}`
                })
                    .done((updatedDataset) => update(dataset, updatedDataset));
            })
                .concat(unshared.map((dataset) => {
                    return restRequest({
                        type: 'PUT',
                        url: `minerva_dataset/unshare/${dataset.id}`
                    })
                    .done((updatedDataset) => update(dataset, updatedDataset));
                }))
        )
            .then(() => {
                this.$el.modal('hide');
                return null;
            });
    }
});
export default DatasetSharingWidget;
