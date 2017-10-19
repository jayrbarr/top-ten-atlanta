// JavaScript Document

// This global callback function 
// helps catch authentication errors in Google Maps API
// Posts an alert when error received
function gm_authFailure() {
    "use strict";
    alert('Google maps failed to load!');
}

/* ======= Restaurant Model =======
 * Creates Restaurant object with Knockoutjs observables
 * Location is saved as lat,lng object to help facilitate
 * creation of map markers through Google Maps API later.
 * Category must match one of the Cuisines in order for 
 * drop-down sort to work. Selected controls the data-bind
 * for the css selector that highlights the last clicked
 * restaurant in the listview.
 */
var Restaurant = function (data) {
    "use strict";
    this.id = data.id;
    this.name = data.name;
    this.location = {
        lat: data.lat,
        lng: data.lng
    };
    this.category = data.category;
    this.selected = ko.observable(false);
};

/* ======= ViewModel ======= */

var ViewModel = function () {

    "use strict";

    // preserve the ViewModel binding context as a variable
    var self = this;

    // global array to hold map markers for ViewModel and Maps API
    var markers = [];

    // create empty KnockoutJS ObservableArray to hold Restaurants
    this.restaurantList = ko.observableArray([]);

    // iterate over initialRestaurants data to load Restaurants into array
    initialRestaurants.forEach(function (restaurant) {
        self.restaurantList.push(new Restaurant(restaurant));
    });

    // set most recently-clicked Restaurant - initialize as 0
    // in array, currently "The Varsity"
    this.currentRestaurant = ko.observable(self.restaurantList()[0]);

    // create empty KnockoutJS ObservableArray to hold Cuisines
    this.cuisines = ko.observableArray([]);

    // iterate over initialCuisines data to load Cuisines into array
    initialCuisines.forEach(function (cuisine) {
        self.cuisines.push(cuisine);
    });

    // set currently selected cuisine - initialize as 0 or "All"
    this.selectedCuisine = ko.observable(self.cuisines()[0]);

    // KnockoutJS computed function - data-binds to drop-down
    // select in HTML view. Filters restaurantList accordingly.
    this.filteredRestaurants = ko.computed(function () {
        if (self.selectedCuisine() === self.cuisines()[0]) {
            return self.restaurantList();
        } else {
            var selectedTemp = self.selectedCuisine();
            return ko.utils.arrayFilter(self.restaurantList(), function (rest) {
                return rest.category() === selectedTemp;
            });
        }
    });

    // Sets KnockoutJS subscribe on selectedCuisine to 
    // display the associated map markers for selected cuisine.
    this.selectedCuisine.subscribe(function (newCuisine) {
        if (newCuisine === self.cuisines()[0]) {
            self.displayMarkers(0, 16);
        } else if (newCuisine === self.cuisines()[1]) {
            self.displayMarkers(0, 4);
        } else if (newCuisine === self.cuisines()[2]) {
            self.displayMarkers(5, 9);
        } else if (newCuisine === self.cuisines()[3]) {
            self.displayMarkers(10, 13);
        } else if (newCuisine === self.cuisines()[4]) {
            self.displayMarkers(14, 16);
        }
    });

    // First, clears any previously set highlight on restaurantList
    // by setting selected to false on all Restaurants. Then,
    // sets selected to true on data-bind click Restaurant.
    // Also calls populateInfoWindow to highlight map marker and
    // open infoWindow for clicked Restaurant.
    this.highlightRestaurant = function (restaurant) {
        for (var i = 0; i < self.restaurantList().length; i++) {
            self.restaurantList()[i].selected(false);
        }
        self.currentRestaurant(restaurant);
        self.currentRestaurant().selected(true);
        var index = self.restaurantList().indexOf(self.currentRestaurant());
        self.populateInfoWindow(markers[index], self.largeInfowindow);
    };

    /* =======  Map =======
     * Functions for Google Maps API to control Google Map and
     * map markers for app.
     */

    // Callback function for Google Maps API initialization
    this.initMap = function () {
        // Styles array to control map appearance.
        // Used below in initial maps call.
        // Adapted from course code, New York Listings
        var styles = [{
            featureType: 'water',
            stylers: [{
                color: '#19a0d8'
            }]
        }, {
            featureType: 'administrative',
            elementType: 'labels.text.stroke',
            stylers: [{
                color: '#ffffff'
            }, {
                weight: 6
            }]
        }, {
            featureType: 'administrative',
            elementType: 'labels.text.fill',
            stylers: [{
                color: '#e85113'
            }]
        }, {
            featureType: 'road.highway',
            elementType: 'geometry.stroke',
            stylers: [{
                color: '#efe9e4'
            }, {
                lightness: -40
            }]
        }, {
            featureType: 'transit.station',
            stylers: [{
                weight: 9
            }, {
                hue: '#e85113'
            }]
        }, {
            featureType: 'road.highway',
            elementType: 'labels.icon',
            stylers: [{
                visibility: 'off'
            }]
        }, {
            featureType: 'water',
            elementType: 'labels.text.stroke',
            stylers: [{
                lightness: 100
            }]
        }, {
            featureType: 'water',
            elementType: 'labels.text.fill',
            stylers: [{
                lightness: -100
            }]
        }, {
            featureType: 'poi',
            elementType: 'geometry',
            stylers: [{
                visibility: 'on'
            }, {
                color: '#f0e4d3'
            }]
        }, {
            featureType: 'road.highway',
            elementType: 'geometry.fill',
            stylers: [{
                color: '#efe9e4'
            }, {
                lightness: -25
            }]
        }];

        // Constructor creates a new map - only center and zoom are required.
        self.map = new google.maps.Map(document.getElementById('map'), {
            center: {
                lat: 33.7582458, // downtown Atlanta
                lng: -84.3885123
            },
            zoom: 15,
            styles: styles, // from array above
            mapTypeControl: false // turn off terrain, satellite controls
        });

        // Create elements for marker creation and highlighting
        self.largeInfowindow = new google.maps.InfoWindow();
        self.defaultIcon = self.makeMarkerIcon('0091ff');
        self.highlightedIcon = self.makeMarkerIcon('FFFF24');

        // restaurantList length determines number of markers needed
        var len = self.restaurantList().length;

        // make sure we have restaurants
        if (len > 0) {
            // if so, define marker bounds
            var bounds = new google.maps.LatLngBounds();
            // create a marker for each Restaurant from restaurantList
            for (var i = 0; i < len; i++) {
                var position = self.restaurantList()[i].location;
                var title = self.restaurantList()[i].name;
                var marker = new google.maps.Marker({
                    position: position,
                    title: title,
                    animation: google.maps.Animation.DROP,
                    icon: self.defaultIcon,
                    id: i
                });
                marker.setMap(this.map); // put marker on map
                markers.push(marker); // add marker to global markers array

                // set click listener for each marker id
                this.markerClick(marker);

                // if necessary, extend bounds to fit markers created
                bounds.extend(marker.position);
            }
            this.map.fitBounds(bounds);
        }
    };

    this.markerClick = function (markerCopy) {
        markerCopy.addListener('click', function () {
            self.highlightRestaurant(self.restaurantList()[markerCopy.id]);
        });
    };

    // This function takes in a COLOR, and then creates a new marker
    // icon of that color. The icon will be 21 px wide by 34 high, have an origin
    // of 0, 0 and be anchored at 10, 34).
    // Adapted from course code, New York Listings
    this.makeMarkerIcon = function (markerColor) {
        var markerImage = new google.maps.MarkerImage(
            'http://chart.googleapis.com/chart?chst=d_map_spin&chld=1.15|0|' + markerColor +
            '|40|_|%E2%80%A2',
            new google.maps.Size(21, 34),
            new google.maps.Point(0, 0),
            new google.maps.Point(10, 34),
            new google.maps.Size(21, 34));
        return markerImage;
    };

    // Displays markers in a range from start to stop. Markers array index
    // matches restaurantList array index. So each marker corresponds to
    // Restaurant from restaurantList. Range should capture Restaurants
    // matching a cuisine type. Therefore, all Restaurants need to be sorted
    // by cuisine in restaurantList to have simple range for cuisine type.
    this.displayMarkers = function (start, stop) {
        if (markers.length === 0) {
            return true;
        }
        for (var i = 0; i < start; i++) {
            markers[i].setMap(null);
        }
        for (i = start; i <= stop; i++) {
            markers[i].setMap(this.map);
        }
        for (i = stop + 1; i < 17; i++) {
            markers[i].setMap(null);
        }
    };

    // Clears all animation and highlighting from all markers.
    this.clearMarkers = function () {
        var len = self.restaurantList().length;
        for (var i = 0; i < len; i++) {
            markers[i].setAnimation(null);
            markers[i].setIcon(self.defaultIcon);
        }
    };

    // This function populates the infowindow when the marker is clicked. We'll only allow
    // one infowindow which will open at the marker that is clicked, and populate based
    // on that markers position.
    this.populateInfoWindow = function (marker, infowindow) {
        // Check to make sure the infowindow is not already opened on this marker.
        if (infowindow.marker !== marker) {
            self.clearMarkers();
            marker.setIcon(self.highlightedIcon);
            marker.setAnimation(google.maps.Animation.BOUNCE);
            setTimeout(function () {
                marker.setAnimation(null)
            }, 2000);
            // Clear the infowindow content. Gives JSON get time to load.
            infowindow.setContent('');
            infowindow.marker = marker;
            // Make sure the marker property is cleared if the infowindow is closed.
            infowindow.addListener('closeclick', function () {
                infowindow.marker = null;
                marker.setIcon(self.defaultIcon);
                marker.setAnimation(null);
                self.currentRestaurant().selected(false);
            });

            // prepare elements for JSON get from Foursquare API to fetch photo
            var restaurantID = self.restaurantList()[marker.id].id;
            var foursquarePrefix = "https://api.foursquare.com/v2/venues/";
            var foursquareSuffix = "/photos";

            // get JSON info from Foursquare for venue photo.
            $.getJSON(foursquarePrefix + restaurantID + foursquareSuffix, {
                    limit: 1, // only one photo required
                    v: "20170801",
                    client_id: "PP3RWERUTIA1OI3DNHTIKX4T2WSJ0L1UEXUXPEZ1Z2BFY2RM",
                    client_secret: "FNI4MCR2USHA21HA4V0RHS3SFHZ4GXSHLMZACQESYYUKAODT"
                }, function (data) {
                    // even if successful get, make sure Foursquare API retrieved a photo
                    if (data.response.photos.count === 0) {
                        // if not, display error message in infoWindow
                        infowindow.setContent('<div>' + marker.title + '</div>' +
                            '<div>No Image Found</div>');
                    } else {
                        // if so, set elements for photo in html src
                        var imagePrefix = data.response.photos.items[0].prefix;
                        var imageSuffix = data.response.photos.items[0].suffix;
                        var size = "300x300";
                        var credit = data.response.photos.items[0].source.name;
                        var creditUrl = data.response.photos.items[0].source.url;
                        infowindow.setContent('<div class="infoWindow"><p>' + marker.title + '</p><div><img src="' + imagePrefix + size + imageSuffix + '" alt="' + marker.title + ' picture" ></div><p>Image credit: <a href="' + creditUrl + '">' + credit + '</a></p></div>');
                    }
                })
                .fail(function () {
                    infowindow.setContent('<div>' + marker.title + '</div>' +
                        '<div>No Image Found</div>');
                    alert("Unable to retrieve photo.");
                });
            infowindow.open(self.map, marker); // open infoWindow on associated marker
        }
    };
};

// make it go!
var vm = new ViewModel();
ko.applyBindings(vm);
