//---------------------------
// Select Location function
//---------------------------
myApp.onPageInit("select-location", function (page) {

    var selfset = false;
    var selfset_pos = {
        lat: 0,
        lng: 0,
        city: 'none',
        full_addr: 'none'
    };

    // User click use self-set location button function
    $$('#use-selfset-loca').on('click', function () {
        if (selfset == true) {
            user_pos['lat'] = selfset_pos['lat'];
            user_pos['lng'] = selfset_pos['lng'];
            user_pos['city'] = selfset_pos['city'];
            user_pos['full_addr'] = selfset_pos['full_addr'];
        }
        //console.log(user_pos);
        mainView.router.back();
    })

    initMap();

    //-------------------------------
    // Search nearby POI
    //-------------------------------
    function nearbySearch(map, pos) {
        var request = {
            location: pos,
            radius: '400',          // unit is in meters (value now is 400m)
            type: ['restaurant']
        };

        var service = new google.maps.places.PlacesService(map);
        service.nearbySearch(request, displayNearby);
    }

    //-------------------------------
    // Display nearby POI on apps
    //-------------------------------
    function displayNearby(results, status) {
        if (status == google.maps.places.PlacesServiceStatus.OK) {
            for (var i = 0; i < results.length - 2; i++) {
                //var place = results[i].name;
                var POI_content_html = '<li><div class="item-inner item-content">' +
                                            '<div class="item-title-row">' +
                                                '<div class="item-title" id="POI-name">' + results[i].name + '</div>' +
                                                '<div class="item-after">ICON</div>' +
                                            '</div>' +
                                            '<div class="item-text" id="POI-addr">' + '' + '</div>' +
                                        '</div></li>';

                $$("#POI-content").append(POI_content_html);
            }
        }
    }

    //------------------------------------------------------
    // Allow user to set their own location using search box
    //------------------------------------------------------
    function initAutocomplete(map) {
        // Create the search box and link it to the UI element.
        var input = document.getElementById('pac-input');
        var searchBox = new google.maps.places.SearchBox(input);

        // Bias the SearchBox results towards current map's viewport.
        map.addListener('bounds_changed', function () {
            searchBox.setBounds(map.getBounds());
        });

        var markers = [];
        // Listen for the event fired when the user selects a prediction and retrieve
        // more details for that place.
        searchBox.addListener('places_changed', function () {
            var places = searchBox.getPlaces();

            if (places.length === 0) {
                return;
            }

            // Clear out the old markers.
            markers.forEach(function (marker) {
                marker.setMap(null);
            });
            markers = [];

            // For each place, get the icon, name and location.
            var bounds = new google.maps.LatLngBounds();
            places.forEach(function (place) {
                if (!place.geometry) {
                    myApp.alert("Returned place contains no geometry");
                    return;
                }
                var icon = {
                    url: place.icon,
                    size: new google.maps.Size(71, 71),
                    origin: new google.maps.Point(0, 0),
                    anchor: new google.maps.Point(17, 34),
                    scaledSize: new google.maps.Size(25, 25)
                };

                // Create a marker for each place.
                markers.push(new google.maps.Marker({
                    map: map,
                    icon: icon,
                    title: place.name,
                    position: place.geometry.location
                }));

                selfset_pos['lat'] = place.geometry.location.lat();
                selfset_pos['lng'] = place.geometry.location.lng();
                var pos = {
                    lat: selfset_pos['lat'],
                    lng: selfset_pos['lng']
                };
                geocodeLatLng(pos, selfset_pos);
                selfset = true;

                if (place.geometry.viewport) {
                    // Only geocodes have viewport.
                    bounds.union(place.geometry.viewport);
                } else {
                    bounds.extend(place.geometry.location);
                }
            });
            map.fitBounds(bounds);
        });
    }

    //-----------------------------
    // Add marker to map
    //-----------------------------
    function addMarker(location, map) {
        var marker = new google.maps.Marker({
            position: location,
            map: map
        });
    }

    //---------------------------------------
    // Full address and city name Geocoding
    //---------------------------------------
    function geocodeLatLng(latlng, obj) {
        var geocoder = new google.maps.Geocoder;
        geocoder.geocode({ 'location': latlng }, function (results, status) {
            if (status === 'OK') {
                if (results[0]) {
                    results[0].address_components.forEach(function (element2) {
                        element2.types.forEach(function (element3) {
                            switch (element3) {
                                case 'sublocality':
                                    city = element2.long_name;
                                    break;
                            }
                        })
                    });
                    obj['city'] = city
                    obj['full_addr'] = results[0].formatted_address;
                    $$('#default-address').html('Accuracy: ' + geo_accuracy + ' (High value = low accuracy)<br>' + user_pos['full_addr']);  // display full address 

                } else {
                    myApp.alert('No results found');
                }
            } else {
                myApp.alert('Geocoder failed due to: ' + status);
            }
        });
    }

    //---------------------------------
    // Only City name (Geocoding)
    //---------------------------------
    function geocodeCity(latlng) {
        var geocoder = new google.maps.Geocoder;
        geocoder.geocode({ 'location': latlng }, function (results, status) {
            if (status === 'OK') {
                if (results[0]) {

                    results[0].address_components.forEach(function (element2) {
                        element2.types.forEach(function (element3) {
                            switch (element3) {
                                case 'sublocality':
                                    city = element2.long_name;
                                    break;
                            }
                        })
                    });
                    $$('#default-address').html(city);  //demo: display city name

                } else {
                    myApp.alert('No results found');
                }
            } else {
                myApp.alert('Geocoder failed due to: ' + status);
            }
        });
    }

    //---------------------------------------
    // Create Map with default address
    //---------------------------------------
    function initMap() {
        var map = new google.maps.Map(document.getElementById('map'), {
            center: { lat: -34.397, lng: 150.644 },
            zoom: 18
        });

        // Try HTML5 geolocation.
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(function (position) {
                var pos = {
                    lat: position.coords.latitude,
                    lng: position.coords.longitude
                };
                user_pos['lat'] = position.coords.latitude;
                user_pos['lng'] = position.coords.longitude;
                geo_accuracy = position.coords.accuracy;
                map.setCenter(pos);
                addMarker(pos, map);
                geocodeLatLng(pos, user_pos);
                initAutocomplete(map);
            }, function () {
                myApp.alert("Ops! Geolocation service failed.", "Message");
            });
        }
        else {
            // Device doesn't support Geolocation
            myApp.alert("Device does not support geolocation.", "Message");
        }
    }
});