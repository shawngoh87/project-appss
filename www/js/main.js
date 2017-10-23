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
var Strg = {};
var Loaded, user, userRef, adminRef, carRef, carRead, storageRef, topupHistRef, historyRef, historyRead;
var rate, selfset = false, selectedCar = false, selectedLocation = false;
var expired = false, extendDuration;

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
    adminRef = firebase.database().ref('admin');
    carRef = userRef.child('cars');
    historyRef = userRef.child('history');
    topupHistRef = userRef.child('topup_history');
    storageRef = firebase.storage().ref();
    userRef.on('value',
        // Succeeded promise
        function (snapshot) {
            console.log('Promise succees from DB.');
            Db.user = snapshot.val();
            localStorage.setItem('user', JSON.stringify(Db.user));
            if (!Loaded) { mainView.router.loadPage("main.html"); Loaded = 1; } // Route to main.html only once.
            $$('.index-preloader').hide();
            console.log(Db.user);
            carRead = Db.user.cars;
            historyRead = Db.user.history;
            topupHistRead = Db.user.topup_history;
            refreshActiveHistory();
        },
        // Failed promise
        function (err) {
            console.log(err);
        }
    );
    adminRef.on('value', function (snapshot) {
        Db.admin = snapshot.val();
        rate = Db.admin.token_per_minute / 60000;
        Strg.logo = {};
        var i = 0;
        for (var promoCompany in Db.admin.promotions) {
            (function (promoC) {
                storageRef.child('logo/' + promoC + '.png').getDownloadURL().then(function (url) {
                    Strg.logo[promoC] = url;
                })
            })(promoCompany);
        }
    })
}

//----------------------------------
// Forget Password button function
//----------------------------------
$$('#forget-password').on('click', function () {
    myApp.prompt('Enter your email address below and a password reset email will be sent to you.', 'Forget Password?', function (fp_email) {
        if (fp_email === "") {
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
        if (errorCode === "auth/user-disabled")
            myApp.alert(errorMessage, 'Error');
        else if (errorCode === "auth/invalid-email")
            myApp.alert(errorMessage, 'Error');
        else if (errorCode === "auth/user-not-found")
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
        var progress;

        //refresh for the progress bar
        var duration = carRead[ownedCarPlate].parking.duration;

        var dataProgress = Math.floor((((duration - remainTime) / duration) * 100));
        var percentProgress = dataProgress - 100;

        strDataProgress = ''+ dataProgress +''
        document.getElementById('progressbar'+ownedCarPlate+'').setAttribute("data-progress", strDataProgress);

        var strProgressbar = 'transform: translate3d(' + percentProgress + '%, 0px, 0px);'
        document.getElementById('innerProgressbar' + ownedCarPlate + '').setAttribute("style", strProgressbar);

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
                var parkingPromocode = carRead[ownedCarPlate].parking.promocode;
                if (parkingActive) {
                    if (parkingDuration + parkingTimestamp < Math.floor(Date.now())) {
                        carRef.child(ownedCarPlate).child('history').child(ownedCarPlate + parkingTimestamp).update({
                            amount: parkingAmount,
                            location: parkingLocation,
                            duration: timestamp2Time(parkingDuration).name,
                            promocode: parkingPromocode,
                            start_time: parkingTimestamp
                        })
                        historyRef.child(9999999999999 -parkingTimestamp).update({
                            carPlate: ownedCarPlate,
                            amount: parkingAmount,
                            location: parkingLocation,
                            duration: timestamp2Time(parkingDuration).name,
                            startTime: parkingTimestamp
                        })
                        showHistory();
                        carRef.child(ownedCarPlate).child('parking').update({
                            active: false,
                        })
                    }
                }
            }
        }
    });
}

