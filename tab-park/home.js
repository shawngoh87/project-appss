var user = firebase.auth().currentUser;
//------------------------------
// Update password
//------------------------------
$$('#change-password').on('click', function () {
	if ($$('#new-password').val() == $$('#confirm-new-password').val()) {
		user.updatePassword($$('#new-password').val()).then(function () {
			// Update successful.
			myApp.alert('Your password is updated');
		}).catch(function (error) {
			// An error happened.
		});
	} else
		myApp.alert('Password and confirm password does not match','Error!');
})

//-------------------
// Init App
//-------------------
var myApp = new Framework7({
    modalTitle: 'Project Appss',
    // Enable Material theme
    material: true
});

// Expose Internal DOM library
var $$ = Dom7;

// Add main view
var mainView = myApp.addView('.view-main', {
});

//--------------------
// Go to Sign up Page
//--------------------
$$('.button-signup').on('click', function () {
    mainView.router.loadPage("signup.html");
})

//------------------------------------------
// Check Whether User has signed in or not
//------------------------------------------
firebase.auth().onAuthStateChanged(function (user) {
    if (user) {
        // User is signed in.
        if (!user.emailVerified)                // Reminder: NOT the condition.
            // email succesfully verified
            mainView.router.loadPage("main.html");
        else {
            // not yet verifiy email
            myApp.alert('An email verification has been sent to you. Please verify it before signing in.', 'Notification');
            firebase.auth().signOut().then(function () { }).catch(function (error) { });
        }
    } else {
        // No user is signed in.   
    }
});

//--------------------------
// Login Authentication
//-------------------------
$$('.button-login').on('click', function () {

    var user = firebase.auth().currentUser;
    var si_email = $$('.user-email').val();
    var si_password = $$('.password').val();

    firebase.auth().signInWithEmailAndPassword(si_email, si_password).catch(function (error) {
        // Handle Log In Errors here.
        var errorCode = error.code;
        var errorMessage = error.message;
        if (errorCode == "auth/user-disabled")
            myApp.alert(errorMessage, 'Error');
        else if (errorCode == "auth/invalid-email")
            myApp.alert(errorMessage, 'Error');
        else if (errorCode == "auth/user-not-found")
            myApp.alert(errorMessage, 'Error');
        else if (errorCode == "auth/wrong-password")
            myApp.alert(errorMessage, 'Error');
    });
    firebase.database().ref('users/' + user.uid).set({
        cars: 'bmw_789_merc'
    });
});

//----------------------------------
// Forget Password button function
//----------------------------------
$$('#forget-password').on('click', function () {
    myApp.prompt('Enter your email address below and a password reset email will be sent to you.', 'Forget Password?', function (fp_email) {
        if (fp_email == "") {
            myApp.alert('Please try again to enter your email address.', 'Error');
        }
        else {
            firebase.auth().sendPasswordResetEmail(fp_email).then(function () {
                // Email sent.
                myApp.alert("Email is sent.");
            }).catch(function (error) {
                // An error happened.
            });
        }
    });
});    

// Global user position Var
var user_pos = {
    lat: 0,
    lng: 0,
    city: 'none',
    full_addr: 'none'
};
var geo_accuracy;

