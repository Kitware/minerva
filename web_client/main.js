import events from 'girder/events';
import router from 'girder/router';
import { exposePluginConfig } from 'girder/utilities/PluginUtils';
import ConfigView from './views/ConfigView';

exposePluginConfig('minerva', 'plugins/minerva/config');


router.route('plugins/minerva/config', 'minervaConfig', function () {
    events.trigger('g:navigateTo', ConfigView);
});