//-------------------------------------
//          Show History
//-------------------------------------
function showHistory() {
    var historyStackDate = null; //Stack Date for date checking
    var historyStampIndex = 0; //Index stamping for date
    historyCurrentIndex = 0;
    var historyCounter;
    if (historyRead == null) {
        historyCounter = 0;
    }
    else {
        historyCounter = Object.keys(historyRead).length;
    }

    var historyList = new Array(); //historyList
    for (var eleMent in historyRead) {
        var historyDate = new Date(historyRead[eleMent].startTime);
        //Grouping of same date
        if (historyStackDate === null) {                                 //--------Starting
            historyStackDate = historyDate;
            historyList[historyCurrentIndex] = historyRead[eleMent];
            historyCurrentIndex++;
            //Check for last iteration
            if (historyCurrentIndex === historyCounter) {
                showMeHistory();
            }
        }
        else if (historyStackDate.getYear() === historyDate.getYear() &&
            historyStackDate.getMonth() === historyDate.getMonth() &&
            historyStackDate.getDate() === historyDate.getDate()) {      //--------Same date
            historyList[historyCurrentIndex] = historyRead[eleMent];
            historyCurrentIndex++;
            if (historyCurrentIndex === historyCounter) {
                showMeHistory();
            }
        }
        else {                                                          //--------Next date checked
            showMeHistory();
            historyStackDate = historyDate;                             //--------Stack the new date for date grouping
            historyList[historyCurrentIndex] = historyRead[eleMent];
            historyCurrentIndex++;
            if (historyCurrentIndex === historyCounter) {
                showMeHistory();
            }
        }

        //History output

        function showMeHistory() {
            var monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun",
                "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
            ];
            var historyTemplate = "";
            for (historyTempIndex = historyStampIndex; historyTempIndex < historyCurrentIndex; historyTempIndex++) {
                historyTime = new Date(historyList[historyTempIndex].startTime);
                var historyTemp2 = '<li class="accordion-item" id="histInfo' + [historyTempIndex] + '1">' +
                    '<a href="#" class="item-content item-link">' +
                    '<div class="item-inner" id=histItem>' +
                    '<div id="car-icon" class="item-title"><i class="material-icons">directions_car</i>' + historyList[historyTempIndex].carPlate + '</div>' +
                    '<div class="item-after"><div id=histInfo">' + addZeroHist(historyTime.getHours()) + ":" + addZeroHist(historyTime.getMinutes()) + '<br><div id="histLocation' + historyTempIndex + '"></div></div>' +
                    '</div> ' +
                    '</div>' +
                    '</a>' +
                    '<div class="accordion-item-content" id="topup-accordion">' +
                    '<div class="content-block">' +
                    '<div id="history-car-plate"><i class="material-icons">directions_car</i> <b >' + historyList[historyTempIndex].carPlate + '<br> </b> </div>' +
                    '<div id="history-info">' +
                    '<div id="histLocation' + [historyTempIndex] + '1"><i class="material-icons">place</i></div>' +
                    '<div><i class="material-icons">access_time</i> ' + historyTime.getDate() + ' ' + monthNames[historyStackDate.getMonth()] + ' ' + historyTime.getFullYear() + ' ' + addZeroHist(historyTime.getHours()) + ':' + addZeroHist(historyTime.getMinutes()) + '</div>' +
                    '<div><i class="material-icons">hourglass_empty</i> ' + historyList[historyTempIndex].duration + '</div>' +
                    '<div><i class="material-icons">attach_money</i> ' + historyList[historyTempIndex].amount + '</div>' +
                    '</div>' +
                    '</div>' +
                    '</div>' +
                    '</li>';
                function addZeroHist(i) {
                    if (i < 10) {
                        i = "0" + i;
                    }
                    return i;
                }
                historyTemplate += historyTemp2;

            }
            historyStampIndex = historyCurrentIndex;
            var historyTemp1 = '<div class="timeline-item">' +
                '<div id="timeline-date" class="timeline-item-date">' + historyStackDate.getDate() + '<sub><sup>' + monthNames[historyStackDate.getMonth()] + '</sup></sub></div>' +
                '<div class="timeline-item-divider"></div >' +
                '<div class="timeline-item-content list-block inset">' +
                '<ul>' + historyTemplate;
            $$("#show-history").append(historyTemp1);

        }
    }
    for (i = 0; i < historyCounter; i++) {
        getCity(historyList[i].location,i);
    }
    function getCity(latlng,i) {
        var geocoder = new google.maps.Geocoder;
        var histCity;
        geocoder.geocode({ 'location': latlng }, function (results, status) {
            if (status === 'OK') {
                if (results[0]) {

                    results[0].address_components.forEach(function (element2) {
                        element2.types.forEach(function (element3) {
                            switch (element3) {
                                case 'sublocality':
                                    histCity = element2.long_name;
                                    break;
                            }
                        })
                    });
                    $$('#histLocation' + i).append(histCity);
                    $$('#histLocation' + i + '1').append(histCity);  //demo: display city name

                } else {
                    $$('#histLocation' + i + '1').html("result error");
                }
            } else {
                $$('#histLocation' + i + '1').html("Geocode fail");
            }
        });
    }
    historyList = [];
}

function refreshHistory() {
    clearBox('show-history');
    showHistory();
}
function clearBox(id) {
    document.getElementById(id).innerHTML = "";
}


//-------------------------------------
//        Show Topup History
//------------------------------------

