$(function () {
    BSVE.init(function()
    {
        // in the ready callback function, access to workbench vars are now available.
        var user = BSVE.api.user(), // current logged in user
            authTicket = BSVE.api.authTicket(), // harbinger-auth-ticket
            tenancy = BSVE.api.tenancy(), // logged in user's tenant
            dismissed = false, // used for dismissing modal alert for tagging confirmation
            dataSources = null;
        console.log('GeoViz 0.0.26');
        console.log(user);

        window.girder_bsve_user = user;

        minerva.events.trigger('g:appload.before');
        minerva.mainApp = new minerva.App({
            el: 'body',
            parentView: null
        });
        minerva.events.trigger('g:appload.after');

        /*
         * Create a search submit handler.
         * The provided callback function will be executed when a fed search is performed.
         */
        BSVE.api.search.submit(function(query)
        {
            // query object will include all of the search params including the requestId which can be used to make data requests
            console.log('GeoViz submitted search');
            console.log(query);
            // Store DataSource features that have already been processed.
            var sourceTypeFeatures = {};

            function pollSearch(query)
            {
                var stopPolling = false;
                BSVE.api.get('/api/search/result?requestId=' + query.requestId, function(response)
                {
                    //console.log('GeoViz got response to query');
                    //console.log(query);
                    //console.log(response);
                    // store available data source types for reference
                    if ( !dataSources ) {
                        //console.log('created dataSources');
                        dataSources = response.availableSourceTypes;
                    }

                    for ( var i = dataSources.length - 1; i >= 0; i-- )
                    {
                        //console.log('looping over datasources with length ' + dataSources.length + ' i='+i);
                        //console.log(response.sourceTypeResults[dataSources[i]].message);
                        // check each data source in the result

                        if ( response.sourceTypeResults[dataSources[i]].message == "Successfully processed." )
                        {
                            // it's done so fetch updated geoJSON and remove this data source from list
                            var dataSource = dataSources.splice(i,1);
                            //console.log('after splice, dataSource='+dataSource+' '+dataSource[0]);
                            getGeoJSON(query, dataSource[0]);
                        }
                    }

                    if (dataSources.length && !stopPolling)
                    {
                        // continue polling since there are still in progress sources
                        setTimeout(function(){ pollSearch(query); }, 2000);
                    }
                });
            }

            function getGeoJSON(query, dataSourceName)
            {
                console.log('GeoViz calling getGeoJSON');
                //console.log(query);
                BSVE.api.get('/api/search/util/geomap/geojson/' + query.requestId + '/all', function(response)
                {
                    console.log('Geojson response for '+dataSourceName);
                    console.log(response);
                    if (response.features && response.features.length > 0) {
                        var groupedBySourceType = _.groupBy(response.features, function (feature) {
                            return feature.properties.SourceType;
                        });
                        console.log(groupedBySourceType);
                        // Create a Dataset for each SourceType features array.
                        var sourceTypesWithFeatures = _.keys(groupedBySourceType);
                        _.each(sourceTypesWithFeatures, function (sourceType) {
                            console.log('Checking for features of ' + sourceType);
                            if (groupedBySourceType[sourceType] && groupedBySourceType[sourceType].length > 0) {
                                if (_.has(sourceTypeFeatures, sourceType)) {
                                    console.log('Already created a dataset for ' + sourceType);
                                } else {
                                    var geojsonData = {
                                        'type': 'FeatureCollection'
                                    };
                                    geojsonData.features = groupedBySourceType[sourceType];
                                    console.log(groupedBySourceType[sourceType].length);
                                    console.log(geojsonData);
                                    console.log('Creating a dataset for ' + sourceType + ' of length ' + geojsonData.features.length);
                                    var gjObj = {
                                        'geojson': geojsonData,
                                        'name': query.term + ': ' + sourceType + ' - ' + geojsonData.features.length
                                    }
                                    console.log(gjObj);
                                    console.log("the gjObj feature len is " + gjObj.geojson.features.length);
                                    sourceTypeFeatures[sourceType] = geojsonData.features.length;
                                    minerva.events.trigger('m:add_external_geojson', gjObj);
                                }
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
