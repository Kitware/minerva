minerva.views.ElasticGeospaceWidget = minerva.View.extend({

    events: {
        'submit #m-elastic-geospace-form': 'submitForm'
    },

    msas: ["", "Abilene, TX MSA", "Akron, OH MSA", "Albany-Schenectady-Troy, NY MSA", "Albuquerque, NM MSA", "Alexandria, LA MSA", "Allentown-Bethlehem-Easton, PA-NJ MSA", "Altoona, PA MSA", "Amarillo, TX MSA", "Anchorage, AK MSA", "Anniston-Oxford, AL MSA", "Appleton, WI MSA", "Asheville, NC MSA", "Athens-Clark County, GA MSA", "Atlantic City, NJ MSA", "Augusta-Richmond County, GA-SC MSA", "Austin-Round Rock, TX MSA", "Bakersfield, CA MSA", "Baltimore-Towson, MD MSA", "Beaumont-Port Arthur, TX MSA", "Bellingham, WA MSA", "Binghamton, NY MSA", "Birmingham-Hoover, AL MSA", "Boise City-Nampa, ID MSA", "Boston-Cambridge-Quincy, MA-NH MSA", "Bridgeport-Stamford-Norwalk, CT MSA", "Brownsville-Harlingen, TX MSA", "Buffalo-Niagara Falls, NY MSA", "Canton-Massillon, OH MSA", "Cape Coral-Fort Myers, FL MSA", "Cedar Rapids, IA MSA", "Charlotte-Gastonia-Concord, NC-SC MSA", "Charlottesville, VA MSA", "Chattanooga, TN-GA MSA", "Chicago-Naperville-Joliet, IL-IN-WI MSA", "Chico, CA MSA", "Cincinnati-Middletown, OH-KY-IN MSA", "Clarksville, TN-KY MSA", "Cleveland-Elyria-Mentor, OH MSA", "Columbus, OH MSA", "Corpus Christi, TX MSA", "Dallas-Fort Worth-Arlington, TX MSA", "Davenport-Moline-Rock Island, IA-IL MSA", "Dayton, OH MSA", "Denver-Aurora, CO MSA", "Detroit-Warren-Livonia, MI MSA", "Duluth, MN-WI MSA", "Eau Claire, WI MSA", "El Paso, TX MSA", "Eugene-Springfield, OR MSA", "Evansville, IN-KY MSA", "Fargo, ND-MN MSA", "Fayetteville, NC MSA", "Flagstaff, AZ MSA", "Flint, MI MSA", "Fort Collins-Loveland, CO MSA", "Gadsden, AL MSA", "Greeley, CO MSA", "Greensboro-High Point, NC MSA", "Greenville-Mauldin-Easley, SC MSA", "Gulfport-Biloxi, MS MSA", "Hagerstown-Martinsburg, MD-WV MSA", "Harrisburg-Carlisle, PA MSA", "Hattiesburg, MS MSA", "Hickory-Lenoir-Morganton, NC MSA", "Houma-Bayou Cane-Thibodaux, LA MSA", "Houston-Sugar Land-Baytown, TX MSA", "Indianapolis-Carmel, IN MSA", "Jacksonville, FL MSA", "Janesville, WI MSA", "Johnstown, PA MSA", "Joplin, MO MSA", "Kansas City, MO-KS MSA", "Killeen-Temple-Fort Hood, TX MSA", "Knoxville, TN MSA", "Kokomo, IN MSA", "Lancaster, PA MSA", "Lansing-East Lansing, MI MSA", "Laredo, TX MSA", "Las Vegas-Paradise, NV MSA", "Lexington-Fayette, KY MSA", "Lincoln, NE MSA", "Little Rock-North Little Rock-Conway, AR MSA", "Louisville/Jefferson County, KY-IN MSA", "Lubbock, TX MSA", "Macon, GA MSA", "Madison, WI MSA", "McAllen-Edinburg-Mission, TX MSA", "Medford, OR MSA", "Memphis, TN-AR-MS MSA", "Merced, CA MSA", "Miami-Fort Lauderdale-Pompano Beach, FL MSA", "Milwaukee-Waukesha-West Allis, WI MSA", "Minneapolis-St. Paul-Bloomington, MN-WI MSA", "Modesto, CA MSA", "Monroe, LA MSA", "Muncie, IN MSA", "Myrtle Beach-Conway-North Myrtle Beach, SC MSA", "Nashville-Davidson-Murfreesboro-Franklin, TN MSA", "New Haven-Milford, CT MSA", "New Orleans-Metairie-Kenner, LA MSA", "New York-Northern New Jersey-Long Island, NY-NJ-PA MSA", "Oklahoma City, OK MSA", "Olympia, WA MSA", "Omaha-Council Bluffs, NE-IA MSA", "Orlando-Kissimmee, FL MSA", "Oxnard-Thousand Oaks-Ventura, CA MSA", "Palm Bay-Melbourne-Titusville, FL MSA", "Pensacola-Ferry Pass-Brent, FL MSA", "Philadelphia-Camden-Wilmington, PA-NJ-DE-MD MSA", "Phoenix-Mesa-Scottsdale, AZ MSA", "Pittsburgh, PA MSA", "Portland-South Portland-Biddeford, ME MSA", "Portland-Vancouver-Beaverton, OR-WA MSA", "Providence-New Bedford-Fall River, RI-MA MSA", "Provo-Orem, UT MSA", "Pueblo, CO MSA", "Raleigh-Cary, NC MSA", "Reading, PA MSA", "Redding, CA MSA", "Reno-Sparks, NV MSA", "Richmond, VA MSA", "Riverside-San Bernardino-Ontario, CA MSA", "Roanoke, VA MSA", "Rocky Mount, NC MSA", "Sacramento-Arden-Arcade-Roseville, CA MSA", "Salem, OR MSA", "Salinas, CA MSA", "Salt Lake City, UT MSA", "San Antonio, TX MSA", "San Diego-Carlsbad-San Marcos, CA MSA", "San Francisco-Oakland-Fremont, CA MSA", "San Jose-Sunnyvale-Santa Clara, CA MSA", "San Luis Obispo-Paso Robles, CA MSA", "Santa Cruz-Watsonville, CA MSA", "Savannah, GA MSA", "Scranton--Wilkes-Barre, PA MSA", "Seattle-Tacoma-Bellevue, WA MSA", "Shreveport-Bossier City, LA MSA", "Sioux Falls, SD MSA", "South Bend-Mishawaka, IN-MI MSA", "Springfield, MO MSA", "St. Joseph, MO-KS MSA", "St. Louis, MO-IL MSA", "Stockton, CA MSA", "Syracuse, NY MSA", "Tallahassee, FL MSA", "Tampa-St. Petersburg-Clearwater, FL", "Terre Haute, IN MSA", "Toledo, OH MSA", "Topeka, KS MSA", "Tucson, AZ MSA", "Tulsa, OK MSA", "Tyler, TX MSA", "Utica-Rome, NY MSA", "Virginia Beach-Norfolk-Newport News, VA-NC MSA", "Visalia-Porterville, CA MSA", "Waco, TX MSA", "Washington-Arlington-Alexandria, DC-VA-MD-WV MSA", "Waterloo-Cedar Falls, IA MSA", "Wausau, WI MSA", "Wichita, KS MSA", "Williamsport, PA MSA", "Worcester, MA MSA", "Youngstown-Warren-Boardman, OH-PA MSA", "Yuma, AZ MSA"],

    initialize: function (settings) {
        this.analysis = settings.analysis;
        this.sourceCollection = settings.sourceCollection;

        this.render();
    },

    render: function () {
        var modal = this.$el.html(minerva.templates.elasticGeospaceWidget({
            sources: this.sourceCollection.models,
            msas: this.msas
        })).girderModal(this).on('shown.bs.modal', _.bind(function () {
            this.$('#m-elastic-geospace-daterange').daterangepicker({
                timePicker: true,
                format: 'YYYY-MM-DD H:mm',
                timePicker12Hour: false,
                timePickerSeconds: false
            });

            this.$('#m-elastic-geospace-daterange').on('apply.daterangepicker', _.bind(function (ev, picker) {
                var secondsSinceEpochToDateString = function (seconds) {
                    var d = new Date(seconds * 1000);
                    var dateString = d.getUTCFullYear() + '-' +
                            ('0' + (d.getUTCMonth() + 1)).slice(-2) + '-' +
                            ('0' + d.getUTCDate()).slice(-2) + 'T' +
                            ('0' + d.getUTCHours()).slice(-2) + ':' +
                            ('0' + d.getUTCMinutes()).slice(-2) + ':' +
                            ('0' + d.getUTCSeconds()).slice(-2);
                    return dateString;
                };

                this.startTime = secondsSinceEpochToDateString(
                    (Date.parse(picker.startDate._d.toISOString()) / 1000) - (4 * 3600));
                this.endTime = secondsSinceEpochToDateString(
                    (Date.parse(picker.endDate._d.toISOString()) / 1000) - (4 * 3600));
            }, this));
        }, this));
    },

    submitForm: function (e) {
        e.preventDefault();
        this.$('.g-validation-failed-message').text('');

        girder.restRequest({
            path: 'minerva_analysis/elastic_geospace',
            type: 'POST',
            data: {
                datasetName: this.$('#m-elastic-geospace-dataset-name').val(),
                elasticSearchParams: JSON.stringify({
                    query: this.$('#m-elastic-geospace-query').val() || '',
                    startTime: this.startTime,
                    endTime: this.endTime,
                    sourceId: this.$('#m-elastic-geospace-input-es-source').val(),
                    pgSourceId: this.$('#m-elastic-geospace-input-pg-source').val(),
                    msa: this.$('#m-elastic-geospace-input-msa').val().replace(/ MSA$/, '')
                })
            }
        }).done(_.bind(function () {
            this.$el.modal('hide');
            girder.events.trigger('m:job.created');
        }, this));
    }
});
