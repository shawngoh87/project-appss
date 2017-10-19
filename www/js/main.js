﻿// Init App
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
var Loaded, user, userRef, carRef, carRead;
var rate, selectedCar = false, selectedLocation = false;
var expired = false, extendDuration, extendedDuration = false;

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
            
            refreshActiveHistory();
        },
        // Failed promise
        function (err) {
            console.log(err);
        }
    );
    firebase.database().ref('admin/token_per_minute').once('value', function(snapshot){
        rate = snapshot.val()/60000;
    })
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
        var endTime = carRead[ownedCarPlate].parking.timestamp + carRead[ownedCarPlate].parking.duration;
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
                var parkingLocation = carRead[ownedCarPlate].parking.location;
                if (parkingActive) {
                    if (parkingDuration + parkingTimestamp < Math.floor(Date.now())) {
                        carRef.child(ownedCarPlate).child('history').child(ownedCarPlate + parkingTimestamp).update({
                            amount: parkingAmount,
                            promocode: "ILOVEDOUBLEPARK",
                            location: parkingLocation,
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
    var ownedCar, timeStamp;

    //-----------------------
    //Initiate UI
    //-----------------------

    //Get cars and update

    for (var ownedCarPlate in carRead) {
        var parkingActive = carRead[ownedCarPlate].parking.active;
        var parkingAmount = carRead[ownedCarPlate].parking.amount;
        var parkingDuration = carRead[ownedCarPlate].parking.duration;
        var parkingTimestamp = carRead[ownedCarPlate].parking.timestamp;
        var parkingLocation = carRead[ownedCarPlate].parking.location;
        if (parkingActive) {
            if (parkingDuration + parkingTimestamp < Math.floor(Date.now())) {
                carRef.child(ownedCarPlate).child('history').child(ownedCarPlate + parkingTimestamp).update({
                    amount: parkingAmount,
                    promocode: "ILOVEDOUBLEPARK",
                    location: parkingLocation,
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
    for (var displayCarPlate in cars) {//write to UI
        var str1 = '<div class="card"><div class="card-content"><div class="list-block"><ul><li> <a class="item-content item-link"  onclick="loadSpecificTransaction(\'' + displayCarPlate.toString() + '\');" href="vehicle-history"><div class="item-inner" style="background-image:none; padding-right: 20px"><div class="item-title"><div class="owned-car">';
        var str2 = '</div><div class="cards-item-title">'
        var str3 = '</div></div><div class="item-after"><a class="override-icon-color" href="#" onclick="removeVehicle(this)"><i class="material-icons override-icon-size item-link" style="">cancel</i></a></div></div> </a > </li></ul></div></div></div>';
        //var str = '<div class="card"><div class="card-content"><div class="list-block"><ul><li><a class="item-link item-content" onclick="loadSpecificTransaction(\'' + displayCarPlate.toString() + '\');" href="vehicle-history"><div class="item-inner style="padding-right: 10px" style="background-image:none"><div class="item-title"><div class="owned-car">GOTCHA</div><div class="cards-item-title">hint</div></div><div class="item-after"></div><i class="material-icons override-icon-size item-link" style="">cancel</i></div></a></li></ul></div></div></div>';
        $$('#tab-vehicle').append(str1 + displayCarPlate + str2 + $$('#txt-car-description').val() + str3);
    }

    //Get tokens
    userRef.child('balance').on('value', function (snapshot) {
        $$('.token').html(+snapshot.val());
    })

    //Get History of Active Car
    var activeCarRead = carRead;
    for (var activeCarPlate in activeCarRead) {
        var activeStatus = activeCarRead[activeCarPlate].parking.active;
        var activeAmount = activeCarRead[activeCarPlate].parking.amount;
        var activeDuration = activeCarRead[activeCarPlate].parking.duration;
        var activeTimestamp = activeCarRead[activeCarPlate].parking.timestamp;
        var activeLocation = activeCarRead[activeCarPlate].parking.location;
        if (activeStatus) {
            //write data to UI
            var activeAddress, promoCode = null;
            var current_time = Date.now();
            var end_time = activeTimestamp + activeDuration;
            var end_time_dis = new Date(end_time);
            var remain_time = end_time - current_time;
            var time_unit, time_val;
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
                '<div class="item-subtitle active-car-location"></div>' +
                '</div>' +
                '</a>' +
                '<div class="popover popover-active' + activeCarPlate + '" id="popover-active">' +
                '<div class="popover-angle"></div>' +
                '<div class="popover-inner">' +
                '<div class="content-block">' +
                '<div id="active-car-plate">' + activeCarPlate + '</div>' +
                '<div id="location"></div><br />' +
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
            getActiveAddress(activeLocation, activeCarPlate);
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
                var parkingLocation = carRead[ownedCarPlate].parking.location;
                if (parkingActive) {
                    if (parkingDuration + parkingTimestamp < Math.floor(Date.now())) {
                        carRef.child(ownedCarPlate).child('history').child(ownedCarPlate + parkingTimestamp).update({
                            amount: parkingAmount,
                            promocode: "ILOVEDOUBLEPARK",
                            location: parkingLocation,
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

    //----------------------
    //Get Selected Duration
    //----------------------
    function getDuration() {
        parkDuration = +$$('.park-duration').val();
        tokenReq = (parkDuration * rate);
        $$('.selected-duration').html(clockPass(parkDuration));
        $$('.selected-park-duration').html(timestamp2Time(parkDuration).name);
        $$('.required-token').html(tokenReq);
    }

    setInterval(function () {
        $$('.selected-duration').html(clockPass($$('.park-duration').val()))
        parkDuration = $$('.park-duration').val();
    },60000)

    $$('.park-duration').on('input', function () {
        $$('.selected-duration').html(clockPass($$('.park-duration').val()))
        parkDuration = $$('.park-duration').val();
        console.log(clockPass($$('.park-duration').val()));
    })

    //-----------------------
    // Pay Button Function
    //-----------------------
    $$('.confirm-payment').on('click', function () {
        if (selectedCar && selectedLocation && parkDuration>0) {
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
                    $$('.token').html(+tokenBal);
                    $$('.selected-car-plate').html('Select Car');
                    $$('.selected-duration').html('Duration');
                    $$('.selected-car-logo').css('color', 'inherit');
                    $$('.selected-location-logo').css('color', 'inherit');
                    selectedCar = false;
                    selectedLocation = false;
                    $$('#tab-history-button').click();
                    $$('#tab-active-button').click();
                    var timestamp = Math.floor(Date.now());
                    carRef.child(carPlate).child('parking').update({
                        active: true,
                        amount: tokenReq,
                        timestamp: timestamp,
                        duration: parkDuration,
                        location: { lat: user_pos.lat, lng: user_pos.lng }
                    })

                    //write data to UI
                    var location = user_pos.city, promoCode = null;
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
        else {
            myApp.alert('Please complete your info', 'Notification');
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
                            history: ''
                        });

                        carRef.child(displayCarPlate).child('parking').update({
                            active: false,
                            duration: 0,
                            amount: 0,
                            timestamp: ''

                        })

                        //write to UI
                        var str1 = '<div class="card"><div class="card-content"><div class="list-block"><ul><li> <a class="item-content item-link"  onclick="loadSpecificTransaction(\'' + displayCarPlate.toString() + '\');" href="vehicle-history"><div class="item-inner" style="background-image:none; padding-right: 20px"><div class="item-title"><div class="owned-car">';
                        var str2 = '</div><div class="cards-item-title">'
                        var str3 = '</div></div><div class="item-after"><a class="override-icon-color" href="#" onclick="removeVehicle(this)"><i class="material-icons override-icon-size item-link" style="">cancel</i></a></div></div> </a > </li></ul></div></div></div>';
                        //var str = '<div class="card"><div class="card-content"><div class="list-block"><ul><li><a class="item-link item-content" onclick="loadSpecificTransaction(\'' + displayCarPlate.toString() + '\');" href="vehicle-history"><div class="item-inner style="padding-right: 10px" style="background-image:none"><div class="item-title"><div class="owned-car">GOTCHA</div><div class="cards-item-title">hint</div></div><div class="item-after"></div><i class="material-icons override-icon-size item-link" style="">cancel</i></div></a></li></ul></div></div></div>';
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

    //profile tab
    $$('.load-username').html(Db.user.username);
    $$('.load-token').append(Db.user.balance.toString());
});

//---------------------------------------
// Extend Button Function
//---------------------------------------
function extendParkingTime(theCar) {
    //Get duration selection choices
    firebase.database().ref('admin/duration').once('value').then(function (snapshot) {
        for (var time in snapshot.val()) {
            $$('.select-extend-duration').append(
                    '<li>\
                    <label class="label-radio item-content">\
                        <input type="radio" name="ex-duration" value="'+ snapshot.child(time).val() + '" />\
                        <div class="item-media"><i class="icon icon-form-radio"></i></div>\
                        <div class="item-inner">\
                            <div class="item-title">' + timestamp2Time(snapshot.child(time).val()).name + '</div>\
                        </div>\
                    </label>\
                </li>'
                );
        }
    })

    //Initiate variables


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
            '<ul class = "select-extend-duration">' +
            '</ul>' +
            '</div>' +
            '</div>' +
            '</div>' +
            '</div><br />' +
            '<div><button id="confirm-btn" value="' + theCar + '" onclick="extendConfirmed(this.value)">Confirm</button></div>' +
            '</div>' +
            '</div>' +
            '</div>'
        )
    }

    //----------------------------------
    // Get Selected Duration Function
    //----------------------------------
    $$('.select-extend-duration').on('click', function () {
        extendDuration = +$$('input[name=ex-duration]:checked').val();
        $$('.selected-duration').html(timestamp2Time(extendDuration).name);
        $$('.selected-duration-logo').css('color', 'blue');
        extendedDuration = true;
        $$('#close-popover-menu').click();
    })
};
//---------------------------------------
// Extend Function
//---------------------------------------
function extendConfirmed(theCar) {
    if (extendedDuration == false) {
        myApp.alert('Please select your duration! Stupid!', 'Notification');
    }
    else {
        var tokenNO, tokenReq, tokenBal

        tokenReq = extendDuration * 2 / 3600000;
        extendConfirmText =
            'Selected Car is&emsp;&emsp;&nbsp:' + theCar.toString() + '<br>' +
            'Duration extended is&emsp;:' + $$('.selected-duration').text() + '<br>' +
            'Token required is &emsp;:' + tokenReq.toString() + '<br><br>' +
            'Confirm Transaction?';
        myApp.confirm(extendConfirmText, 'Confirmation', function () {
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
                    $$('.token').html(+tokenBal);
                    $$('.selected-duration').html('Duration');
                    $$('.selected-duration-logo').css('color', 'inherit');
                    extendedDuration = false;
                    $$('.close-picker').click();
                }
            })

            //Update to firebase
            var amount = carRead[theCar].parking.amount;
            var duration = carRead[theCar].parking.duration;;
            var timestamp = carRead[theCar].parking.timestamp;

            var newAmount = amount + tokenReq;
            var newDuration = duration + extendDuration;

            carRef.child(theCar).child('parking').update({
                active: true,
                amount: newAmount,
                timestamp: timestamp,
                duration: newDuration
            })
        })
        $$('#tab-history-button').click();
        $$('#tab-active-button').click();
    }
}

//---------------------------------------
// Terminate Function
//---------------------------------------
function terminateParkingTime(theCar) {
    var timeVal, timeUnit;
    var terminateDuration = Db.user.cars[theCar].parking.duration;
    var terminateTimestamp = Db.user.cars[theCar].parking.timestamp;
    
    var terminateRemainTime = (terminateTimestamp + terminateDuration) - Date.now();
    var terminateTime = new Date(terminateTimestamp + terminateDuration);

    if (timestamp2Time(terminateRemainTime).second >= 60) {
        if (timestamp2Time(terminateRemainTime).minute >= 60) {
            timeVal = timestamp2Time(terminateRemainTime).hour;
            timeUnit = 'hour';
            if (timestamp2Time(terminateRemainTime).hour > 1) {
                timeUnit += 's';
            }
        }
        else {
            timeVal = timestamp2Time(terminateRemainTime).minute;
            timeUnit = 'minute';
            if (timestamp2Time(terminateRemainTime).minute > 1) {
                timeUnit += 's';
            }
        }
    }
    else {
        timeVal = timestamp2Time(terminateRemainTime).second;
        timeUnit = 'second';
        if (timestamp2Time(terminateRemainTime).second > 1) {
            timeUnit += 's';
        }
    }

    terminateConfirmText =
            'Are you sure that you want to terminate the follwing parking?<br>' +
            'Car Plate Number&emsp;&nbsp:' + theCar.toString() + '<br>' +
            'Time Remaining&emsp;:' + timeVal + ' ' + timeUnit + '<br>' +
            'Expected End Time is :<br>' + terminateTime.getHours() + ' : ' + terminateTime.getMinutes() + ' : ' + terminateTime.getSeconds() + '<br><br>' +
            'Confirm to Terminate?';

    myApp.confirm(terminateConfirmText, 'Confirmation', function () {
        //Update to firebase
        carRef.child(theCar).child('parking').update({
            active: false,
            amount: 0,
            timestamp: 0,
            duration: 0
        })
        myApp.alert('The parking for car plate number ' + theCar + ' is terminated.', 'Confirmation');
        $$('.close-picker').click();
    })
    refreshActiveHistory();
    $$('#close-popover-menu').click();
}


myApp.onPageInit('signup', function (page) {
    var su_email;
    var su_password;
    var su_username;
    var su_phone;
    var su_ic;


    //console.log('Verifier callback');
    //var appVerifier = window.recaptchaVerifier;
    //firebase.auth().signInWithPhoneNumber($$('#su-phone-no').val(), appVerifier)
    //    .then(function (confirmationResult) {
    //        // Change to on('input') realtime verify
    //        myApp.modal({
    //            title: 'stuff',
    //            afterText: '<div class="input-field"><input type="text" id="txt-otp-code" class="modal-text-input" placeholder="4-Digit Code"></div>',
    //            buttons: [
    //                {
    //                    text: 'Cancel',
    //                    onClick: function () {/* Do Nothing */ }
    //                },
    //                {
    //                    text: 'Ok',
    //                    onClick: function () {
    //                        // Code keyed in by user sent to firebase auth
    //                        window.confirmationResult = confirmationResult;
    //                        var code = $$('#txt-otp-code').val();
    //                        confirmationResult.confirm(code)
    //                            .then(function (result) {
    //                                var user = result.user;
    //                                console.log('Phone sign in complete');
    //                                console.log(user);
    //                            })
    //                            .catch(function (error) {
    //                                console.log('OTP Code error');
    //                            });
    //                    }
    //                },
    //            ]
    //        })
    //        // SMS sent. Prompt user to type the code from the message, then sign the
    //        // user in with confirmationResult.confirm(code).
    //    }).catch(function (error) {
    //        // Error; SMS not sent
    //        // ...
    //    });

    //------------------------------
    // OTP auth with SMS
    //------------------------------
    window.recaptchaVerifier = new firebase.auth.RecaptchaVerifier('button-signup-submitt', {
        'size': 'invisible',
        'callback': function (response) {
            console.log('asdfasdf');
        }
    });

    $$("#button-signup-submitt").on('click', function () { console.log('stuff'); });

    //-----------------------------
    // back button function
    //-----------------------------
    $$('#button-signup-back').on('click', function () {
        mainView.router.back();
    })

    //-----------------------------
    // submit button for signUp 
    //-----------------------------
    //$$('#button-signup-submit').on('click', function () {
    //    if ($$('#su-email').val() == "") {
    //        //empty email input textbox case
    //        myApp.alert('Please enter your email.', 'Error');
    //    }
    //    else if ($$('#su-password').val() == "") {
    //        //empty password input textbox case
    //        myApp.alert('Please enter your password.', 'Error');
    //    }
    //    else if ($$('#su-username').val() == "") {
    //        //empty username input textbox case
    //        myApp.alert('Please enter your username.', 'Error');
    //    }
    //    else if ($$('#su-phone-no').val() == "") {
    //        //empty phone number input textbox case
    //        myApp.alert('Please enter your phone number.', 'Error');
    //    }
    //    else if ($$('#su-password').val() !== $$('#su-confirm-password').val()) {
    //        // password does not match confirm password
    //        myApp.alert('Password and Confirm Password does not match. Please try again.', 'Error');
    //    }
    //    else {
    //        su_email = $$('#su-email').val();
    //        su_password = $$('#su-password').val();
    //        su_username = $$('#su-username').val();
    //        su_phone = $$('#su-phone-no').val();
    //        su_ic = $$('#su-ic').val();

    //        firebase.auth().createUserWithEmailAndPassword(su_email, su_password).then(function (data) {
    //            var curr_user = firebase.auth().currentUser;
    //            //--------------------------------
    //            // Sent email verification
    //            //--------------------------------
    //            curr_user.sendEmailVerification().then(function () {
    //                // Email sent.                    
    //            }).catch(function (error) {
    //                // An error happened.
    //            });

    //            //--------------------------------
    //            // Set user info to database
    //            //--------------------------------               
    //            firebase.database().ref('users/' + curr_user.uid).set({
    //                email: su_email,
    //                username: su_username,
    //                phone_no: su_phone,
    //                balance: 0,
    //                IC: su_ic
    //            });

    //            //------------------------------
    //            // force sign out after sign up
    //            //------------------------------
    //            firebase.auth().signOut().then(function () {
    //                // Sign-out successful.                    
    //                //mainView.router.back(); // Route later
    //            }).catch(function (error) {
    //                // An error happened.
    //            });


    //        }).catch(function (error) {
    //            // Handle Sign Up Errors here.
    //            var errorCode = error.code;
    //            var errorMessage = error.message;
    //            if (errorCode == "auth/email-already-in-use")
    //                myApp.alert(errorMessage, 'Error');
    //            else if (errorCode == "auth/invalid-email")
    //                myApp.alert(errorMessage, 'Error');
    //            else if (errorCode == "auth/operation-not-allowed")
    //                myApp.alert(errorMessage, 'Error');
    //            else if (errorCode == "auth/weak-password")
    //                myApp.alert(errorMessage, 'Error');
    //        });

    //    }
    //})
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

    $$('.load-username').html(Db.user.username);
    $$('.load-real-name').html(Db.user.real_name);
    $$('.load-email').html(Db.user.email);
    $$('.load-phone-no').html(Db.user.phone_no);
    $$('.load-gender').html(Db.user.gender);
    $$('.load-birthday').html(Db.user.birthday);
    $$('.load-address').html(Db.user.address);

});

//---------------------------
// Select Location function
//---------------------------
myApp.onPageInit("select-location", function (page) {
    var selfset = false;
    var default_marker = [];
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
    var default_user_addr;
    var map = new google.maps.Map(document.getElementById('map'), {
        center: { lat: -34.397, lng: 150.644 },
        zoom: 18
    });

    //--------------------------------
    // default checkbox function
    //--------------------------------
    $$('input[name=default-loca]').change(function () {
        if ($$(this).is(':checked')) {
            // checked
            default_marker.forEach(function (marker) {
                marker.setMap(null);
            });
            default_marker = [];
            $$('#default-address').html(default_pos['full_addr']);
            document.getElementById("pac-input").style.visibility = "hidden";
            var pos = {
                lat: default_pos['lat'],
                lng: default_pos['lng']
            }
            map.setCenter(pos);
            map.setZoom(18);
            // Create a marker for each place.
            default_marker.push(new google.maps.Marker({
                map: map,
                position: pos
            }));
        }
        else {
            // not checked
            default_marker.forEach(function (marker) {
                marker.setMap(null);
            });
            default_marker = [];
            $$('#default-address').html(selfset_pos['full_addr']);
            document.getElementById("pac-input").style.visibility = "visible";
            var pos = {
                lat: selfset_pos['lat'],
                lng: selfset_pos['lng']
            }
            map.setCenter(pos);
            map.setZoom(18);
            // Create a marker for each place.
            default_marker.push(new google.maps.Marker({
                map: map,
                position: pos
            }));
        }
    });

    // User click confirm button function
    $$('#use-selfset-loca').on('click', function () {
        if (selfset == true) {
            user_pos['lat'] = selfset_pos['lat'];
            user_pos['lng'] = selfset_pos['lng'];
            user_pos['city'] = selfset_pos['city'];
            user_pos['full_addr'] = selfset_pos['full_addr'];
        }
        else {
            user_pos['lat'] = default_pos['lat'];
            user_pos['lng'] = default_pos['lng'];
            user_pos['city'] = default_pos['city'];
            user_pos['full_addr'] = default_pos['full_addr'];
        }
        console.log(user_pos);
        mainView.router.back();
        $$('.selected-location').html(user_pos['city']);
        $$('.selected-location-logo').css('color', 'red');
        selectedLocation = true;
    })

    initMap(map);

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
        if (status == google.maps.places.PlacesServiceStatus.OK) {
            for (var i = 0; i < results.length; i++) {
                var pos = {
                    lat: results[i].geometry.location.lat(),
                    lng: results[i].geometry.location.lng()
                };
                var POI_content_html =
                    '<li><div class="item-inner item-content">' +
                    '<div class="item-title-row">' +
                    '<div class="item-title">' + results[i].name + '</div>' +
                    '<div class="item-after">ICON</div>' +
                    '</div>' +
                    '</div></li>';

                $$("#POI-content").append(POI_content_html);
                //geocodeAddr(pos, results[i].name);                
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

        // Listen for the event fired when the user selects a prediction and retrieve
        // more details for that place.
        searchBox.addListener('places_changed', function () {
            var places = searchBox.getPlaces();

            if (places.length === 0) {
                return;
            }

            // Clear out the old markers.  
            default_marker.forEach(function (marker) {
                marker.setMap(null);
            });
            default_marker = [];

            // For each place, get the icon, name and location.
            var bounds = new google.maps.LatLngBounds();
            places.forEach(function (place) {
                if (!place.geometry) {
                    myApp.alert("Returned place contains no geometry");
                    return;
                }

                // Create a marker for each place.
                default_marker.push(new google.maps.Marker({
                    map: map,
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
                    $$('#default-address').html(results[0].formatted_address);  // display full address 
                } else {
                    myApp.alert('No results found');
                }
            } else {
                myApp.alert('Geocoder failed due to: ' + status);
            }
        });
    }

    //---------------------------------------
    // Only Full address (Geocoding)
    //---------------------------------------
    function geocodeAddr(latlng, name) {
        var geocoder = new google.maps.Geocoder;
        geocoder.geocode({ 'location': latlng }, function (results, status) {
            if (status === 'OK') {
                if (results[0]) {
                    var POI_content_html =
                        '<li><div class="item-inner item-content">' +
                        '<div class="item-title-row">' +
                        '<div class="item-title">' + name + '</div>' +
                        '<div class="item-after">ICON</div>' +
                        '</div>' +
                        '<div class="item-text">' + results[0].formatted_address + '</div>' +
                        '</div></li>';

                    $$("#POI-content").append(POI_content_html);
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
    function initMap(map) {
        // Try HTML5 geolocation.
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(function (position) {
                var pos = {
                    lat: position.coords.latitude,
                    lng: position.coords.longitude
                };
                default_pos['lat'] = position.coords.latitude;
                default_pos['lng'] = position.coords.longitude;
                map.setCenter(pos);
                nearbySearch(map, pos);

                // Create a marker 
                default_marker.push(new google.maps.Marker({
                    map: map,
                    position: pos
                }));

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
                if (promocode.status.toLowerCase() == 'available') {
                    $$('.promo-list-available').append(str1 + eachPromotion + str2 + str3 + promocode.amount + str4 + promocode.expiry_date + str5 + promocode.text);
                    var str_all = '<div class="item-after" style = "color: springgreen" >Available</div>'
                } else if (promocode.status.toLowerCase() == 'expired') {
                    var str_all = '<div class="item-after" style = "color: red" >Expired</div>'
                } else if (promocode.status.toLowerCase() == 'used') {
                    var str_all = '<div class="item-after">Used</div>'
                }

                var str3 = '</div > </a > <div class="accordion-item-content"> <div class="content-block"> <p>Discount Amount: '
                var str4 = ' tokens</p> <p>Expiry Date: '
                var str5 = '</p> <p>'
                var str6 = '</p> </div> </div> </li>'

                $$('.promo-list-all').append(str1 + eachPromotion + str2 + str_all + str3 + promocode.amount + str4 + promocode.expiry_date + str5 + promocode.text + str6);
            }

        });
    }

    loadPromocode();
});

// Change password
myApp.onPageInit('settings-change-password', function (page) {
    var user = firebase.auth().currentUser;

    var credentials = firebase.auth.EmailAuthProvider.credential(user.email, $$('#old-password').val());


    $$('#update-password').on('click', function () {

       // if (user.reauthenticateWithCredential(credentials), function() {
         //   myApp.alert('Password does not match', 'Error!');
       // }
        //else if ($$('#new-password').val() == $$('#confirm-new-password').val()) {
          //  user.updatePassword($$('#new-password').val()).then(function () {
                // Update successful.
         //       myApp.alert('Your password has been updated!');
       //     }).catch(function (error) {
                // An error happened.
       //     });
     //   } else
       //     myApp.alert('Password and confirm password does not match', 'Error!');
            
       
    });

});

//Change Address
myApp.onPageInit('settings-change-address', function (page) {
    user = firebase.auth().currentUser;

    $$('.load-address').html(Db.user.address);

    $$('#update-address').on('click', function () {
        if ($$('#new-address').val() != ("")) {

            userRef.update({
                address: $$('#new-address').val()
            }).then(function () {
            myApp.alert('Your address has been updated successfully!');
            }).catch(function (error) {

            });
        }
            else{
            myApp.alert('Please enter your new address', 'Error!');
        }
    });


});

//Make Report (CarLoss/IllegalPark)
myApp.onPageInit('profile-report', function (page) {
    userRef = firebase.database().ref('users/' + user.uid);

    var cl_owner_name;
    var cl_owner_ic;
    var cl_owner_pass;
    var cl_phone;
    var cl_plate;
    var cl_location;
    var cl_remarks;
    //-----------------------------
    // submit button for Carloss Report 
    //-----------------------------
    $$('#cl-submit').on('click', function () {
        if ($$('#cl-owner-name').val() == "") {
            //empty email input textbox case
            myApp.alert("Please enter car owner's name.", 'Error');
        }
        else if (($$('#cl-owner-ic').val() == "") && ($$('#cl-owner-pass').val() == "")) {
            //empty password input textbox case
            myApp.alert("Please enter car owner's IC No. or passport.", 'Error');
        }
        else if ($$('#cl-phone').val() == "") {
            //empty phone number input textbox case
            myApp.alert('Please enter your phone number.', 'Error');
        }
        else if ($$('#cl-plate').val() == "") {
            //empty phone number input textbox case
            myApp.alert('Please enter your car plate number.', 'Error');
        }
        else if ($$('#cl-location').val() == "") {
            //empty phone number input textbox case
            myApp.alert('Where did you lost your car?', 'Error');
        }
        else {
            cl_owner_name = $$('#cl-owner-name').val();
            cl_owner_ic = $$('#cl-owner-ic').val();
            cl_owner_pass = $$('#cl-owner-pass').val();
            cl_phone = $$('#cl-phone').val();
            cl_plate = $$('#cl-plate').val().toUpperCase();
            cl_location = $$('#cl-location').val();
            cl_remarks = $$('#cl-remarks').val();

            userRef.child('report').child('car_loss').push({
                cl_owner_name: cl_owner_name,
                cl_owner_ic: cl_owner_ic,
                cl_owner_pass: cl_owner_pass,
                cl_phone: cl_phone,
                cl_plate: cl_plate,
                cl_location: cl_location,
                cl_remarks: cl_remarks
            }).then(function () {
                myApp.alert('Report Submitted!');
            }).catch(function (error) {

            });

        }

    });


    var ip_plate;
    var ip_location;
    var ip_behavior;
    var ip_remarks;
    //-----------------------------
    // submit button for illegal parking
    //-----------------------------
    $$('#ip-submit').on('click', function () {
        if ($$('#ip-plate').val() == "") {
            //empty email input textbox case
            myApp.alert('Please enter the car plate of illegal parked car.', 'Error');
        }
        else if ($$('#ip-location').val() == "") {
            //empty password input textbox case
            myApp.alert('Please enter the loaction.', 'Error');
        }
        else if ($$('#ip-behavior').val() == "") {
            //empty username input textbox case
            myApp.alert('Please enter the behavior of illegal parked car.', 'Error');
        }
        else {
            ip_plate = $$('#ip-plate').val().toUpperCase();
            ip_location = $$('#ip-location').val();
            ip_behavior = $$('#ip-behavior').val();
            ip_remarks = $$('#ip-remarks').val();

            userRef.child('report').child('illegal_park').push({
                ip_plate: ip_plate,
                ip_location: ip_location,
                ip_behavior: ip_behavior,
                ip_remarks: ip_remarks
            }).then(function () {
                myApp.alert('Report Submitted!');
            }).catch(function (error) {
                });
        }

    });


})