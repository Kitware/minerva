$(function () {

    BSVE.init(function()
    {
        // in the ready callback function, access to workbench vars are now available.
        var user = BSVE.api.user(), // current logged in user
            authTicket = BSVE.api.authTicket(), // harbinger-auth-ticket
            tenancy = BSVE.api.tenancy(), // logged in user's tenant
            dismissed = false; // used for dismissing modal alert for tagging confirmation
        console.log('GeoViz 0.0.44');
        console.log(user);

        // TODO fix this grossness.
        // Should be easy to trigger an event passing in this user.
        window.girder_bsve_user = user;

        minerva.events.trigger('g:appload.before');
        minerva.mainApp = new minerva.App({
            el: 'body',
            parentView: null
        });
        minerva.events.trigger('g:appload.after');

        // Store most recent requestId.
        var currentRequestId = false;

        /*
         * Create a search submit handler.
         * The provided callback function will be executed when a fed search is performed.
         */
        BSVE.api.search.submit(function(query)
        {
            // query object will include all of the search params including the requestId which can be used to make data requests
            console.log('GeoViz submitted search');
            console.log(query);
            // There is a problem trying to trigger the federated search here, as the
            // Minerva app may not be ready to listen yet.
            //
            var dataSources = null;
            // Store DataSource features that have already been processed.
            var sourceTypeFeatures = {};
            var finishedCurrentRequest = false;
            currentRequestId = query.requestId;

            function pollSearch(query)
            {
                minerva.events.trigger('m:federated_search', query);
                BSVE.api.get('/api/search/result?requestId=' + query.requestId, function(response)
                {
                    // Store available data source types for reference.
                    if ( !dataSources ) {
                        dataSources = response.availableSourceTypes;
                    }

                    for ( var i = dataSources.length - 1; i >= 0; i-- )
                    {
                        // Check each data source in the result.

                        if ( response.sourceTypeResults[dataSources[i]].message == "Successfully processed." )
                        {
                            // Supposedly this source type is done, but it may not actually be.
                            // Fetch updated geoJSON and remove this data source from list.
                            var dataSource = dataSources.splice(i,1);
                            getGeoJSON(query, dataSource[0]);
                        }
                    }

                    if (dataSources.length)
                    {
                        if (currentRequestId != query.requestId || finishedCurrentRequest) {
                            if(currentRequestId != query.requestId) { console.log('stop polling bc of requestId'); }
			    else { console.log('stop polling bc of finished'); }
                        } else {
                            // continue polling since there are still in progress sources
                            setTimeout(function(){ pollSearch(query); }, 2000);
                        }
                    }
                });
            }

            function getGeoJSON(query, dataSourceName)
            {
                console.log('GeoViz calling getGeoJSON');
                BSVE.api.get('/api/search/util/geomap/geojson/' + query.requestId + '/all', function(response)
                {
                    console.log('Geojson response for '+dataSourceName);
                    if (response.features && response.features.length > 0) {
                        var groupedBySourceType = _.groupBy(response.features, function (feature) {
                            return feature.properties.SourceType;
                        });
                        // Create a Dataset for each SourceType features array.
                        var sourceTypesWithFeatures = _.keys(groupedBySourceType);
                        _.each(sourceTypesWithFeatures, function (sourceType) {
                            if (groupedBySourceType[sourceType] && groupedBySourceType[sourceType].length > 0) {
                                if (_.has(sourceTypeFeatures, sourceType)) {
                                    console.log('Already created a dataset for ' + sourceType);
                                } else {
                                    var geojsonData = {
                                        'type': 'FeatureCollection'
                                    };
                                    geojsonData.features = groupedBySourceType[sourceType];
                                    console.log('Creating a dataset for ' + sourceType + ' of length ' + geojsonData.features.length);
                                    var gjObj = {
                                        'geojson': geojsonData,
                                        'name': sourceType + ' - ' + geojsonData.features.length
                                    }
                                    sourceTypeFeatures[sourceType] = geojsonData.features.length;
                                    minerva.events.trigger('m:add_external_geojson', gjObj);
                                }
                                // Assume this means we got some request data back.
                                finishedCurrentRequest = true;
                            } else {
                                console.log('No features for '+ sourceType);
                            }
                        });
                    } else {
                        console.log(dataSourceName + ' response is missing features');
                    }
                });
            }

            // Start polling.
            pollSearch(query);
        }, true, true, true); // set all 3 flags to true, which will hide the searchbar altogether

    });

});