myApp.onPageInit('signup', function (page) {
    var su_email;
    var su_password;
    var su_username;
    var su_phone;
    var su_ic;

    //-----------------------------
    // back button function
    //-----------------------------
    $$('#button-signup-back').on('click', function () {
        mainView.router.back();
    })

    //-----------------------------
    // submit button for signUp 
    //-----------------------------
    $$('#button-signup-submit').on('click', function () {
        if ($$('#su-email').val() == "") {
            //empty email input textbox case
            myApp.alert('Please enter your email.', 'Error');
        }
        else if ($$('#su-password').val() == "") {
            //empty password input textbox case
            myApp.alert('Please enter your password.', 'Error');
        }
        else if ($$('#su-username').val() == "") {
            //empty username input textbox case
            myApp.alert('Please enter your username.', 'Error');
        }
        else if ($$('#su-phone-no').val() == "") {
            //empty phone number input textbox case
            myApp.alert('Please enter your phone number.', 'Error');
        }
        else if ($$('#su-password').val() !== $$('#su-confirm-password').val()) {
            // password does not match confirm password
            myApp.alert('Password and Confirm Password does not match. Please try again.', 'Error');
        }
        else {
            su_email = $$('#su-email').val();
            su_password = $$('#su-password').val();
            su_username = $$('#su-username').val();
            su_phone = $$('#su-phone-no').val();
            su_ic = $$('#su-ic').val();

            firebase.auth().createUserWithEmailAndPassword(su_email, su_password).then(function (data) {
                var curr_user = firebase.auth().currentUser;
                //--------------------------------
                // Sent email verification
                //--------------------------------
                curr_user.sendEmailVerification().then(function () {
                    // Email sent.                    
                }).catch(function (error) {
                    // An error happened.
                });

                //--------------------------------
                // Set user info to database
                //--------------------------------               
                firebase.database().ref('users/' + curr_user.uid).set({
                    email: su_email,
                    username: su_username,
                    phone_no: su_phone,
                    balance: 0,
                    IC: su_ic
                });

                //------------------------------
                // force sign out after sign up
                //------------------------------
                firebase.auth().signOut().then(function () {
                    // Sign-out successful.                    
                    mainView.router.back();
                }).catch(function (error) {
                    // An error happened.
                });

            }).catch(function (error) {
                // Handle Sign Up Errors here.
                var errorCode = error.code;
                var errorMessage = error.message;
                if (errorCode == "auth/email-already-in-use")
                    myApp.alert(errorMessage, 'Error');
                else if (errorCode == "auth/invalid-email")
                    myApp.alert(errorMessage, 'Error');
                else if (errorCode == "auth/operation-not-allowed")
                    myApp.alert(errorMessage, 'Error');
                else if (errorCode == "auth/weak-password")
                    myApp.alert(errorMessage, 'Error');
            });

        }
    })
});

myApp.onPageInit("main", function (page) {

    //-------------------
    // sign out button
    //-------------------
    $$('#log-out').on('click', function () {
        firebase.auth().signOut().then(function () {
            // Sign-out successful.
            mainView.router.back();     // cant use router.loadPage("index.html"), there are some issue
        }).catch(function (error) {
            // An error happened.
        });
    })

    var user = firebase.auth().currentUser;
    userRef = firebase.database().ref('users/' + user.uid);
    carRef = userRef.child('cars');
    carPlate = 'bmw_789_merc';

    $$('#go-pay').on('click', function () {
        // demo update coordinate to database
        carRef.child(carPlate).update({
            coord: {
                lat: user_pos["lat"],
                lng: user_pos["lng"],
                city: user_pos["city"],
                full_addr: user_pos["full_addr"]
            }
        });
    })
});

myApp.onPageInit("select-location", function (page) {

    var default_pos = {
        lat: 0,
        lng: 0,
        city: 'none',
        full_addr: 'none'
    };

    var selfset_pos = {
        lat: 0,
        lng: 0,
        city: 'none',
        full_addr: 'none'
    };

    // User click use default location button function
    $$('#use-default-loca').on('click', function () {
        user_pos['lat'] = default_pos['lat'];
        user_pos['lng'] = default_pos['lng'];
        user_pos['city'] = default_pos['city'];
        user_pos['full_addr'] = default_pos['full_addr'];
        mainView.router.back();
    })

    // User click use self-set location button function
    $$('#use-selfset-loca').on('click', function () {
        user_pos['lat'] = selfset_pos['lat'];
        user_pos['lng'] = selfset_pos['lng'];
        user_pos['city'] = selfset_pos['city'];
        user_pos['full_addr'] = selfset_pos['full_addr'];
        mainView.router.back();
    })
    
    initMap();    

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
                    lat: place.geometry.location.lat(),
                    lng: place.geometry.location.lng()
                };
                geocodeLatLng(pos, selfset_pos)

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
                    $$('#default-address').html('Accuracy: ' + geo_accuracy + ' (High value = low accuracy)<br>' + default_pos['full_addr']);  // display full address 

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
                default_pos['lat'] = position.coords.latitude;
                default_pos['lng'] = position.coords.longitude;
                geo_accuracy = position.coords.accuracy;
                map.setCenter(pos);
                addMarker(pos, map);
                geocodeLatLng(pos, default_pos);                
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