function showTopupHist() {
    var topupHistStackDate = null; //Stack Date for date checking
    var topupHistStampIndex = 0; //Index stamping for date
    topupHistCurrentIndex = 0;
    var topupHistList = new Array(); //topuphistoryList
    var topupHistCounter;
    if (topupHistRead == null) {
        topupHistCounter = 0;
    }
    else {
        topupHistCounter = Object.keys(topupHistRead).length;
    }
    for (var topupElement in topupHistRead) {
        var topupHistDate = new Date(topupHistRead[topupElement].topup_time);

        //Grouping of same date
        if (topupHistStackDate === null) {                                 //--------Starting
            topupHistStackDate = topupHistDate;
            topupHistList[topupHistCurrentIndex] = topupHistRead[topupElement];
            topupHistCurrentIndex++;
            //Check for last iteration
            if (topupHistCurrentIndex === topupHistCounter) {
                showMeTopupHist();
            }
        }
        else if (topupHistStackDate.getYear() === topupHistDate.getYear() &&
            topupHistStackDate.getMonth() === topupHistDate.getMonth() &&
            topupHistStackDate.getDate() === topupHistDate.getDate()) {      //--------Same date
            topupHistList[topupHistCurrentIndex] = topupHistRead[topupElement];
            topupHistCurrentIndex++;
            if (topupHistCurrentIndex === topupHistCounter) {
                showMeTopupHist();
            }
        }
        else {                                                          //--------Next date checked
            showMeTopupHist();
            topupHistStackDate = topupHistDate;                             //--------Stack the new date for date grouping
            topupHistList[topupHistCurrentIndex] = topupHistRead[topupElement];
            topupHistCurrentIndex++;
            if (topupHistCurrentIndex === topupHistCounter) {
                showMeTopupHist();
            }
        }

        //History output

        function showMeTopupHist() {
            var monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun",
                "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
            ];
            var monthNameFull = new Array("January", "February", "March", "April", "May", "Jun", "July", "August", "September", "October", "November", "December");
            var topupHistTemplate = "";
            for (topupHistTempIndex = topupHistStampIndex; topupHistTempIndex < topupHistCurrentIndex; topupHistTempIndex++) {
                topupHistTime = new Date(topupHistList[topupHistTempIndex].topup_time);
                var topupHistTemp2 = '<li class="accordion-item" id="topupHistInfo' + [topupHistTempIndex] + '1">' +
                    '<a href="#"  class="item-content item-link" >' +
                    '<div class="item-inner" id=topupHistItem>' +
                    '<div id="topup-icon" class="item-title"> <i class="material-icons">credit_card</i> -XXXX-' + topupHistList[topupHistTempIndex].credit_card_no % 10000 + '</div>' +
                    '<div class="item-after"><div>RM ' + topupHistList[topupHistTempIndex].amount + '</div>' +
                    '</div > ' +
                    '</div>' +
                    '</a>' +
                    '<div class="accordion-item-content" id="topup-accordion">' +
                    '<div class="content-block">' +
                    '<div id="topup-info">' +
                    '<div><i class="material-icons">access_time</i>' + topupHistTime.getDate() + ' ' + monthNameFull[topupHistStackDate.getMonth()] + ' ' + topupHistTime.getFullYear() + '<br></div>' +
                    '<div><i class="material-icons">attach_money</i> RM ' + topupHistList[topupHistTempIndex].amount + '<br></div>' +
                    '<div><i class="material-icons">credit_card</i>XXXX-XXXX-XXXX-' + topupHistList[topupHistTempIndex].credit_card_no % 10000 + '<br> (exp: ' + topupHistList[topupHistTempIndex].expired_date + ')</div>' +
                    '</div>' +
                    '</div>' +
                    '</div>' +
                    '</li>';

                function addZeroHist(i) {
                    if (i < 10) {
                        i = "0" + i;
                    }
                    return i;
                }
                topupHistTemplate += topupHistTemp2;
            }
            topupHistStampIndex = topupHistCurrentIndex;
            var topupHistTemp1 = '<div class="timeline-item">' +
                '<div id="timeline-date" class="timeline-item-date">' + topupHistStackDate.getDate() + '<sub><sup>' + monthNames[topupHistStackDate.getMonth()] + '</sup></sub></div>' +
                '<div class="timeline-item-divider"></div >' +
                '<div class="timeline-item-content list-block inset">' +
                '<ul>' + topupHistTemplate;
            $$("#show-topup-hist").append(topupHistTemp1);

        }
    }
}

