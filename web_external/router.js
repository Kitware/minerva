import Backbone from 'backbone';
import girderRouter from 'girder/router';
import events from 'girder/events';
import { _whenAll } from 'girder/misc';

import SessionsView from './views/body/SessionsView';
import SessionView from './views/body/SessionView';
import SessionModel from './models/SessionModel';
import DatasetCollection from './collections/DatasetCollection';

girderRouter.enabled(false);

var router = new Backbone.Router();

router.route('', 'index', function () {
    events.trigger('g:navigateTo', SessionsView);
});
router.route('sessions', 'sessions', function () {
    events.trigger('g:navigateTo', SessionsView);
});

events.on('g:login', function () {
    events.trigger('g:navigateTo', SessionsView);
});

router.route('maps', 'maps', function () {
    events.trigger('g:navigateTo', SessionView);
});

router.route('session/:id', 'session', function (id) {
    // fetch the session and render it
    var session = new SessionModel();
    session.set({
        _id: id
    });
    var datasetCollection = new DatasetCollection();
    _whenAll([session.fetch(), datasetCollection.fetch()])
        .then(() => {
            return events.trigger('g:navigateTo', SessionView, {
                datasetCollection: datasetCollection,
                session: session
            });
        }).catch(() => {
            router.navigate('sessions', { trigger: true });
        });
});

export default router;
