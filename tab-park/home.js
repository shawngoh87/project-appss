
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

myApp.onPageInit('index', function (page) {
    var firstTime = false;

    //--------------------
    // Go to Sign up Page
    //--------------------
    $$('.button-signup').on('click', function () {
        mainView.router.loadPage("signup.html");
    })

    //--------------------------
    // Login Authentication
    //-------------------------
    $$('.button-login').on('click', function () {
        var si_email = $$('.email').val();
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
    })

    //------------------------------------------
    // Check Whether User has signed in or not
    //------------------------------------------
    firebase.auth().onAuthStateChanged(function (user) {
        if (user) {
            // User is signed in.
            mainView.router.loadPage("main.html");
        } else {
            // No user is signed in.   
        }
    });
}).trigger();

myApp.onPageInit('signup', function (page) {    
    var su_email;
    var su_password;
    var su_username;
    var su_phone;

    //-----------------------------
    // back button function
    //-----------------------------
    $$('.back').on('click', function () {
        mainView.router.back();
    })

    //-----------------------------
    // submit button for signUp 
    //-----------------------------
    $$('.button-submit').on('click', function () {
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
                  // TODO: Add validation/trimming function (refer to jom.js)
                  $$(item).closest('.card').remove();
              }
          },
        ]
    })
}

myApp.onPageInit('main', function (page) {
    //Parking Info and Payment
    var carPlate, parkDuration, tokenReq, tokenBal, confirmText, tokenNo;
    var selectedCar = false, selectedDuration = false;

    var myCar;

    //-------------------
    // sign out button
    //-------------------
    $$('.button-signout').on('click', function () {
        firebase.auth().signOut().then(function () {
            // Sign-out successful.
            mainView.router.back();     // cant use router.loadPage("index.html"), there are some issue
        }).catch(function (error) {
            // An error happened.
        });
    })

    //---------------
    // car object
    //---------------
    function car(model, plateNo) {
        this.model = model;
        this.plateNo = plateNo;

        if (car.emptyCount == undefined)
            car.emptyCount = 1; // initialise variable        
        else
            car.emptyCount++;   // increment everytime a car object is created        

        this.add_to_list = function () {
            // html code for adding car item to popover menu
            var car_list_html = '<li><label class="label-radio item-content">' +
                                '<input type="radio" name="car-plate" value="' + this.plateNo + '" />' +
                                '<div class="item-media"><i class="icon icon-form-radio"></i></div>' +
                                '<div class="item-inner carItem">' +
                                '<div class="item-title">' + this.plateNo + ', ' + this.model + '</div>' +
                                '</div>' +
                                '</label></li>';

            $$(".select-car").append(car_list_html);    // add html code
        }
    };   

    //------------------------------------------------------
    // Check whether car list is empty before open car menu
    //------------------------------------------------------
    $$('#carSelector').on('click', function () {
        if (car.emptyCount > 0)
            // open popover car menu only if the menu is not empty
            myApp.popover('.popover-menu-car', this);
        else
            // empty car menu case
            myApp.alert('Please add your car in vehicle tab to proceed.', 'Message');
    })

    //----------------------------------
    // Get Selected Car Function
    //----------------------------------
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
        tokenNo = +$$('.token').text();
        if (selectedCar && selectedDuration) {
            tokenReq = parkDuration * 2;

            if ((tokenNo - tokenReq) < 0) {
                // Not enough token case
                myApp.alert('Ops! Insufficient Token. Please top up and try again.', 'Message');
            }
            else {
                confirmText =
                    'Selected Car is&emsp;&emsp;&nbsp:' + carPlate.toString() + '<br>' +
                    'Duration is&emsp;&emsp;&emsp;&emsp;:' + $$('.selected-duration').text() + '<br>' +
                    'Token required is &emsp;:' + tokenReq + '<br>' +
                    'Token balance is &emsp;&nbsp:' + (tokenNo - tokenReq) + '<br>' +
                    'Confirm Transaction?';

                myApp.confirm(confirmText, 'Confirmation', function () {
                    // User confirm payment case
                    tokenNo = tokenNo - tokenReq;    // update token number
                    myApp.alert('Transaction is done successfully. Thank You!', 'Message');
                    $$('.token').html(tokenNo);
                    $$('.selected-car-plate').html('Select Car');
                    $$('.selected-duration').html('Duration');
                    $$('.selected-car-logo').css('color', 'inherit');
                    $$('.selected-duration-logo').css('color', 'inherit');
                    selectedCar = false;
                    selectedDuration = false;
                });
            }
        }
        else {
            myApp.alert('Please select your car and duration! Stupid!', 'Notification');
        }
    });


    // Vehicle Tab - modal for adding vehicles
    $$('.modal-vehicle').on('click', function () {
        myApp.modal({
            title: 'Add vehicle',
            afterText: '<div class="input-field"><input type="text" id="car-plate" class="modal-text-input" placeholder="Car plate"></div><div class="input-field"><input type="text" id="car-hint" class="modal-text-input" placeholder="Hint"></div>',
            buttons: [
              {
                  text: 'Cancel',
                  onClick: function () {/* Do Nothing */ }
              },
              {
                  text: 'Ok',
                  onClick: function () {
                      // TODO: Add validation/trimming function (refer to jom.js)

                      var str1 = '<div class="card"> <div class="card-content"> <div class="list-block"> <ul> <li> <div class="item-content"> <div class="item-inner"> <div class="item-title"> <div>';
                      var str2 = '</div> <div class="cards-item-title">'
                      var str3 = '</div> </div> <div class="item-after"><a href="#" class="override-icon-color" onclick="removeVehicle(this);"><i class="material-icons override-icon-size item-link">cancel</i></a></div> </div> </div> </li> </ul> </div> </div> </div>'
                      var STR = '<div class="card"> <div class="card-content"> <div class="list-block"> <ul> <li> <div class="item-content"> <div class="item-inner"> <div class="item-title"> <div>ABC 1111</div> <div class="cards-item-title">Name</div> </div> <div class="item-after"><a href="#" class="override-icon-color" onclick="removeVehicle(this);"><i class="material-icons override-icon-size item-link">cancel</i></a></div> </div> </div> </li> </ul> </div> </div> </div>'
                      $$('#tab-vehicle').append(str1 + $$('#car-plate').val() + str2 + $$('#car-hint').val() + str3);

                      /////////////////////////
                      var temp_model = $$('#car-hint').val();        // get car model textbox value
                      var temp_plate = $$('#car-plate').val();      // get car plate number textbox value
                      myCar = new car(temp_model, temp_plate);    // create car object
                      myCar.add_to_list();                        // add car to popover car menu
                  }
              },
            ]
        })
    });

});