function refreshTopupHist() {
    clearBox('show-topup-hist');
    showTopupHist();
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
    console.log(Db);
    var tokenNO, tokenReq, tokenBal, parkDuration, carPlate, confirmText;
    var ownedCar, timeStamp;

    //-----------------------
    //Initiate UI
    //-----------------------
    myApp.showIndicator();
    var waitLoading = setTimeout(function () {
        myApp.hideIndicator();
        myApp.alert('Poor internet connection.', 'Notification');
    }, 5000);
    if (Db.user && Db.admin) {
        console.log("Loading completed")
        myApp.hideIndicator();
        clearTimeout(waitLoading);
        //Initiate duration selection bar info
        getDuration();

        //Get cars and update

        for (var ownedCarPlate in carRead) {
            var parkingActive = carRead[ownedCarPlate].parking.active;
            var parkingAmount = carRead[ownedCarPlate].parking.amount;
            var parkingDuration = carRead[ownedCarPlate].parking.duration;
            var parkingTimestamp = carRead[ownedCarPlate].parking.timestamp;
            var parkingLocation = carRead[ownedCarPlate].parking.location;
            var parkingPromocode = carRead[ownedCarPlate].parking.promocode;
            if (parkingActive) {
                if (parkingDuration + parkingTimestamp < Math.floor(Date.now())) {
                    carRef.child(ownedCarPlate).child('history').child(ownedCarPlate + parkingTimestamp).update({
                        amount: parkingAmount,
                        location: parkingLocation,
                        duration: timestamp2Time(parkingDuration).name,
                        promocode: parkingPromocode,
                        start_time: parkingTimestamp
                    })
                    historyRef.child(9999999999999 - parkingTimestamp).update({
                        carPlate: ownedCarPlate,
                        amount: parkingAmount,
                        location: parkingLocation,
                        duration: timestamp2Time(parkingDuration).name,
                        startTime: parkingTimestamp
                    }).then(function () {
                        refreshHistory();
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
            $$('#tab-vehicle').append(str1 + displayCarPlate + str2 + cars[displayCarPlate].description + str3);
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

                var dataProgress = Math.floor((((activeDuration - remain_time) / activeDuration) * 100));
                var percentProgress = dataProgress - 100;

                var str_active = '<li class="actively-parking-car">' +
                    '<a href="#" data-popover=".popover-active' + activeCarPlate + '" class="item-link item-content open-popover">' +
                    '<div class="item-inner">' +
                    '<div class="item-title-row">' +
                    '<div id="car-icon" class="item-title"><i class="material-icons">child_friendly</i>' + activeCarPlate + '</div>' +
                    '<input id="timestamp-active-end" value="' + end_time + '" />' +
                    '<div id="lbl-time-left" class="item-after">' + time_val + '</div>' +
                    '<div id="lbl-time-remain" class="item-after">' + time_unit + ' <br />remaining</div>' +
                    '</div>' +
                    '<div class="item-subtitle active-car-location">' + user_pos.city + '</div>' +
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
                    '<button id="terminate-btn" value="' + activeCarPlate + '" onclick="terminateParkingTime(this.value)">Terminate</button>' +
                    '<button id="extend-btn" value="' + activeCarPlate + '" onclick="extendParkingTime(this.value)">Extend</button>' +
                    '</div>' +
                    '</div>' +
                    '</div>' +
                    '</div>' +
                    '<span class="progressbar" id="progressbar' + activeCarPlate + '" data-progress="' + dataProgress + '">' +
                    '<span class="" id="innerProgressbar' + activeCarPlate + '" style="transform: translate3d(' + percentProgress + '%, 0px, 0px);"></span>' +
                    '</span>'
                '</li>';
                $$('#ulist-active').append(str_active);
                getActiveAddress(activeLocation, activeCarPlate);
            }
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
                var parkingPromocode = carRead[ownedCarPlate].parking.promocode;
                if (parkingActive) {
                    if (parkingDuration + parkingTimestamp < Math.floor(Date.now())) {
                        carRef.child(ownedCarPlate).child('history').child(ownedCarPlate + parkingTimestamp).update({
                            amount: parkingAmount,
                            location: parkingLocation,
                            duration: timestamp2Time(parkingDuration).name,
                            promocode: parkingPromocode,
                            start_time: parkingTimestamp
                        })
                        historyRef.child(9999999999999 -parkingTimestamp).update({
                            carPlate: ownedCarPlate,
                            amount: parkingAmount,
                            location: parkingLocation,
                            duration: timestamp2Time(parkingDuration).name,
                            startTime: parkingTimestamp
                        }).then(function () {
                            refreshHistory();
                        })
                        carRef.child(ownedCarPlate).child('parking').update({
                            active: false,
                        })
                        $$(".select-car").append(
                            '<li class="car-choice"><label class="label-radio item-content">' +
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
                        '<li class="car-choice"><label class="label-radio item-content">' +
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
        myApp.closeModal();
    })

    //----------------------
    //Get Selected Duration
    //----------------------
    function getDuration() {
        parkDuration = +$$('.park-duration').val();
        tokenReq = (parkDuration * rate);
        $$('.selected-duration').html(clockPass(parkDuration));
        $$('.selected-park-duration').html(timestamp2Time(parkDuration).shortName);
        $$('.required-token').html(tokenReq);
    }

    setInterval(function () {
        getDuration();
    }, 60000)

    $$('.park-duration').on('input', function () {
        getDuration();
    })

    //-----------------------
    // Pay Button Function
    //-----------------------
    $$('.confirm-payment').on('click', function () {
        if (selectedCar && selectedLocation && parkDuration > 0) {
            confirmText =
                'Selected Car is&emsp;&emsp;&nbsp:' + carPlate.toString() + '<br>' +
                'Park Until&emsp;&emsp;&emsp;&emsp;&ensp;:' + $$('.selected-duration').text() + '<br>' +
                'Token required is &ensp;&nbsp:' + tokenReq.toString() + '<br><br>' +
                'Confirm Transaction?';
            myApp.confirm(confirmText, 'Confirmation', function () {

                tokenNo = Db.user.balance;
                tokenBal = tokenNo - tokenReq;
                if (tokenBal < 0) {
                    myApp.alert('Insufficient balance.', 'Notification');
                }
                else {
                    myApp.modal({
                        title: 'Payment confirmed',
                        text: 'Nearby shops are having some special promotions for YOU',
                        verticalButtons: true,
                        buttons: [
                            {
                                text: 'Check it out',
                                onClick: function () {
                                    mainView.router.loadPage("promotion.html");
                                }
                            },
                            {
                                text: 'Nevermind',
                                onClick: function () {
                                    //Do nothing
                                }
                            }
                        ]
                    })
                    userRef.update({
                        balance: tokenBal
                    })
                    $$('.token').html(+tokenBal);
                    $$('.selected-car-plate').html('Select Car');
                    $$('.selected-location').html('Location');
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
                        promocode: $$('#used-promo-code').val(),
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
                    var dataProgress;

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
                    
                    var dataProgress = Math.floor((((parkDuration - remain_time) / parkDuration) * 100));
                    var percentProgress = dataProgress - 100;

                    var str_active = '<li class="actively-parking-car">' +
                                        '<a href="#" data-popover=".popover-active' + carPlate + '" class="item-link item-content open-popover">' +
                                            '<div class="item-inner">' +
                                                '<div class="item-title-row">' +
                                                    '<div id="car-icon" class="item-title"><i class="material-icons">child_friendly</i>' + carPlate + '</div>' +
                                                    '<input id="timestamp-active-end" value="' + end_time + '" />' +
                                                    '<div id="lbl-time-left" class="item-after">' + time_val + '</div>' +
                                                    '<div id="lbl-time-remain" class="item-after">' + time_unit + ' <br />remaining</div>' +
                                                    '</div>' +
                                                    '<div class="item-subtitle active-car-location"><i class="material-icons">place</i>' + user_pos.city + '</div>' +
                                            '</div>' +
                                        '</a>' +
                                        '<div class="popover popover-active' + carPlate + '" id="popover-active">' +
                                            '<div class="popover-angle"></div>' +
                                            '<div class="popover-inner">' +
                                                '<div class="content-block">' +
                                                    '<div id="active-car-plate">' + carPlate + '</div>' +
                                                    '<div id="location">' + user_pos.city + '</div><br />' +
                                                    '<div id="promo">Promotion used: ' + promoCode + '</div>' +
                                                    '<div id="lbl-time">Expected End Time:</div>' +
                                                    '<div id="time-remain">' + end_time_dis.getHours() + ' : ' + end_time_dis.getMinutes() + ' : ' + end_time_dis.getSeconds() + '</div><br />' +
                                                    '<div id="lbl-btns">Press button to extend or terminate the parking time.</div>' +
                                                    '<div id="btns">' +
                                                        '<button id="terminate-btn" value="' + carPlate + '" onclick="terminateParkingTime(this.value)">Terminate</button>' +
                                                        '<button id="extend-btn" value="' + carPlate + '" onclick="extendParkingTime(this.value)">Extend</button>' +
                                                    '</div>' +
                                                '</div>' +
                                            '</div>' +
                                        '</div>' +
                                        '<span class="progressbar" id="progressbar' + carPlate + '" data-progress="' + dataProgress + '">' +
                                            '<span class="" id="innerProgressbar' + carPlate + '" style="transform: translate3d(' + percentProgress + '%, 0px, 0px);"></span>' +
                                        '</span>'
                                     '</li>';

                    $$('#ulist-active').append(str_active);
                    selfset = false;
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
                            timestamp: '',
                            promocode:''
                        })

                        //write to UI
                        var str1 = '<div class="card"><div class="card-content"><div class="list-block"><ul><li><a class="item-content item-link" href="vehicle-history" onclick="loadSpecificTransaction(\'' + displayCarPlate.toString() + '\');"><div class="item-inner" style="background-image:none; padding-right: 20px"><div class="item-title"><div class="owned-car">';
                        var str2 = '</div><div class="cards-item-title">'
                        var str3 = '</div></div><div class="item-after"><i class="material-icons override-icon-size item-link" style="">cancel</i></div></div></a></li></ul></div></div></div>';
                        //var str = '<div class="card"><div class="card-content"><div class="list-block"><ul><li><a class="item-link item-content" onclick="loadSpecificTransaction(\'' + displayCarPlate.toString() + '\');" href="vehicle-history"><div class="item-inner style="padding-right: 10px" style="background-image:none"><div class="item-title"><div class="owned-car">GOTCHA</div><div class="cards-item-title">hint</div></div><div class="item-after"></div><i class="material-icons override-icon-size item-link" style="">cancel</i></div></a></li></ul></div></div></div>';
                        $$('#tab-vehicle').append(str1 + displayCarPlate + str2 + $$('#txt-car-description').val() + str3);
                        myApp.closeModal();
                    }
                },
            ]
        })
    });


    
    //-----------------------------
    // History tab 
    //-----------------------------
    

    $$("#historyRefresh").on('ptr:refresh', function (e) {
        setTimeout(function () {
            refreshHistory();
            myApp.pullToRefreshDone();
            return;
        }, 5000);
    });

    showHistory();

    $$('#show-history').on("accordion:open", function () {
        for (j = 0; j < historyCurrentIndex; j++) {
            var ID = document.getElementById('histInfo' + j + '1');
            myApp.accordionCheckClose(ID);
        }
        return;
    });

    $$("#topupHistRefresh").on('ptr:refresh', function (e) {
        setTimeout(function () {
            myApp.pullToRefreshDone();
            return;
        }, 5000);
    });

    
    showTopupHist();

    $$('#show-topup-hist').on("accordion:open", function () {
        for (j = 0; j < topupHistCurrentIndex; j++) {
            var ID = document.getElementById('topupHistInfo' + j + '1');
            myApp.accordionCheckClose(ID);
        }
        return;
    });

    


    //------------------------------------------------------------------------

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
    var extendCarRead = carRead;
    $$('.actively-parking-car').each(function(){
        if((extendCarRead[theCar].parking.timestamp + extendCarRead[theCar].parking.duration) - Date.now() <= 0){
            expired = true;
        }
    });
    if (expired) {
        myApp.closeModal();
        myApp.alert('The parking session of this car was expired', 'Notification');
        refreshActiveHistory();
    }
    else {
        myApp.closeModal();
        if ($$('.picker-modal.modal-in').length > 0) {
            myApp.closeModal('.picker-modal.modal-in');
        }

        myApp.pickerModal(
            '<div class="picker-modal">' +
                '<div class="toolbar">' +
                    '<div class="toolbar-inner">' +
                        '<div class="left" id="extendCarPlate">&emsp;' + theCar + '</div>' +
                        '<div class="right"><a href="#" class="close-picker">Cancel&emsp;</a></div>' +
                    '</div>' +
                '</div>' +
                '<div class="picker-modal-inner">' +
                    '<div class="content-block" id="extend-content">' +
                        '<div id="lbl-extend">Please select the duration to extend the parking time.</div><br/>' +
                        '<div class="item-title label">' +
                            '<p class="slider-info row">' +
                                '<span class="col-30">Park until:</span>' +
                                '<span class="col-50">Duration:</span>' +
                                '<span class="col-20">Token:</span>' +
                            '</p>' +
                        '</div>' +
                        '<div>' +
                            '<p class="slider-info row">' +
                                '<span class="col-30 extended-duration"></span>' +
                                '<span class="col-55 selected-extend-duration"></span>' +
                                '<span class="col-15 extended-token"></span>' +
                            '</p>' +
                        '</div>' +
                        '<div class="item-input">' +
                            '<div class="range-slider">' +
                                '<input type="range" class="extend-duration" min="600000" max="43200000" value="3600000" step="600000" />' +
                            '</div>' +
                        '</div><br />' +
                        '<button class="actions-modal-button actions-modal-button-bold" id="confirm-btn" value="' + theCar + '" onclick="extendConfirmed(this.value)">Confirm</button>' +
                    '</div>' +
                '</div>' +
            '</div>'
        )
    }

    //----------------------
    //Get Selected Extend Duration
    //----------------------
    var extendEndTime = (extendCarRead[theCar].parking.timestamp + extendCarRead[theCar].parking.duration) - Date.now();
    function getDuration() {
        extendDuration = +$$('.extend-duration').val();
        var tokenNeeded = (extendDuration * rate);
        $$('.extended-duration').html(clockPass(extendEndTime + extendDuration));
        $$('.selected-extend-duration').html(timestamp2Time(extendDuration).name);
        $$('.extended-token').html(tokenNeeded);
    }

    getDuration();

    setInterval(function () {
        getDuration();
    }, 60000)

    $$('.extend-duration').on('input', function () {
        getDuration();
    })
};
//---------------------------------------
// Extend Function
//---------------------------------------
function extendConfirmed(theCar) {
    var tokenNO, tokenReq, tokenBal;

    tokenReq = (extendDuration * rate);
    extendConfirmText =
        'Selected car is&emsp;&emsp;&nbsp:' + theCar.toString() + '<br>' +
        'Extended until&emsp;&emsp;:' + $$('.extended-duration').text() + '<br>' +
        'Token required is &emsp;:' + tokenReq.toString() + '<br><br>' +
        'Confirm Transaction?';
    myApp.confirm(extendConfirmText, 'Confirmation', function () {

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
                $$('.selected-duration').html('Duration');
                $$('.selected-duration-logo').css('color', 'inherit');
                extendedDuration = false;
                $$('.close-picker').click();
            }

        //Update to firebase
        var amount = carRead[theCar].parking.amount;
        var duration = carRead[theCar].parking.duration;
        var timestamp = carRead[theCar].parking.timestamp;
        var location = carRead[theCar].parking.location;
        
        var newAmount = amount + tokenReq;
        var newDuration = duration + extendDuration;

        carRef.child(theCar).child('parking').update({
            active: true,
            amount: newAmount,
            duration: newDuration
        })
    })
    $$('#tab-history-button').click();
    $$('#tab-active-button').click();
}

//---------------------------------------
// Terminate Function
//---------------------------------------
function terminateParkingTime(theCar) {
    var timeVal, timeUnit;
    var terminateAmount = carRead[theCar].parking.amount;
    var terminateDuration = carRead[theCar].parking.duration;
    var terminateTimestamp = carRead[theCar].parking.timestamp;
    var terminateLocation = carRead[theCar].parking.location;
    var terminatePromoCode = carRead[theCar].parking.promocode;

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
        'Are you sure that you want to terminate the follwing parking?<br/>' +
        'Car Plate Number&emsp;&nbsp:' + theCar.toString() + '<br/>' +
        'Time Remaining&emsp;:' + timeVal + ' ' + timeUnit + '<br/>' +
        'Expected End Time is :<br/>' + terminateTime.getHours() + ' : ' + terminateTime.getMinutes() + ' : ' + terminateTime.getSeconds() + '<br/><br/>' +
        'Confirm to Terminate?';

    myApp.confirm(terminateConfirmText, 'Confirmation', function () {
        //Update to firebase
        carRef.child(theCar).child('parking').update({
            active: false,
            duration: 0,
            timestamp: 0
        })

        terminateDuration -= terminateRemainTime;
        
        carRef.child(theCar).child('history').child(theCar + terminateTimestamp).update({
            amount: terminateAmount,
            promocode: terminatePromoCode,
            location: terminateLocation,
            duration: timestamp2Time(terminateDuration).name,
            start_time: terminateTimestamp
        })
        historyRef.child(9999999999999-terminateTimestamp).update({
            carPlate: theCar,
            amount: terminateAmount,
            location: terminateLocation,
            duration: timestamp2Time(terminateDuration).name,
            startTime: terminateTimestamp
        }).then(function () {
            refreshHistory();
        })
        myApp.alert('The parking for car plate number ' + theCar + ' is terminated.', 'Confirmation');
        $$('.close-picker').click();
    })
    refreshActiveHistory();
    myApp.closeModal();
}


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
        if ($$('#su-email').val() === "") {
            //empty email input textbox case
            myApp.alert('Please enter your email.', 'Error');
        }
        else if ($$('#su-password').val() === "") {
            //empty password input textbox case
            myApp.alert('Please enter your password.', 'Error');
        }
        else if ($$('#su-username').val() === "") {
            //empty username input textbox case
            myApp.alert('Please enter your username.', 'Error');
        }
        else if ($$('#su-phone-no').val() === "") {
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
                    mainView.router.back(); // Route later
                }).catch(function (error) {
                    // An error happened.
                });


            }).catch(function (error) {
                // Handle Sign Up Errors here.
                var errorCode = error.code;
                var errorMessage = error.message;
                if (errorCode === "auth/email-already-in-use")
                    myApp.alert(errorMessage, 'Error');
                else if (errorCode === "auth/invalid-email")
                    myApp.alert(errorMessage, 'Error');
                else if (errorCode === "auth/operation-not-allowed")
                    myApp.alert(errorMessage, 'Error');
                else if (errorCode === "auth/weak-password")
                    myApp.alert(errorMessage, 'Error');
            });

        }
    })
});

