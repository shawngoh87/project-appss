#nearby-map {
    position: absolute;
    height: 45%;
    width: 90%;
    top: 10%;
    left: 5%;
}


<div class="navbar">
	<div class="navbar-inner">
		<div class="left"><a href="profile.html" class="back link icon-only"><i class="icon icon-back"></i></a></div>
		<div class="center"><h1 id="profile-title">Location</h1></div>
		<div class="right"></div>
	</div>
</div>

<div class="page-content">
	<div id="nearby-map"></div>
</div>


var nearby_map = new google.maps.Map(document.getElementById('nearby-map'), {
	center: { lat: -34.397, lng: 150.644 },
	zoom: 18
});
var nearbyMarkers = [];
var nearbyInfo = [];

createMap(nearby_map);

//--------------
// init map
//--------------
function createMap(map) {
	// Try HTML5 geolocation.
	if (navigator.geolocation) {
		navigator.geolocation.getCurrentPosition(function (position) {
			var pos = {
				lat: position.coords.latitude,
				lng: position.coords.longitude
			};
			map.setCenter(pos);

			// Create a infowindow for each place.
			var contentString = '<h4>Your location</h4>';
			var infowindow = new google.maps.InfoWindow({
				content: contentString
			});
			nearbyInfo.push(infowindow);

			// Create a marker for each place.
			nearbyMarkers.push(new google.maps.Marker({
				map: nearby_map,
				position: pos,                    
			}));

			google.maps.event.addListener(nearbyMarkers[0], 'click', function () {  
				nearbyInfo[0].open(nearby_map, nearbyMarkers[0]);

			});

			nearbySearch(map, pos);
		}, function () {
			myApp.alert("Ops! Geolocation service failed.", "Message");
		});
	}
	else {
		// Device doesn't support Geolocation
		myApp.alert("Device does not support geolocation.", "Message");
	}
}

//-------------------------------
// Search nearby POI
//-------------------------------
function nearbySearch(map, pos) {
	var request = {
		location: pos,
		radius: '250',          // unit is in meters (value now is 250m)
		type: ['restaurant']
	};
	var service = new google.maps.places.PlacesService(map);
	service.nearbySearch(request, displayNearby);
}

//-------------------------------
// Display nearby POI on apps
//-------------------------------
function displayNearby(results, status) {
	if (status === google.maps.places.PlacesServiceStatus.OK) {
		for (var i = 0; i < results.length; i++) {
			var pos = {
				lat: results[i].geometry.location.lat(),
				lng: results[i].geometry.location.lng()
			};

			// Create a infowindow for each place.
			var contentString = '<h4>' + results[i].name + '</h4>';
			var infowindow = new google.maps.InfoWindow({
				content: contentString
			});
			nearbyInfo.push(infowindow);

			// Create a marker for each place.    
			var iconBase = 'https://maps.google.com/mapfiles/kml/shapes/';
			nearbyMarkers.push(new google.maps.Marker({
				map: nearby_map,
				position: pos,     
				icon: iconBase + 'dining_maps.png'
			}));                

			google.maps.event.addListener(nearbyMarkers[i+1], 'click', function (innerKey) {
				return function () {
					nearbyInfo[innerKey].open(nearby_map, nearbyMarkers[innerKey]);
				}
			}(i+1));
		}
	}
}