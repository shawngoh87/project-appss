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
                  firebase.database().ref('users/' + user.uid + '/cars/' + $$(item).closest('.card').find('.owned-car').text()).remove();
                  // TODO: Add validation/trimming function (refer to jom.js)
                  $$(item).closest('.card').remove();
              }
          },
        ]
    })
}

myApp.onPageInit('main', function (page) {

    user = firebase.auth().currentUser;
    carRef = firebase.database().ref('users/' + user.uid + '/cars');
    var tokenNO, tokenReq, tokenBal, parkDuration, carPlate, confirmText;
    var ownedCar, selectedCar = false, selectedDuration = false;

    $$('.button-logout').on('click', function () {
        firebase.auth().signOut().then(function () {
            // Sign-out successful.
            mainView.router.back();     // cant use router.loadPage(index.html), there are some issue
        }).catch(function (error) {
            // An error happened.
        });
    })

    //-----------------------
    //Initiate UI
    //-----------------------
    
    //Get cars and update
    carRef.once('value').then(function (snapshot) {
        for (var ownedCarPlate in snapshot.val()) {
            var str1 = '<div class="card"> <div class="card-content"> <div class="list-block"> <ul> <li> <div class="item-content"> <div class="item-inner"> <div class="item-title"> <div class="owned-car">';
            var str2 = '</div>';
            var str3 = '</div> <div class="item-after"><a href="#" class="override-icon-color" onclick="removeVehicle(this);"><i class="material-icons override-icon-size item-link">cancel</i></a></div> </div> </div> </li> </ul> </div> </div> </div>';
            $$('#tab-vehicle').append(str1 + ownedCarPlate + str2 + snapshot.child(ownedCarPlate).child('Hint').val() + str3);
        }
    });


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
            for (var i = 0; i < ownedCar.length; i++) {
                $$(".select-car").append(
                    '<li><label class="label-radio item-content car-choice">' +
                    '<input type="radio" name="car-plate" value="' + ownedCar[i] + '" />' +
                    '<div class="item-media"><i class="icon icon-form-radio"></i></div>' +
                    '<div class="item-inner">' +
                    '<div class="item-title">' + ownedCar[i] + '</div>' +
                    '</div>' +
                    '</label></li>'
                    );
            }
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
            tokenNo = +$$('.token').text();
            tokenReq = parkDuration * 2;
            tokenBal = tokenNo - tokenReq;
            confirmText =
                'Selected Car is&emsp;&emsp;&nbsp:' + carPlate.toString() + '<br>' +
                'Duration is&emsp;&emsp;&emsp;&emsp;:' + $$('.selected-duration').text() + '<br>' +
                'Token required is &emsp;:' + tokenReq.toString() + '<br><br>' +
                'Confirm Transaction?';
            myApp.confirm(confirmText, 'Confirmation', function () {
                if (tokenBal < 0) {
                    myApp.alert('Insufficient balance.', 'Notification');
                }
                else {
                    myApp.alert('Transaction is done successfully. Thank You!', 'Confirmation');
                    $$('.token').html(tokenBal.toString());
                    $$('.selected-car-plate').html('Select Car');
                    $$('.selected-duration').html('Duration');
                    $$('.selected-car-logo').css('color', 'inherit');
                    $$('.selected-duration-logo').css('color', 'inherit');
                    selectedCar = false;
                    selectedDuration = false;
                    $$('#tab-history-button').click();
                    $$('#tab-active-button').click();
                }
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
                           
                            
                      //write into database

                      firebase.database().ref('users/' + user.uid + '/cars/' + $$('#txt-car-plate').val().toUpperCase()).update({
                          Hint: $$('#txt-car-hint').val()
                      });

                      var str1 = '<div class="card"> <div class="card-content"> <div class="list-block"> <ul> <li> <div class="item-content"> <div class="item-inner"> <div class="item-title"> <div class="owned-car">';
                      var str2 = '</div>';
                      var str3 = '</div> <div class="item-after"><a href="#" class="override-icon-color" onclick="removeVehicle(this);"><i class="material-icons override-icon-size item-link">cancel</i></a></div> </div> </div> </li> </ul> </div> </div> </div>';
                      var STR = '<div class="card"> <div class="card-content"> <div class="list-block"> <ul> <li> <div class="item-content"> <div class="item-inner"> <div class="item-title"> <div>ABC 1111</div> <div class="cards-item-title">Name</div> </div> <div class="item-after"><a href="#" class="override-icon-color" onclick="removeVehicle(this);"><i class="material-icons override-icon-size item-link">cancel</i></a></div> </div> </div> </li> </ul> </div> </div> </div>';
                      $$('#tab-vehicle').append(str1 + $$('#txt-car-plate').val().toUpperCase() + str2 + $$('#txt-car-hint').val() + str3);

                  }
              },
            ]
        })
    });

});