// ======= Color themes ======= 
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

    $$('.load-username').html(Db.user.username);
    $$('.load-real-name').html(Db.user.real_name);
    $$('.load-email').html(Db.user.email);          //might need to change
    $$('.load-phone-no').html(Db.user.phone_no);
    $$('.load-gender').html(Db.user.gender);
    $$('.load-birthday').html(Db.user.birthday);
    $$('.load-address').html(Db.user.address);
    $$('.load-ic-no').html(Db.user.IC);
   


    $$('.button-profile-pic').on('click', function () {
        var options = [
            {
                text: 'View Profile Picture',
                bold: true
            },
            {
                text: 'Edit Profile Picture',
                bold: true
            }
        ];
        var cancel = [
            {
                text: 'Cancel',
                color: 'red',
                bold: true
            }
        ];
        var action_profile_pic = [options, cancel];
        myApp.actions(action_profile_pic);
    
    });
});

//---------------------------
// Select Location function
//---------------------------
myApp.onPageInit("select-location", function (page) {
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
            selfset = false;
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
            selfset = true;
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
        if (selfset === true) {
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
        if (status === google.maps.places.PlacesServiceStatus.OK) {
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
            map.setZoom(18);
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
                    obj['city'] = city;
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
                geocodeLatLng(default_pos, default_pos);
                selfset_pos['lat'] = position.coords.latitude;
                selfset_pos['lng'] = position.coords.longitude;
                geocodeLatLng(selfset_pos, selfset_pos);

                if (selectedLocation && selfset) {
                    $$('input[name=default-loca]').click();
                    selfset_pos = user_pos;
                    pos = {
                        lat: selfset_pos.lat,
                        lng: selfset_pos.lng
                    }
                    var intrv = setInterval(function () {
                        if (default_pos.full_addr !== 'none') {
                            clearInterval(intrv);
                            $$('#default-address').html(selfset_pos['full_addr']);
                        }
                    }, 100);
                }
                map.setCenter(pos);
                nearbySearch(map, pos);
                // Create a marker 
                default_marker.push(new google.maps.Marker({
                    map: map,
                    position: pos
                }));

                initAutocomplete(map);
            }, function () {
                    myApp.alert("Ops! Geolocation service failed.", "Message");
                }, { enableHighAccuracy: true });
        }
        else {
            // Device doesn't support Geolocation
            myApp.alert("Device does not support geolocation.", "Message");
        }
    }
});

