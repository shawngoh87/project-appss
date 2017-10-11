// Init App
var myApp = new Framework7({
    modalTitle: 'Project Appss',
    // Enable Material theme
    material: true,
});

// Expose Internal DOM library
var $$ = Dom7;

// Add main view
var mainView = myApp.addView('.view-main', {
});

//------------------------------------------
// Check Whether User has signed in or not
//------------------------------------------
firebase.auth().onAuthStateChanged(function (user) {
    if (user) {
        // User is signed in.
        mainView.router.loadPage("main.html");
    }
    //else {
    //    
    //}
});

//--------------------------
// Login Authentication
//-------------------------
$$('.button-login').on('click', function () {
    var si_email = $$('.user-email').val();
    var si_password = $$('.password').val();

    firebase.auth().signInWithEmailAndPassword(si_email, si_password).catch(function (error) {
        // Handle Errors here.
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
})

//--------------------
// Go to Sign up Page
//--------------------
$$('.button-signup').on('click', function () {
    mainView.router.loadPage("signup.html");
})

//---------------------------
//FUnction to remove vehicle
//---------------------------
function removeVehicle(item) {
    myApp.modal({
        title: 'Delete?',
        buttons: [
          {
              text: 'Cancel',
              onClick: function () {/* Do Nothing */ }
          },
          {
              text: 'Ok',
              onClick: function () {
                  //remove from database
                  carRef.child($$(item).closest('.card').find('.owned-car').text()).remove();

                  $$(item).closest('.card').remove();
              }
          },
        ]
    })
}


myApp.onPageInit('profile-settings', function (page) {

});
myApp.onPageInit('profile-help', function (page) {

});
function myactive() {
    $$("#tab-profile").addClass("active")
    $$("#tab-park").removeClass("active")
}

myApp.onPageInit('main', function (page) {

    user = firebase.auth().currentUser;
    userRef = firebase.database().ref('users/' + user.uid);
    carRef = userRef.child('cars');
    var tokenNO, tokenReq, tokenBal, parkDuration, carPlate, confirmText;
    var ownedCar, timeStamp, selectedCar = false, selectedDuration = false;

    

    //-----------------------
    //Initiate UI
    //-----------------------
    
    //Get cars and update
    carRef.once('value').then(function (snapshot) {
        for (var ownedCarPlate in snapshot.val()) {
            var str1 = '<div class="card"> <div class="card-content"> <div class="list-block"> <ul> <li> <div class="item-content"> <div class="item-inner"> <div class="item-title"> <div class="owned-car">';
            var str2 = '</div><div class="cards-item-title">';
            var str3 = '</div></div><div class="item-after"><a href="vehicle-history.html" class="override-icon-color" href="main.html#tab-history"><i class="material-icons override-icon-size item-link">history</i></a> <div class="no-colour">o</div> <a class="override-icon-color" href="#" onclick="removeVehicle(this);"><i class="material-icons override-icon-size item-link">cancel</i></a> </div> </div> </div> </li> </ul> </div> </div> </div>';
            $$('#tab-vehicle').append(str1 + ownedCarPlate + str2 + snapshot.child(ownedCarPlate).child('Hint').val() + str3);

            var parkingActive = snapshot.child(ownedCarPlate).child('Parking').child('Active').val();
            var parkingDuration = snapshot.child(ownedCarPlate).child('Parking').child('Duration').val();
            var parkingTimestamp = snapshot.child(ownedCarPlate).child('Parking').child('Timestamp').val();
            if (parkingActive == true) {
                if (parkingDuration + parkingTimestamp < Math.floor(Date.now())) {
                    carRef.child(ownedCarPlate).child('Parking').update({
                        Active: false,
                        Duration: 0
                    })
                }
            }
        }
    });
    //Get tokens
    userRef.child('balance').once('value').then(function (snapshot) {
        $$('.token').html(+snapshot.val().toFixed(2));
    })


    //---------------------------------------
    // Get Car Select List from Vehicle Tab
    //---------------------------------------
    $$('.select-car-menu').on('click', function () {
        $$('.car-choice').remove();
        ownedCar = [];

        $$('.owned-car').each(function () {
            ownedCar.push($$(this).text());
        });

        if (ownedCar.length <= 0) {
            myApp.alert('Please add your car', 'Notification');
        }
        else {
            carRef.once('value').then(function(snapshot){
                for (var ownedCarPlate in snapshot.val()) {

                    var parkingActive = snapshot.child(ownedCarPlate).child('Parking').child('Active').val();
                    var parkingDuration = snapshot.child(ownedCarPlate).child('Parking').child('Duration').val();
                    var parkingTimestamp = snapshot.child(ownedCarPlate).child('Parking').child('Timestamp').val();
                    if (parkingActive) {
                        if (parkingDuration + parkingTimestamp < Math.floor(Date.now())) {
                            carRef.child(ownedCarPlate).child('Parking').update({
                                Active: false,
                                Duration: 0
                            })
                            $$(".select-car").append(
                            '<li><label class="label-radio item-content car-choice">' +
                            '<input type="radio" name="car-plate" value="' + ownedCarPlate + '" />' +
                            '<div class="item-media"><i class="icon icon-form-radio"></i></div>' +
                            '<div class="item-inner">' +
                            '<div class="item-title">' + ownedCarPlate + '</div>' +
                            '</div>' +
                            '</label></li>'
                            );
                        }
                    }
                    else {
                        $$(".select-car").append(
                            '<li><label class="label-radio item-content car-choice">' +
                            '<input type="radio" name="car-plate" value="' + ownedCarPlate + '" />' +
                            '<div class="item-media"><i class="icon icon-form-radio"></i></div>' +
                            '<div class="item-inner">' +
                            '<div class="item-title">' + ownedCarPlate + '</div>' +
                            '</div>' +
                            '</label></li>'
                            );
                    }
                }
            })
        }
    });

    //--------------------
    // Get Selected Car
    //--------------------
    $$('.select-car').on('click', function () {
        carPlate = $$('input[name=car-plate]:checked').val();
        $$('.selected-car-plate').html(carPlate);
        $$('.selected-car-logo').css('color', 'blue');
        selectedCar = true;
        $$('#close-popover-menu').click();
    })

    //----------------------------------
    // Get Selected Duration Function
    //----------------------------------
    $$('.select-duration').on('click', function () {
        parkDuration = +$$('input[name=duration]:checked').val();
        if (parkDuration > 1) {
            $$('.selected-duration').html(parkDuration + ' Hours');
        }
        else {
            $$('.selected-duration').html(parkDuration + ' Hour');
        }
        $$('.selected-duration-logo').css('color', 'blue');
        selectedDuration = true;
        $$('#close-popover-menu').click();
    })

    //-----------------------
    // Pay Button Function
    //-----------------------
    $$('.confirm-payment').on('click', function () {
        if (selectedCar && selectedDuration) {
            tokenReq = parkDuration * 2;
            confirmText =
                'Selected Car is&emsp;&emsp;&nbsp:' + carPlate.toString() + '<br>' +
                'Duration is&emsp;&emsp;&emsp;&emsp;:' + $$('.selected-duration').text() + '<br>' +
                'Token required is &emsp;:' + tokenReq.toString() + '<br><br>' +
                'Confirm Transaction?';
            myApp.confirm(confirmText, 'Confirmation', function () {
                userRef.child('balance').once('value').then(function (snapshot) {
                    tokenNo = snapshot.val();
                    tokenBal = tokenNo - tokenReq;
                    if (tokenBal < 0) {
                        myApp.alert('Insufficient balance.', 'Notification');
                    }
                    else {
                        myApp.alert('Transaction is done successfully. Thank You!', 'Confirmation');
                        userRef.update({
                            balance: tokenBal
                        })
                        $$('.token').html(+tokenBal.toFixed(2));
                        $$('.selected-car-plate').html('Select Car');
                        $$('.selected-duration').html('Duration');
                        $$('.selected-car-logo').css('color', 'inherit');
                        $$('.selected-duration-logo').css('color', 'inherit');
                        selectedCar = false;
                        selectedDuration = false;
                        $$('#tab-history-button').click();
                        $$('#tab-active-button').click();
                        timestamp = Math.floor(Date.now());
                        carRef.child(carPlate).child('Parking').update({
                            Active: true,
                            Timestamp: timestamp,
                            Duration: parkDuration * 3600000
                        })
                    }
                })
            });

        }
        else if (selectedCar) {
            myApp.alert('Please select your duration! Stupid!', 'Notification');
        }
        else if (selectedDuration) {
            myApp.alert('Please select your car! Stupid!', 'Notification');
        }
        else {
            myApp.alert('Please select your car and duration! Stupid!', 'Notification');
        }
    });


    // Vehicle Tab - modal for adding vehicles
    $$('.modal-vehicle').on('click', function () {
        myApp.modal({
            title: 'Add vehicle',
            afterText: '<div class="input-field"><input type="text" id="txt-car-plate" class="modal-text-input" placeholder="Car plate"></div><div class="input-field"><input type="text" id="txt-car-hint" class="modal-text-input" placeholder="Hint"></div>',
            buttons: [
              {
                  text: 'Cancel',
                  onClick: function () {/* Do Nothing */ }
              },
              {
                  text: 'Ok',
                  onClick: function () {
                      //Car Plate Format
                      var displayCarPlate = $$('#txt-car-plate').val().toUpperCase().replace(/ /g,'');
                            
                      //write into database
                      carRef.child(displayCarPlate).update({
                          Hint: $$('#txt-car-hint').val()
                      });

                      //write to UI
                      var str1 = '<div class="card"> <div class="card-content"> <div class="list-block"> <ul> <li> <div class="item-content"> <div class="item-inner"> <div class="item-title"> <div class="owned-car">';
                      var str2 = '</div><div class="cards-item-title">';
                      var str3 = '</div></div><div class="item-after"><a href="vehicle-history.html" class="override-icon-color"  ><i class="material-icons override-icon-size item-link">history</i></a> <div class="no-colour">o</div> <a class="override-icon-color" href="#" onclick="removeVehicle(this);"><i class="material-icons override-icon-size item-link">cancel</i></a> </div> </div> </div> </li> </ul> </div> </div> </div>';
                      
                      $$('#tab-vehicle').append(str1 + displayCarPlate + str2 + $$('#txt-car-hint').val() + str3);

                  }
              },
            ]
        })
    });

    $$('.confirm-title-ok').on('click', function () {
        myApp.confirm('Are you sure to logout?', 'Logout', function () {
            firebase.auth().signOut().then(function () {
                // Sign-out successful.
                mainView.router.back();     // cant use router.loadPage(index.html), there are some issue
            }).catch(function (error) {
                // An error happened.
            });
            myApp.alert('Successfully logout!!!');
        });
    });
});

myApp.onPageInit('signup', function (page) {
    var su_email;
    var su_password;
    var su_username;
    var su_phone;

    //-----------------------------
    // back button function
    //-----------------------------
    $$('.signup-back').on('click', function () {
        mainView.router.back();
    })

    //-----------------------------
    // submit button for signUp 
    //-----------------------------
    $$('.button-signup-submit').on('click', function () {
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

            firebase.auth().createUserWithEmailAndPassword(su_email, su_password).then(function (data) {
                //--------------------------------
                // Set user info to database
                //--------------------------------
                curr_user = firebase.auth().currentUser;
                firebase.database().ref('users/' + curr_user.uid).set({
                    email: su_email,
                    username: su_username,
                    phone_no: su_phone,
                    balance: 0
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

