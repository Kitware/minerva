girder.events.once('m:pre-render-panel-groups', function (sessionView) {
    var leftPanelGroup = sessionView.getPanelGroup('m-left-panel-group');

    leftPanelGroup.panelViews.push({
        id: 'm-resource-panel',
        view: minerva.views.ComputeResourcePanel
    });
});