//Need to change ordering way//////////////////////
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
                if (promocode.status.toLowerCase() === 'available') {
                    $$('.promo-list-available').append(str1 + eachPromotion + str2 + str3 + promocode.amount + str4 + promocode.expiry_date + str5 + promocode.text);
                    var str_all = '<div class="item-after" style = "color: springgreen" >Available</div>'
                } else if (promocode.status.toLowerCase() === 'expired') {
                    var str_all = '<div class="item-after" style = "color: red" >Expired</div>'
                } else if (promocode.status.toLowerCase() === 'used') {
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

//Change password
myApp.onPageInit('settings-change-password', function (page) {

    $$('#button-update-password').on('click', function () {
        var credential = firebase.auth.EmailAuthProvider.credential(user.email, $$('#old-password').val());
        user.reauthenticateWithCredential(credential).then(function () {
            if ($$('#new-password').val() === $$('#confirm-new-password').val()) {
                user.updatePassword($$('#new-password').val()).then(function () {
                    // Update successful.
                    myApp.alert('Your password has been updated!');
                    mainView.router.loadPage("profile-settings.html");
                }).catch(function (error) {
                    // An error happened.
                });
            } else {
                myApp.alert('Password and confirm password does not match', 'Error!');
            }
        }).catch(function (error) {
            var errorCode = error.code;
            var errorMessage = error.message;
            if (errorCode === "auth/wrong-password")
                myApp.alert(errorMessage, 'Error');
            })
    });
});


//Make Report (CarLoss/IllegalPark)
myApp.onPageInit('profile-report', function (page) {

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
        if ($$('#cl-owner-name').val() === "") {
            //empty email input textbox case
            myApp.alert("Please enter car owner's name.", 'Error');
        }
        else if (($$('#cl-owner-ic').val() === "") && ($$('#cl-owner-pass').val() === "")) {
            //empty password input textbox case
            myApp.alert("Please enter car owner's IC No. or passport.", 'Error');
        }
        else if ($$('#cl-phone').val() === "") {
            //empty phone number input textbox case
            myApp.alert('Please enter your phone number.', 'Error');
        }
        else if ($$('#cl-plate').val() === "") {
            //empty phone number input textbox case
            myApp.alert('Please enter your car plate number.', 'Error');
        }
        else if ($$('#cl-location').val() === "") {
            //empty phone number input textbox case
            myApp.alert('Where did you lost your car?', 'Error');
        }
        else {
            cl_owner_name = $$('#cl-owner-name').val();
            cl_owner_ic = $$('#cl-owner-ic').val();
            cl_owner_pass = $$('#cl-owner-pass').val();
            cl_phone = $$('#cl-phone').val();
            cl_plate = $$('#cl-plate').val();
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
                mainView.router.refreshPage();
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
        if ($$('#ip-plate').val() === "") {
            //empty email input textbox case
            myApp.alert('Please enter the car plate of illegal parked car.', 'Error');
        }
        else if ($$('#ip-location').val() === "") {
            //empty password input textbox case
            myApp.alert('Please enter the loaction.', 'Error');
        }
        else if ($$('#ip-behavior').val() === "") {
            //empty username input textbox case
            myApp.alert('Please enter the behavior of illegal parked car.', 'Error');
        }
        else {
            ip_plate = $$('#ip-plate').val();
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
                mainView.router.refreshPage();
            }).catch(function (error) {
            });
        }

    });


});


