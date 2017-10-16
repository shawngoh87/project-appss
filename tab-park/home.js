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

// Global Variables
var Db = {};
var Loaded, user, userRef, carRef;
var carRead;

// Global user position Var
var user_pos = {
    lat: 0,
    lng: 0,
    city: 'none',
    full_addr: 'none'
};
var geo_accuracy;


//------------------------------------------
// Check Whether User has signed in or not
//------------------------------------------
firebase.auth().onAuthStateChanged(function (user) {
    if (user) {
        if (!user.emailVerified) {                // Reminder: NOT the condition.
            // email succesfully verified
            // User is signed in.
            $$('.index-preloader').show();
            initUserInfo();
            Loaded = 0;
            // Load local storage after 5 seconds.
            setTimeout(function () {
                console.log('Timedout');
                if (!Loaded) {
                    Db.user = JSON.parse(localStorage.getItem('user'));
                    if (Db.user) { // local storage available
                        console.log('Unable to load from firebase. Local storage used instead.');
                        console.log(Db.user);
                        mainView.router.loadPage("main.html");
                        $$('.index-preloader').hide();
                    }
                    else {
                        console.log('Neither cache nor DB available. Please wait.')
                        // You gotta wait for firebase DB then :/
                    }

                }
                else console.log('Global DB initialized correctly. Local storage is not used.');
            }, 5000);
        }
        else {
            // not yet verifiy email
            myApp.alert('An email verification has been sent to you. Please verify it before signing in.', 'Notification');
            firebase.auth().signOut().then(function () { }).catch(function (error) { });
        }
    }
    else {
        // User signed out.
        // Turn off .on() listeners here.
    }
});

function initUserInfo() {
user = firebase.auth().currentUser;
userRef = firebase.database().ref('users/' + user.uid);
carRef = userRef.child('cars');
firebase.database().ref('users/' + user.uid).on('value',
    // Succeeded promise
    function (snapshot) {
        console.log('Promise succees from DB.');
        Db.user = snapshot.val();
        localStorage.setItem('user', JSON.stringify(Db.user));
        if (!Loaded) { mainView.router.loadPage("main.html"); Loaded = 1; } // Route to main.html only once.
        $$('.index-preloader').hide();
        console.log(Db.user);
        carRead = Db.user.cars;
    },
    // Failed promise
    function (err) {
        console.log(err);
    }
);    
}

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
// Function to remove vehicle
//---------------------------
// Vehicle Tab - Remove vehicle via cancel icon
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
                    $$('.actively-parking-car').each(function () {
                        if ($$(this).find('#car-icon').text().replace(/child_friendly/g, '') == $$(item).closest('.card').find('.owned-car').text()) {
                            $$(this).remove();
                        }
                    })
                    carRef.child($$(item).closest('.card').find('.owned-car').text()).remove();
                    $$(item).closest('.card').remove()
                }
            },
        ]
    })
}

// Vehicle tab - Load specific vehicle history via routing
function loadSpecificTransaction(carPlate) {
    var uid = firebase.auth().currentUser.uid;
    var pageContentHeader = '<div data-page="vehicle-history" class="page"> <div class="navbar"> <div class="navbar-inner"> <div class="left"><a href="#" class="back link icon-only"><i class="icon icon-back"></i></a></div> <div class="center">History</div> </div> </div> <div class="page-content vehicle-history-page">';
    var pageContentFooter = '</div></div>';
    var pageContent = '';

    var history = Db.user.cars[carPlate].history; // Clone it to prevent async bugs
    for (var eachHistory in history) {
        var historyInstance = history[eachHistory];

        // For readability purpose
        var str1 = '<div class="card"> <div class="card-header">';
        var loc = historyInstance.address;
        var str2 = '</div> <div class="card-footer"> <div class="col-75">';
        var dur = historyInstance.duration;
        var str3 = '</div> <div class="col-25">';
        var total = historyInstance.amount;
        var str4 = '</div> </div> </div>';

        pageContent += (str1 + loc + str2 + dur + str3 + total + str4);
        $$('.vehicle-history-page').append(str1 + loc + str2 + dur + str3 + total + str4);
    }
    mainView.loadContent(pageContentHeader + pageContent + pageContentFooter);
}

