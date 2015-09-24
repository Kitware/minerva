/**
* This widget is used to edit params for GeoJs contour analysis.
*/
minerva.views.TerraSimilarityWidget = minerva.View.extend({

    events: {
        'submit #m-terra-similarity-form': function (e) {
            e.preventDefault();
            this.$('.g-validation-failed-message').text('');
            var location = this.$('#m-terra-similarity-input-location').val();
            var covars = $('#m-terra-similarity-input-covars').val().join('|');
            this.$el.modal('hide');

            this.terraSimilarityPlot = new minerva.views.TerraSimilarityPlot({
                el: '.terraSimilarityPlot',
                model: new minerva.models.TSDatasetModel({
                    location: location,
                    covars: covars
                }),
                parentView: this
            });
        }
    },

    covariates: function() {
        var covars;

        $.ajax({
            url: 'https://tempus-demo.ngrok.com/api',
            async: false,
            dataType: 'json',
            success: function(data) {
                covars = data.escort_ads.covariates;
            }
        });

        return covars;
    },

    render: function () {
        var _this = this;

        var locations = ["", "Fayetteville, NC MSA","Worcester, MA MSA","Killeen-Temple-Fort Hood, TX MSA","Salinas, CA MSA","Greeley, CO MSA","Milwaukee-Waukesha-West Allis, WI MSA","Athens-Clark County, GA MSA","Tallahassee, FL MSA","Waterloo-Cedar Falls, IA MSA","Lexington-Fayette, KY MSA","Stockton, CA MSA","Topeka, KS MSA","Louisville/Jefferson County, KY-IN MSA","Allentown-Bethlehem-Easton, PA-NJ MSA","Clarksville, TN-KY MSA","Bellingham, WA MSA","Reading, PA MSA","Muncie, IN MSA","Eugene-Springfield, OR MSA","Memphis, TN-AR-MS MSA","Gulfport-Biloxi, MS MSA","Roanoke, VA MSA","Santa Cruz-Watsonville, CA MSA","Myrtle Beach-Conway-North Myrtle Beach, SC MSA","Denver-Aurora, CO MSA","Springfield, MO MSA","Pittsburgh, PA MSA","Binghamton, NY MSA","Harrisburg-Carlisle, PA MSA","Nashville-Davidson-Murfreesboro-Franklin, TN MSA","Minneapolis-St. Paul-Bloomington, MN-WI MSA","Anchorage, AK MSA","Alexandria, LA MSA","Sioux Falls, SD MSA","Greenville-Mauldin-Easley, SC MSA","Syracuse, NY MSA","Redding, CA MSA","Phoenix-Mesa-Scottsdale, AZ MSA","Albany-Schenectady-Troy, NY MSA","Philadelphia-Camden-Wilmington, PA-NJ-DE-MD MSA","Oxnard-Thousand Oaks-Ventura, CA MSA","Provo-Orem, UT MSA","Houma-Bayou Cane-Thibodaux, LA MSA","Atlantic City, NJ MSA","Salt Lake City, UT MSA","Merced, CA MSA","South Bend-Mishawaka, IN-MI MSA","Palm Bay-Melbourne-Titusville, FL MSA","Miami-Fort Lauderdale-Pompano Beach, FL MSA","Riverside-San Bernardino-Ontario, CA MSA","Savannah, GA MSA","Lubbock, TX MSA","Portland-South Portland-Biddeford, ME MSA","Orlando-Kissimmee, FL MSA","Sacramento-Arden-Arcade-Roseville, CA MSA","Amarillo, TX MSA","Laredo, TX MSA","Gadsden, AL MSA","Lincoln, NE MSA","Wausau, WI MSA","Charlottesville, VA MSA","Cape Coral-Fort Myers, FL MSA","Johnstown, PA MSA","Hagerstown-Martinsburg, MD-WV MSA","Olympia, WA MSA","Akron, OH MSA","Las Vegas-Paradise, NV MSA","Bridgeport-Stamford-Norwalk, CT MSA","Seattle-Tacoma-Bellevue, WA MSA","Williamsport, PA MSA","Lansing-East Lansing, MI MSA","Asheville, NC MSA","Appleton, WI MSA","New York-Northern New Jersey-Long Island, NY-NJ-PA MSA","Davenport-Moline-Rock Island, IA-IL MSA","Janesville, WI MSA","Madison, WI MSA","Cincinnati-Middletown, OH-KY-IN MSA","Corpus Christi, TX MSA","Detroit-Warren-Livonia, MI MSA","San Antonio, TX MSA","Salem, OR MSA","Austin-Round Rock, TX MSA","Lancaster, PA MSA","Waco, TX MSA","Chattanooga, TN-GA MSA","Utica-Rome, NY MSA","Pensacola-Ferry Pass-Brent, FL MSA","Omaha-Council Bluffs, NE-IA MSA","Baltimore-Towson, MD MSA","New Orleans-Metairie-Kenner, LA MSA","New Haven-Milford, CT MSA","Medford, OR MSA","Visalia-Porterville, CA MSA","Little Rock-North Little Rock-Conway, AR MSA","Macon, GA MSA","Youngstown-Warren-Boardman, OH-PA MSA","San Jose-Sunnyvale-Santa Clara, CA MSA","Tulsa, OK MSA","Indianapolis-Carmel, IN MSA","Evansville, IN-KY MSA","Fort Collins-Loveland, CO MSA","Dayton, OH MSA","Tampa-St. Petersburg-Clearwater, FL","Houston-Sugar Land-Baytown, TX MSA","Washington-Arlington-Alexandria, DC-VA-MD-WV MSA","San Francisco-Oakland-Fremont, CA MSA","Chicago-Naperville-Joliet, IL-IN-WI MSA","Modesto, CA MSA","St. Joseph, MO-KS MSA","Kansas City, MO-KS MSA","Abilene, TX MSA","Boston-Cambridge-Quincy, MA-NH MSA","Charlotte-Gastonia-Concord, NC-SC MSA","Buffalo-Niagara Falls, NY MSA","Wichita, KS MSA","Providence-New Bedford-Fall River, RI-MA MSA","Raleigh-Cary, NC MSA","Flint, MI MSA","Flagstaff, AZ MSA","Joplin, MO MSA","Knoxville, TN MSA","Columbus, OH MSA","Monroe, LA MSA","Chico, CA MSA","Cedar Rapids, IA MSA","Tyler, TX MSA","McAllen-Edinburg-Mission, TX MSA","Cleveland-Elyria-Mentor, OH MSA","Oklahoma City, OK MSA","Toledo, OH MSA","Albuquerque, NM MSA","Hickory-Lenoir-Morganton, NC MSA","Fargo, ND-MN MSA","Pueblo, CO MSA","Portland-Vancouver-Beaverton, OR-WA MSA","Scranton--Wilkes-Barre, PA MSA","Canton-Massillon, OH MSA","Augusta-Richmond County, GA-SC MSA","Richmond, VA MSA","San Luis Obispo-Paso Robles, CA MSA","Eau Claire, WI MSA","Hattiesburg, MS MSA","Yuma, AZ MSA","Rocky Mount, NC MSA","Greensboro-High Point, NC MSA","Reno-Sparks, NV MSA","Dallas-Fort Worth-Arlington, TX MSA","Terre Haute, IN MSA","San Diego-Carlsbad-San Marcos, CA MSA","Beaumont-Port Arthur, TX MSA","Boise City-Nampa, ID MSA","Tucson, AZ MSA","Birmingham-Hoover, AL MSA","Jacksonville, FL MSA","El Paso, TX MSA","Shreveport-Bossier City, LA MSA","Kokomo, IN MSA","Altoona, PA MSA","Brownsville-Harlingen, TX MSA","Anniston-Oxford, AL MSA","Bakersfield, CA MSA","Virginia Beach-Norfolk-Newport News, VA-NC MSA","Duluth, MN-WI MSA","St. Louis, MO-IL MSA"];

        var modal = this.$el.html(minerva.templates.terraSimilarityWidget({
            locations: locations.sort(),
            covars: _this.covariates()
        })).girderModal(this).on('ready.girder.modal', _.bind(function () {
        }, this));

        modal.trigger($.Event('ready.girder.modal', {relatedTarget: modal}));

        return this;
    }
});