myApp.onPageInit('promotion', function (page) {
    //-------------
    //Initiate UI
    //-------------

    //promotion info
    for (var promoType in Db.admin.promotions) {
        for (var promoNum in Db.admin.promotions[promoType]) {
            $$('#nearbyPromo').append('\
                <div class="card">\
                    <div class="card-content">\
                        <div class="card-content-inner">\
                            <p class="row">\
                                <span class="col-30"><img class="promo-card-logo" src="brokenImg" /></span>\
                                <span class="col-70">\
                                    <b class="promo-card-title">'+ promoType + '</b><br />\
                                    <i class="promo-card-content">'+ Db.admin.promotions[promoType][promoNum] + '</i>\
                                </span>\
                            </p>\
                        </div>\
                    </div >\
                </div >\
            ');
            $$('.promo-card-title').each(function () {
                if ($$(this).text() == promoType) {
                    $$(this).closest('.card').find('.promo-card-logo').attr('src', Strg.logo[promoType]);
                }
            })
        }
    }

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
        var pos = {
            lat: user_pos.lat,
            lng: user_pos.lng
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
                    icon: iconBase + 'placemark_circle_maps.png'
                }));

                google.maps.event.addListener(nearbyMarkers[i + 1], 'click', function (innerKey) {
                    return function () {
                        nearbyInfo[innerKey].open(nearby_map, nearbyMarkers[innerKey]);
                    }
                }(i + 1));
            }
        }
    }
});