//---------------------------------
//Function to refresh active card
//--------------------------------
function refreshActiveHistory() {
    $$('.actively-parking-car').each(function () {
        var ownedCarPlate = $$(this).find('#car-icon').text().replace(/child_friendly/g, '');
        var endTime = $$(this).find('#timestamp-active-end').val();
        var remainTime = endTime - Date.now();
        var timeVal;
        var timeUnit;

        if (remainTime > 999) {

            if (timestamp2Time(remainTime).second >= 60) {
                if (timestamp2Time(remainTime).minute >= 60) {
                    timeVal = timestamp2Time(remainTime).hour;
                    timeUnit = 'hour';
                    if (timestamp2Time(remainTime).hour > 1) {
                        timeUnit += 's';
                    }
                }
                else {
                    timeVal = timestamp2Time(remainTime).minute;
                    timeUnit = 'minute';
                    if (timestamp2Time(remainTime).minute > 1) {
                        timeUnit += 's';
                    }
                }
            }
            else {
                timeVal = timestamp2Time(remainTime).second;
                timeUnit = 'second';
                if (timestamp2Time(remainTime).second > 1) {
                    timeUnit += 's';
                }
            }
            $$(this).find('#lbl-time-left').html(timeVal);
            $$(this).find('#lbl-time-remain').html(timeUnit + '<br />remaining');
        }
        else {
            $$(this).remove();
            for (var ownedCarPlate in carRead) {
                var parkingActive = carRead[ownedCarPlate].parking.active;
                var parkingAmount = carRead[ownedCarPlate].parking.amount;
                var parkingDuration = carRead[ownedCarPlate].parking.duration;
                var parkingTimestamp = carRead[ownedCarPlate].parking.timestamp;
                if (parkingActive) {
                    if (parkingDuration + parkingTimestamp < Math.floor(Date.now())) {
                        carRef.child(ownedCarPlate).child('history').child(ownedCarPlate + parkingTimestamp).update({
                            amount: parkingAmount,
                            promocode: "ILOVEDOUBLEPARK",
                            location: "",
                            duration: timestamp2Time(parkingDuration).name,
                            start_time: parkingTimestamp
                        })
                        carRef.child(ownedCarPlate).child('parking').update({
                            active: false,
                        })
                    }
                }
            }
        }
    });
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

    var tokenNO, tokenReq, tokenBal, parkDuration, carPlate, confirmText;
    var ownedCar, timeStamp, selectedCar = false, selectedDuration = false;

    //-----------------------
    //Initiate UI
    //-----------------------

    //Get cars and update

    for (var ownedCarPlate in carRead) {

        var parkingActive = carRead[ownedCarPlate].parking.active;
        var parkingAmount = carRead[ownedCarPlate].parking.amount;
        var parkingDuration = carRead[ownedCarPlate].parking.duration;
        var parkingTimestamp = carRead[ownedCarPlate].parking.timestamp;
        if (parkingActive) {
            if (parkingDuration + parkingTimestamp < Math.floor(Date.now())) {
                carRef.child(ownedCarPlate).child('history').child(ownedCarPlate + parkingTimestamp).update({
                    amount: parkingAmount,
                    promocode: "ILOVEDOUBLEPARK",
                    location: "",
                    duration: timestamp2Time(parkingDuration).name,
                    start_time: parkingTimestamp
                })
                carRef.child(ownedCarPlate).child('parking').update({
                    active: false,
                })
            }
        }
    }

    // Init vehicle tab
    var cars = Db.user.cars;
    for (var carPlate in cars) {
        var str1 = '<div class="card"> <div class="card-content"> <div class="list-block"> <ul> <li> <div class="item-content"> <div class="item-inner"> <div class="item-title"> <div class="owned-car">';
        var str2 = '</div><div class="cards-item-title">';
        var str3 = '</div></div><div class="item-after"><a href="#" onclick="loadSpecificTransaction(\'' + carPlate.toString() + '\');" class="override-icon-color" ><i class="material-icons override-icon-size item-link">history</i></a> <div class="no-colour">oo</div> <a class="override-icon-color" href="#" onclick="removeVehicle(this);"><i class="material-icons override-icon-size item-link">cancel</i></a> </div> </div> </div> </li> </ul> </div> </div> </div>';
        $$('#tab-vehicle').append(str1 + carPlate + str2 + cars[carPlate].description + str3);
    }

    //Get tokens
    userRef.child('balance').on('value', function (snapshot) {
        $$('.token').html(+snapshot.val().toFixed(2));
    })
    //Get duration selection choices
    firebase.database().ref('admin/duration').once('value').then(function (snapshot) {
        for (var time in snapshot.val()) {
            $$('.select-duration').each(function () {
                $$(this).append(
                    '<li>\
                <label class="label-radio item-content">\
                    <input type="radio" name="duration" value="'+ snapshot.child(time).val() + '" />\
                    <div class="item-media"><i class="icon icon-form-radio"></i></div>\
                    <div class="item-inner">\
                        <div class="item-title">' + timestamp2Time(snapshot.child(time).val()).name + '</div>\
                    </div>\
                </label>\
            </li>'
                );
            });
        }
    })

    //Get History of Active Car
    var activeCarRead = carRead;
    for (var activeCarPlate in activeCarRead) {
        var activeStatus = activeCarRead[activeCarPlate].parking.active;
        var activeAmount = activeCarRead[activeCarPlate].parking.amount;
        var activeDuration = activeCarRead[activeCarPlate].parking.duration;
        var activeTimestamp = activeCarRead[activeCarPlate].parking.timestamp;
        if (activeStatus) {
            //write data to UI
            var location, promoCode = null;
            var current_time = Date.now();
            var end_time = activeTimestamp + activeDuration;
            var end_time_dis = new Date(end_time);
            var remain_time = end_time - current_time;
            var time_unit;

            if (timestamp2Time(remain_time).second >= 60) {
                if (timestamp2Time(remain_time).minute >= 60) {
                    time_val = timestamp2Time(remain_time).hour;
                    time_unit = 'hour';
                    if (timestamp2Time(remain_time).hour > 1) {
                        time_unit += 's';
                    }
                }
                else {
                    time_val = timestamp2Time(remain_time).minute;
                    time_unit = 'minute';
                    if (timestamp2Time(remain_time).minute > 1) {
                        time_unit += 's';
                    }
                }
            }
            else {
                time_val = timestamp2Time(remain_time).second;
                time_unit = 'second';
                if (timestamp2Time(remain_time).second > 1) {
                    time_unit += 's';
                }
            }

            var str_active = '<li class="actively-parking-car">' +
                '<a href="#" data-popover=".popover-active' + activeCarPlate + '" class="item-link item-content open-popover">' +
                '<div class="item-inner">' +
                '<div class="item-title-row">' +
                '<div id="car-icon" class="item-title"><i class="material-icons">child_friendly</i>' + activeCarPlate + '</div>' +
                '<input id="timestamp-active-end" value="' + end_time + '" />' +
                '<div id="lbl-time-left" class="item-after">' + time_val + '</div>' +
                '<div id="lbl-time-remain" class="item-after">' + time_unit + ' <br />remaining</div>' +
                '</div>' +
                '<div class="item-subtitle"><i class="material-icons">place</i>' + location + '</div>' +
                '</div>' +
                '</a>' +
                '<div class="popover popover-active' + activeCarPlate + '" id="popover-active">' +
                '<div class="popover-angle"></div>' +
                '<div class="popover-inner">' +
                '<div class="content-block">' +
                '<div id="active-car-plate">' + activeCarPlate + '</div>' +
                '<div id="location">' + location + '</div><br />' +
                '<div id="promo">Promotion used: ' + promoCode + '</div>' +
                '<div id="lbl-time">Expected End Time:</div>' +
                '<div id="time-remain">' + end_time_dis.getHours() + ' : ' + end_time_dis.getMinutes() + ' : ' + end_time_dis.getSeconds() + '</div><br />' +
                '<div id="lbl-btns">Press button to extend or terminate the parking time.</div>' +
                '<div id="btns">' +
                '<button id="terminate-btn">Terminate</button>' +
                '<button id="extend-btn" value="' + activeCarPlate + '" onclick="extendParkingTime(this.value)">Extend</button>' +
                '</div>' +
                '</div>' +
                '</div>' +
                '</div>' +
                '<div class="progressbar" data-progress="' + ((remain_time / parkDuration) * 100) + '">' +
                '<span></span>' +
                '</div>' +
                '</li>';

            $$('#ulist-active').append(str_active);
        }
    }



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

            var availableCar = 0;
            for (var ownedCarPlate in carRead) {
                var parkingActive = carRead[ownedCarPlate].parking.active;
                var parkingAmount = carRead[ownedCarPlate].parking.amount;
                var parkingDuration = carRead[ownedCarPlate].parking.duration;
                var parkingTimestamp = carRead[ownedCarPlate].parking.timestamp;
                if (parkingActive) {
                    if (parkingDuration + parkingTimestamp < Math.floor(Date.now())) {
                        carRef.child(ownedCarPlate).child('history').child(ownedCarPlate + parkingTimestamp).update({
                            amount: parkingAmount,
                            promocode: "ILOVEDOUBLEPARK",
                            location: "",
                            duration: timestamp2Time(parkingDuration).name,
                            start_time: parkingTimestamp
                        })
                        carRef.child(ownedCarPlate).child('parking').update({
                            active: false,
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
                        availableCar++;
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
                    availableCar++;
                }
            }
            if (availableCar == 0) {
                myApp.alert('All car is currently not available', 'Notification')
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
        $$('.selected-duration').html(timestamp2Time(parkDuration).name);
        $$('.selected-duration-logo').css('color', 'blue');
        selectedDuration = true;
        $$('#close-popover-menu').click();
    })

    //-----------------------
    // Pay Button Function
    //-----------------------
    $$('.confirm-payment').on('click', function () {
        if (selectedCar && selectedDuration) {
            tokenReq = parkDuration * 2 / 3600000;
            confirmText =
                'Selected Car is&emsp;&emsp;&nbsp:' + carPlate.toString() + '<br>' +
                'Duration is&emsp;&emsp;&emsp;&emsp;:' + $$('.selected-duration').text() + '<br>' +
                'Token required is &emsp;:' + tokenReq.toString() + '<br><br>' +
                'Confirm Transaction?';
            myApp.confirm(confirmText, 'Confirmation', function () {

                tokenNo = Db.user.balance;
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
                    var timestamp = Math.floor(Date.now());
                    carRef.child(carPlate).child('parking').update({
                        active: true,
                        amount: tokenReq,
                        timestamp: timestamp,
                        duration: parkDuration
                    })

                    //write data to UI
                    var location, promoCode = null;
                    var current_time = Date.now();
                    var end_time = timestamp + parkDuration;
                    var end_time_dis = new Date(end_time);
                    var remain_time = end_time - current_time;
                    var time_val;
                    var time_unit;

                    if (timestamp2Time(remain_time).second >= 60) {
                        if (timestamp2Time(remain_time).minute >= 60) {
                            time_val = timestamp2Time(remain_time).hour;
                            time_unit = 'hour';
                            if (timestamp2Time(remain_time).hour > 1) {
                                time_unit += 's';
                            }
                        }
                        else {
                            time_val = timestamp2Time(remain_time).minute;
                            time_unit = 'minute';
                            if (timestamp2Time(remain_time).minute > 1) {
                                time_unit += 's';
                            }
                        }
                    }
                    else {
                        time_val = timestamp2Time(remain_time).second;
                        time_unit = 'second';
                        if (timestamp2Time(remain_time).second > 1) {
                            time_unit += 's';
                        }
                    }

                    var str_active = '<li class="actively-parking-car">' +
                        '<a href="#" data-popover=".popover-active' + carPlate + '" class="item-link item-content open-popover">' +
                        '<div class="item-inner">' +
                        '<div class="item-title-row">' +
                        '<div id="car-icon" class="item-title"><i class="material-icons">child_friendly</i>' + carPlate + '</div>' +
                        '<input id="timestamp-active-end" value="' + end_time + '" />' +
                        '<div id="lbl-time-left" class="item-after">' + time_val + '</div>' +
                        '<div id="lbl-time-remain" class="item-after">' + time_unit + ' <br />remaining</div>' +
                        '</div>' +
                        '<div class="item-subtitle"><i class="material-icons">place</i>' + location + '</div>' +
                        '</div>' +
                        '</a>' +
                        '<div class="popover popover-active' + carPlate + '" id="popover-active">' +
                        '<div class="popover-angle"></div>' +
                        '<div class="popover-inner">' +
                        '<div class="content-block">' +
                        '<div id="active-car-plate">' + carPlate + '</div>' +
                        '<div id="location">' + location + '</div><br />' +
                        '<div id="promo">Promotion used: ' + promoCode + '</div>' +
                        '<div id="lbl-time">Expected End Time:</div>' +
                        '<div id="time-remain">' + end_time_dis.getHours() + ' : ' + end_time_dis.getMinutes() + ' : ' + end_time_dis.getSeconds() + '</div><br />' +
                        '<div id="lbl-btns">Press button to extend or terminate the parking time.</div>' +
                        '<div id="btns">' +
                        '<button id="terminate-btn">Terminate</button>' +
                        '<button id="extend-btn" value="' + carPlate + '" onclick="extendParkingTime(this.value)">Extend</button>' +
                        '</div>' +
                        '</div>' +
                        '</div>' +
                        '</div>' +
                        '<div class="progressbar" data-progress="' + ((remain_time / parkDuration) * 100) + '">' +
                        '<span></span>' +
                        '</div>' +
                        '</li>';

                    $$('#ulist-active').append(str_active);
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

    $$('#tab-history-button').on('click', function () {
        refreshActiveHistory();
    })


    // Vehicle Tab - Adding vehicle via floating action button
    $$('.modal-vehicle').on('click', function () {
        myApp.modal({
            title: 'Add vehicle',
            afterText: '<div class="input-field"><input type="text" id="txt-car-plate" class="modal-text-input" placeholder="Car plate"></div><div class="input-field"><input type="text" id="txt-car-description" class="modal-text-input" placeholder="Description"></div>',
            buttons: [
                {
                    text: 'Cancel',
                    onClick: function () {/* Do Nothing */ }
                },
                {
                    text: 'Ok',
                    onClick: function () {
                        //Car Plate Format
                        var displayCarPlate = $$('#txt-car-plate').val().toUpperCase().replace(/ /g, '');

                        //write into database
                        carRef.child(displayCarPlate).update({
                            description: $$('#txt-car-description').val(),
                            timestamp_reg: Math.floor(Date.now()),
                            history:''
                        });

                        carRef.child(displayCarPlate).child('parking').update({
                            active: false,
                            duration: 0,
                            amount: 0,
                            timestamp:''

                        })

                        //write to UI
                        var str1 = '<div class="card"> <div class="card-content"> <div class="list-block"> <ul> <li> <div class="item-content"> <div class="item-inner"> <div class="item-title"> <div class="owned-car">';
                        var str2 = '</div><div class="cards-item-title">';
                        var str3 = '</div></div><div class="item-after"><a href="#" onclick="loadSpecificTransaction(\'' + displayCarPlate.toString() + '\');" class="override-icon-color" ><i class="material-icons override-icon-size item-link">history</i></a> <div class="no-colour">oo</div> <a class="override-icon-color" href="#" onclick="removeVehicle(this);"><i class="material-icons override-icon-size item-link">cancel</i></a> </div> </div> </div> </li> </ul> </div> </div> </div>';
                        $$('#tab-vehicle').append(str1 + displayCarPlate + str2 + $$('#txt-car-description').val() + str3);
                        $$('#close-popover-menu').click();
                    }
                },
            ]
        })
    });


    //-----------------------
    // Get Topup History Function
    //-----------------------
    topupRef = firebase.database().ref('users/' + user.uid + '/topup_history').orderByKey();
    topupRef.once('value').then(function (snapshot) {
        var i = 0;
        snapshot.forEach(function (childSnapshot) {
            var topupKey = childSnapshot.key;

            var topupData = childSnapshot.val();

            var timeData = topupData.topup_time;
            var topupTime = new Date(timeData);

            var weekday = new Array("Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat");
            var monthname = new Array("Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec");
            var monthnameFull = new Array("January", "February", "March", "April", "May", "Jun", "July", "August", "September", "October", "November", "December");
            //var formattedDate = weekday[pubDate.getDay()]+ ' '
            //        +monthname[pubDate.getMonth()]+ ' '
            //        +pubDate.getDate() + ', ' +pubDate.getFullYear()
            var time = weekday[topupTime.getDay()] + ' ' + topupTime.getDate();

            //update to Topup UI
            var str_topup = '<div class="timeline-item">' +
                '<div class="timeline-item-date" id="timeline-date">' + topupTime.getDate() + '<small>' + monthname[topupTime.getMonth()] + '</small></div>' +
                '<div class="timeline-item-divider"></div>' +
                '<div class="timeline-item-content list-block inset">' +
                '<ul>' +
                '<li class="accordion-item">' +
                '<a href="#" class="item-link item-content">' +
                '<div class="item-inner">' +
                '<div id="topup-icon" class="item-title">CardNo: ' + topupData.credit_card_no % 10000 + '</div>' +
                '<div class="item-after">RM' + topupData.amount + '</div>' +
                '</div>' +
                '</a>' +
                '<div class="accordion-item-content" id="topup-accordion">' +
                '<div class="content-block">' +
                '<div id="topup-date"><b>' + topupTime.getDate() + ' ' + monthnameFull[topupTime.getMonth()] + ' ' + topupTime.getYear() + '<br></b></div>' +
                '<div id="topup-info">' +
                '<p>Amount: RM ' + topupData.amount + '<br></p>' +
                '<p>Expired Date: ' + topupData.expired_date + '<br></p>' +
                '<p id="lbl-cc">Credit Card Number:</p>' +
                '<p id="desc-cc">xxxx-xxxx-xxxx-' + topupData.credit_card_no % 10000 + '</p>' +
                '</div>' +
                '</div>' +
                '</div>' +
                '</li>' +
                '</ul>' +
                '</div>' +
                '</div>';

            $$('#timeline-topup').append(str_topup);
            i++;
        });
    });

    $$('.confirm-logout-ok').on('click', function () {
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

    // Load username
    firebase.database().ref('users/' + user.uid + '/username').once('value').then(function (snapshot) {
        var data = snapshot.val();
        $$('.load-username').html(data);
    })

    //Get tokens in profile
    userRef.child('balance').once('value').then(function (snapshot) {
        $$('.load-token').append(snapshot.val().toFixed());
    })

});


//---------------------------------------
// Extend Button Function
//---------------------------------------
function extendParkingTime(theCar) {
    var expired = false;
    $$('.actively-parking-car').each(function () {
        if ($$(this).find('#car-icon').text().replace(/child_friendly/g, '') == theCar) {
            if ($$(this).find('#timestamp-active-end').val() - Date.now() <= 0) {
                expired = true;
            }
        }
    });
    if (expired) {
        $$('#close-popover-menu').click();
        myApp.alert('The parking session of this car was expired', 'Notification');
        refreshActiveHistory();
    }
    else {
        $$('#close-popover-menu').click();

        if ($$('.picker-modal.modal-in').length > 0) {
            myApp.closeModal('.picker-modal.modal-in');
        }

        myApp.pickerModal(
            '<div class="picker-modal">' +
            '<div class="toolbar">' +
            '<div class="toolbar-inner">' +
            '<div class="left" id="extendCarPlate">' + theCar + '</div>' +
            '<div class="right"><a href="#" class="close-picker">Cancel</a></div>' +
            '</div>' +
            '</div>' +
            '<div class="picker-modal-inner">' +
            '<div class="content-block" id="extend-content">' +
            '<div id="lbl-extend">Please select the duration to extend the parking time.</div>' +
            '<div class="list-block"  id="duration-content">' +
            '<a href="#" data-popover=".popover-menu-duration-extend" class="item-link close-panel open-popover">' +
            '<div class="item-content">' +
            '<div class="item-media"><i class="material-icons selected-duration-logo">schedule</i></div>' +
            '<div class="item-inner">' +
            '<div class="item-title selected-duration">Duration</div>' +
            '</div>' +
            '</div>' +
            '</a>' +
            '<div class="popover popover-menu-duration-extend">' +
            '<div class="popover-inner">' +
            '<div class="list-block">' +
            '<ul class = ".select-extend-duration">' +
            $$('.select-duration').html() +
            '</ul>' +
            '</div>' +
            '</div>' +
            '</div>' +
            '</div><br />' +
            '<div><button id="confirm-btn">Confirm</button></div>' +
            '</div>' +
            '</div>' +
            '</div>'
        )
    }
};

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

// ===== Color themes ===== 
myApp.onPageInit('color-themes', function (page) {
    $$(page.container).find('.color-theme').click(function () {
        var classList = $$('body')[0].classList;
        for (var i = 0; i < classList.length; i++) {
            if (classList[i].indexOf('theme') === 0) classList.remove(classList[i]);
        }
        classList.add('theme-' + $$(this).attr('data-theme'));
    });
});

//Display User My Profile
myApp.onPageInit('profile-myprofile', function (page) {
    user = firebase.auth().currentUser;
    userRef = firebase.database().ref('users/' + user.uid);

    // Load username
    firebase.database().ref('users/' + user.uid + '/username').once('value').then(function (snapshot) {
        var data = snapshot.val();
        $$('.load-username').html(data);
    })
    // Load real_name
    firebase.database().ref('users/' + user.uid + '/real_name').once('value').then(function (snapshot) {
        var data = snapshot.val();
        $$('.load-real-name').html(data);
    })
    // Load email
    firebase.database().ref('users/' + user.uid + '/email').once('value').then(function (snapshot) {
        var data = snapshot.val();
        $$('.load-email').html(data);
    })
    // Load phone_no
    firebase.database().ref('users/' + user.uid + '/phone_no').once('value').then(function (snapshot) {
        var data = snapshot.val();
        $$('.load-phone-no').html(data);
    })
    // Load gender
    firebase.database().ref('users/' + user.uid + '/gender').once('value').then(function (snapshot) {
        var data = snapshot.val();
        $$('.load-gender').html(data);
    })
    // Load birthday
    //NEED TO CHANGE THE WAY TO GET AND DISPLAY/////////////////
    firebase.database().ref('users/' + user.uid + '/birthday').once('value').then(function (snapshot) {
        var data = snapshot.val();
        $$('.load-birthday').html(data);
    })
    /*
    // Load address HAVENT DONEEEEEEEEEEEEEE
    firebase.database().ref('users/' + user.uid + '/birthday').once('value').then(function (snapshot) {
        var data = snapshot.val();
        $$('.load-address').html(data);
    })
    */
});

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
        if (selfset == true)
        {
            user_pos['lat'] = selfset_pos['lat'];
            user_pos['lng'] = selfset_pos['lng'];
            user_pos['city'] = selfset_pos['city'];
            user_pos['full_addr'] = selfset_pos['full_addr'];
        }
        //console.log(user_pos);
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

//Promocode
myApp.onPageInit('profile-promocode', function (page) {
    //Display Promocode
    function loadPromocode() {
        var uid = firebase.auth().currentUser.uid;
        var path = 'users/' + user.uid + '/promotion';

        firebase.database().ref(path).once('value').then(function (snapshot) {
            var data = snapshot.val();

            for (var eachPromotion in data) {
                var promocode = data[eachPromotion];

                // For readability purpose
                var str1 = '<li class="accordion-item"> <a href="#" class="item-link item-content"> <div class="item-inner"> <div class="item-title">'
                var str2 = '</div>'
                //only for all
                var str_a = '<div class="item-after" style = "color: springgreen" > '
                var p_status = promocode.status;
                var str_b = '</div >'
                //till here
                var str3 = '</div > </a > <div class="accordion-item-content"> <div class="content-block"> <p>Discount Amount: '
                var p_amount = promocode.amount;
                var str4 = ' tokens</p> <p>Expiry Date: '
                var p_expiry_date = promocode.expiry_date;
                var str5 = '</p> <p>'
                var p_text = promocode.text;
                var str6 = '</p> </div> </div> </li>'


                if (p_status.toLowerCase() == 'available') {
                    $$('.promo-list-available').append(str1 + eachPromotion + str2 + str3 + p_amount + str4 + p_expiry_date + str5 + p_text);
                }
                $$('.promo-list-all').append(str1 + eachPromotion + str2 + str_a + p_status + str_b + str3 + p_amount + str4 + p_expiry_date + str5 + p_text + str6);
            }

        });
    }

    loadPromocode();
});