//Change Profile
myApp.onPageInit('settings-change-profile', function (page) {
    var name = Db.user.real_name;
    var ic = Db.user.IC;
    var birthday = Db.user.birthday;
    var address = Db.user.address;
    var gender = Db.user.gender;

    $$('#edit-name').val(name);
    $$('#edit-ic').val(ic);
    $$('#edit-birthday').val(birthday);
    $$('#edit-address').val(address);
    $$('#edit-gender').val(gender);

    $$('#button-update-profile').on('click', function () {
        if ($$('#edit-name').val() !== ("") && $$('#edit-ic').val() !== ("") && $$('#edit-birthday').val() !== ("") && $$('#edit-address').val() !== ("")) {

            userRef.update({
                real_name: $$('#edit-name').val(),
                IC: $$('#edit-ic').val(),
                birthday: $$('#edit-birthday').val(),
                address: $$('#edit-address').val(),
                gender: $$('#edit-gender').val(),
            }).then(function () {
                ;
                myApp.alert('Your profile has been updated successfully!');
                mainView.router.refreshPage();
            }).catch(function (error) {
            });
        }
        else {
            myApp.alert('Please completed your profile.', 'Error!');
        }
    });

});

//Change H/P No.
myApp.onPageInit('settings-change-hp', function (page) {
    $$('.load-phone-no').html(Db.user.phone_no);

    $$('#button-update-hp').on('click', function () {
        if ($$('#new-hp').val() != ("") ) {

            userRef.update({
                phone_no: $$('#new-hp').val(),
            }).then(function () {
                ;
                myApp.alert('Your H/P number has been updated successfully!');
                mainView.router.refreshPage();
            }).catch(function (error) {
            });
        }
        else {
            myApp.alert('H/P Number cannot be empty.', 'Error!');
        }
    });

});

