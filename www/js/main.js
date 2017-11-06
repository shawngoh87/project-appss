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
var Loaded, user, userRef, adminRef, carRef, carRead, storageRef, topupHistRef, historyRef, historyRead, topupHistRead, storageuserRef, storageReport_ip_Ref;
var colorTheme;
var rate, selfset = false, selectedCar = false, selectedLocation = false, checkPromo = false, uploadedProfilePic = false;
var expired = false, extendDuration;
var customMarker;

//--------------------------------
//Color them of main page
//--------------------------------
if (localStorage.getItem('color_theme')) {
    changeColorTheme(localStorage.getItem('color_theme'));
}
else {
    changeColorTheme('blue');
}

// Global user position Var
var user_pos = {
    lat: 0,
    lng: 0,
    city: 'none',
    full_addr: 'none',
    locality: 'none'
};
var geo_accuracy;
document.getElementById('login-logo').style.setProperty("top", "37%");
document.getElementById("forget-password").style.visibility = "hidden";

//------------------------------------------
// Check Whether User has signed in or not
//------------------------------------------
firebase.auth().onAuthStateChanged(function (user) {
    document.getElementById('login-logo').style.setProperty("top", "18%");
    document.getElementById("forget-password").style.visibility = "visible";
    if (user) {
        if (!user.emailVerified) {                // Reminder: NOT the condition.
            // email succesfully verified
            // User is signed in.
            document.getElementById("user-input-four-element").style.visibility = "hidden";
            document.getElementById("log-in-notify").style.visibility = "visible";
            $$('.index-preloader').show();
            initUserInfo();
            Loaded = 0;
            // Load local storage after 5 seconds.
            setTimeout(function () {
                console.log('Timedout');
                if (!Loaded) {
                    Strg.logo = JSON.parse(localStorage.getItem('logo'));
                    Strg.icon = JSON.parse(localStorage.getItem('icon'));
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
            }, 10000);
        }
        else {
            // not yet verifiy email
            myApp.alert('An email verification has been sent to you. Please verify it before signing in.', 'Notification');
            firebase.auth().signOut().then(function () { }).catch(function (error) { });
            document.getElementById("user-input-four-element").style.visibility = "visible";
            document.getElementById("log-in-notify").style.visibility = "hidden";
            $$('.index-preloader').hide();
        }
    }
    else {
        $$('.index-preloader').hide();
        // User signed out.
        // Turn off .on() listeners here.
        document.getElementById("user-input-four-element").style.visibility = "visible";
        document.getElementById("log-in-notify").style.visibility = "hidden";
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
    storageuserRef = storageRef.child('users/' + user.uid);
    storageReport_ip_Ref = storageRef.child('report/illegal_park');
    Db.admin = {};

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
    adminRef.child('token_per_minute').on('value', function (snapshot) {
        rate = snapshot.val() / 60000;
    })
    adminRef.child('rewards').on('value', function (snapshot) {
        Db.admin.rewards = snapshot.val();
    })
    adminRef.child('qna').on('value', function (snapshot) {
        Db.admin.qna = snapshot.val();
    })
    adminRef.child('poster').on('value', function (snapshot) {
        Db.admin.poster = snapshot.val();
    })
    adminRef.child('promotion_company').on('value', function (snapshot) {
        Strg.logo = {};
        Strg.icon = {};
        for (var number in snapshot.val()) {
            var promoCompany = snapshot.child(number).val();
            (function (promoC) {
                storageRef.child('logo/' + promoC + '.png').getDownloadURL().then(function (url) {
                    Strg.logo[promoC] = url;
                })
            })(promoCompany);
            (function (promoC) {
                storageRef.child('icon/' + promoC + '_marker.png').getDownloadURL().then(function (url) {
                    Strg.icon[promoC] = url;
                })
            })(promoCompany);
        }
        var strgIntrv = setInterval(function () {
            var finishLogo = false, finishIcon = false;
            if (Strg.logo.length == snapshot.val().length) {
                localStorage.setItem('logo', JSON.stringify(Strg.logo));
                finishLogo = true;
            }
            if (Strg.icon.length == snapshot.val().length) {
                localStorage.setItem('icon', JSON.stringify(Strg.icon));
                finishIcon = true;
            }
            if (finishLogo && finishIcon) {
                clearInterval(strgIntrv);
            }
        })
    })

    storageRef.child('icon/Marker.png').getDownloadURL().then(function (url) {
        customMarker = url;
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

    document.getElementById("user-input-four-element").style.visibility = "hidden";
    document.getElementById("log-in-notify").style.visibility = "visible";
    $$('.index-preloader').show();

    firebase.auth().signInWithEmailAndPassword(si_email, si_password).catch(function (error) {
        document.getElementById("user-input-four-element").style.visibility = "visible";
        document.getElementById("log-in-notify").style.visibility = "hidden";
        $$('.index-preloader').hide();
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
                        if ($$(this).find('#car-icon').text().replace(/drive_eta/g, '') == $$(item).closest('.card').find('.owned-car').text()) {
                            $$(this).remove();
                        }
                    })                    
                    //carRef.child($$(item).closest('.card').find('.owned-car').text()).remove();                     
                    $$(item).closest('.card').remove();
                    console.log($$(item).closest('.card').find('.owned-car').text());

                    firebase.database().ref('users/' + user.uid + '/cars/' + $$(item).closest('.card').find('.owned-car').text()).update({
                        isDelete: true
                    });
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
        var date = new Date(historyInstance.start_time)
        var month = date.getMonth();
        month += 1;
        // For readability purpose
        var str1 = '<div class="card"> <div class="card-header">';
        var loc = historyInstance.city;
        var str2 = '</div> <div class="card-footer"> <div class="col-75">';
        var dur = date.getDate() + '/' + month + '/' + date.getFullYear() + ' ' + addZero(date.getHours()) + ':' + addZero(date.getMinutes());
        var str3 = '</div> <div class="col-25">';
        var total = historyInstance.duration+'<br>'+historyInstance.amount+ ' tokens';
        var str4 = '</div> </div> </div>';

        function addZero(i) {
            if (i < 10) {
                i = "0" + i;
            }
            return i;
        }

        pageContent = (str1 + loc + str2 + dur + str3 + total + str4) + pageContent;

    }
    mainView.loadContent(pageContentHeader + pageContent + pageContentFooter);
}

//---------------------------------
//Function to refresh active card
//--------------------------------
function refreshActiveHistory() {
    $$('.actively-parking-car').each(function () {
        var ownedCarPlate = $$(this).find('#car-icon').text().replace(/drive_eta/g, '');
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
                var parkingCity = carRead[ownedCarPlate].parking.city;
                if (parkingActive) {
                    if (parkingDuration + parkingTimestamp < Math.floor(Date.now())) {
                        carRef.child(ownedCarPlate).child('history').child(ownedCarPlate + parkingTimestamp).update({
                            amount: parkingAmount,
                            promocode: "ILOVEDOUBLEPARK",
                            location: parkingLocation,
                            duration: timestamp2Time(parkingDuration).name,
                            start_time: parkingTimestamp,
                            city: parkingCity
                        })
                        historyRef.child(parkingTimestamp).update({
                            carPlate: ownedCarPlate,
                            amount: parkingAmount,
                            location: parkingLocation,
                            duration: timestamp2Time(parkingDuration).name,
                            startTime: parkingTimestamp,
                            city: parkingCity
                        }).then(function () {
                            refreshHistory();
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

//-------------------------------------
//          Show History
//-------------------------------------
function showHistory() {
    var historyStackDate = null; //Stack Date for date checking
    var historyStampIndex = 0; //Index stamping for date
    historyCurrentIndex = 0;
    var historyFirst, historyLast;
    if (historyRead == null) {
        historyCurentIndex = 0
    }
    else {
            historyCurrentIndex = Object.keys(historyRead).length;
    }

    var historyList = new Array(); //historyList
    for (var eleMent in historyRead) {
        var historyDate = new Date(historyRead[eleMent].startTime);
        //Grouping of same date
        if (historyStackDate === null) {                                 //--------Starting
            historyStackDate = historyDate;
            historyCurrentIndex--;
            historyStampIndex = historyCurrentIndex;
            historyList[historyCurrentIndex] = historyRead[eleMent];
            //Check for last iteration
            if (historyCurrentIndex <= 0) {
                showMeHistory();
            }
        }
        else if (historyStackDate.getYear() === historyDate.getYear() &&
            historyStackDate.getMonth() === historyDate.getMonth() &&
            historyStackDate.getDate() === historyDate.getDate()) {      //--------Same date
            historyCurrentIndex--;
            historyList[historyCurrentIndex] = historyRead[eleMent];
            if (historyCurrentIndex <= 0) {
                showMeHistory();
            }
        }
        else {                                                          //--------Next date checked
            showMeHistory();
            historyStackDate = historyDate;                             //--------Stack the new date for date grouping
            historyCurrentIndex--;
            historyList[historyCurrentIndex] = historyRead[eleMent];
            if (historyCurrentIndex <= 0) {
                showMeHistory();
            }
        }

        //History output

        function showMeHistory() {
            var monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun",
                "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
            ];
            var historyTemplate = "";
            for (historyTempIndex = historyCurrentIndex; historyTempIndex <= historyStampIndex; historyTempIndex++) {
                historyTime = new Date(historyList[historyTempIndex].startTime);
                var historyTemp2 = '<li class="accordion-item" id="histInfo' + [historyTempIndex] + '1">' +
                    '<a href="#" class="item-content item-link">' +
                    '<div class="item-inner" style="background-color:'+colorTheme+'" id="histItem">' +
                    '<div id="car-icon" class="item-title"><sub><i class="material-icons pad-icon">directions_car</i></sub>' + historyList[historyTempIndex].carPlate + '</div>' +
                    '<div class="item-after"><div id="histInfo">' + addZeroHist(historyTime.getHours()) + ":" + addZeroHist(historyTime.getMinutes()) + '<br>' + historyList[historyTempIndex].city +'</div>' +
                    '</div> ' +
                    '</div>' +
                    '</a>' +
                    '<div class="accordion-item-content" id="topup-accordion">' +
                    '<div class="content-block">' +
                    '<div id="history-car-plate"><sub><i class="material-icons">directions_car</i></sub> <b >' + historyList[historyTempIndex].carPlate + '<br> </b> </div>' +
                    '<div id="history-info">' +
                    '<div><sub><i class="material-icons">place</i></sub>' + historyList[historyTempIndex].city + '</div>' +
                    '<div><sub><i class="material-icons">access_time</i></sub> ' + historyTime.getDate() + ' ' + monthNames[historyStackDate.getMonth()] + ' ' + historyTime.getFullYear() + ' ' + addZeroHist(historyTime.getHours()) + ':' + addZeroHist(historyTime.getMinutes()) + '</div>' +
                    '<div><sub><i class="material-icons">hourglass_empty</i></sub> ' + historyList[historyTempIndex].duration + '</div>' +
                    '<div><sub><i class="material-icons">attach_money</i></sub> ' + historyList[historyTempIndex].amount + ' tokens</div>' +
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
            historyStampIndex = historyCurrentIndex-1;
            var historyTemp1 = '<div class="timeline-item">' +
                '<div id="timeline-date" class="timeline-item-date">' + historyStackDate.getDate() + '<sub><sup>' + monthNames[historyStackDate.getMonth()] + '</sup></sub></div>' +
                '<div class="timeline-item-divider"></div >' +
                '<div class="timeline-item-content list-block inset">' +
                '<ul>' + historyTemplate;
            $$("#show-history").prepend(historyTemp1);

        }
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
        topupHistCurentIndex = 0
    }
    else {
        if (Object.keys(topupHistRead).length <= 100) {
            topupHistCurrentIndex = Object.keys(topupHistRead).length;
        }
        else {
            topupHistCurrentIndex = 100;
        }
    }
    for (var topupElement in topupHistRead) {
        var topupHistDate = new Date(topupHistRead[topupElement].topup_time);

        //Grouping of same date
        if (topupHistStackDate === null) {                                 //--------Starting
            topupHistStackDate = topupHistDate;
            topupHistCurrentIndex--;
            topupHistStampIndex = topupHistCurrentIndex;
            topupHistList[topupHistCurrentIndex] = topupHistRead[topupElement];
            //Check for last iteration
            if (topupHistCurrentIndex <= 0) {
                showMeTopupHist();
            }
        }
        else if (topupHistStackDate.getYear() === topupHistDate.getYear() &&
            topupHistStackDate.getMonth() === topupHistDate.getMonth() &&
            topupHistStackDate.getDate() === topupHistDate.getDate()) {      //--------Same date
            topupHistCurrentIndex--;
            topupHistList[topupHistCurrentIndex] = topupHistRead[topupElement];
            if (topupHistCurrentIndex <= 0) {
                showMeTopupHist();
            }
        }
        else {                                                          //--------Next date checked
            showMeTopupHist();
            topupHistStackDate = topupHistDate;                             //--------Stack the new date for date grouping
            topupHistCurrentIndex--;
            topupHistList[topupHistCurrentIndex] = topupHistRead[topupElement];
            if (topupHistCurrentIndex <=0) {
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
            for (topupHistTempIndex = topupHistCurrentIndex; topupHistTempIndex <= topupHistStampIndex; topupHistTempIndex++) {
                topupHistTime = new Date(topupHistList[topupHistTempIndex].topup_time);
                var topupHistTemp2 = '<li class="accordion-item" id="topupHistInfo' + [topupHistTempIndex] + '1">' +
                    '<a href="#"  class="item-content item-link" >' +
                    '<div class="item-inner" style="background-color:' + colorTheme +'" id="topupHistItem">' +
                    '<div id="topup-icon" class="item-title"> <sub><i class="material-icons">credit_card</i></sub> -XXXX-' + topupHistList[topupHistTempIndex].credit_card_no % 10000 + '</div>' +
                    '<div class="item-after"><div>RM ' + topupHistList[topupHistTempIndex].amount + '</div>' +
                    '</div > ' +
                    '</div>' +
                    '</a>' +
                    '<div class="accordion-item-content" id="topup-accordion">' +
                    '<div class="content-block">' +
                    '<div id="topup-info">' +
                    '<div><sub><i class="material-icons">access_time</i></sub>' + topupHistTime.getDate() + ' ' + monthNameFull[topupHistStackDate.getMonth()] + ' ' + topupHistTime.getFullYear() + '<br></div>' +
                    '<div><sub><i class="material-icons">attach_money</i></sub> RM ' + topupHistList[topupHistTempIndex].amount + '<br></div>' +
                    '<div><sub><i class="material-icons">credit_card</i></sub>XXXX-XXXX-XXXX-' + topupHistList[topupHistTempIndex].credit_card_no % 10000 + '<br> (exp: ' + topupHistList[topupHistTempIndex].expired_date + ')</div>' +
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
            topupHistStampIndex = topupHistCurrentIndex-1;
            var topupHistTemp1 = '<div class="timeline-item">' +
                '<div id="timeline-date" class="timeline-item-date">' + topupHistStackDate.getDate() + '<sub><sup>' + monthNames[topupHistStackDate.getMonth()] + '</sup></sub></div>' +
                '<div class="timeline-item-divider"></div >' +
                '<div class="timeline-item-content list-block inset">' +
                '<ul>' + topupHistTemplate;
            $$("#show-topup-hist").prepend(topupHistTemp1);

        }
    }
}

function refreshTopupHist() {
    clearBox('show-topup-hist');
    showTopupHist();
}

myApp.onPageInit('profile-settings', function (page) {
    var google_provider = new firebase.auth.GoogleAuthProvider();
    var facebook_provider = new firebase.auth.FacebookAuthProvider();

    $$('#facebook-link').on('click', function () {
        //auth.currentUser.linkWithPopup(facebook_provider).then(function (result) {
        //    // Accounts successfully linked.
        //    var credential = result.credential;
        //    var user = result.user;
        //    console.log('234');
        //}).catch(function (error) {

        //});
    });

    $$('#google-link').on('click', function () {
        //auth.currentUser.linkWithPopup(google_provider).then(function (result) {
        //    // Accounts successfully linked.
        //    var credential = result.credential;
        //    var user = result.user;
        //    console.log('234');
        //}).catch(function (error) {

        //});
    });
});
myApp.onPageInit('profile-help', function (page) {

});
function myactive() {
    $$("#tab-profile").addClass("active")
    $$("#tab-park").removeClass("active")
    uploadedProfilePic = true;
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
    }, 10000);
    var waitIntrv = setInterval(function () {
        if (Db.user && rate) {
            clearInterval(waitIntrv);
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
                var parkingCity = carRead[ownedCarPlate].parking.city;
                if (parkingActive) {
                    if (parkingDuration + parkingTimestamp < Math.floor(Date.now())) {
                        carRef.child(ownedCarPlate).child('history').child(ownedCarPlate + parkingTimestamp).update({
                            amount: parkingAmount,
                            location: parkingLocation,
                            duration: timestamp2Time(parkingDuration).name,
                            promocode: parkingPromocode,
                            start_time: parkingTimestamp,
                            city: parkingCity
                        })
                        historyRef.child(parkingTimestamp).update({
                            carPlate: ownedCarPlate,
                            amount: parkingAmount,
                            location: parkingLocation,
                            duration: timestamp2Time(parkingDuration).name,
                            startTime: parkingTimestamp,
                            city: parkingCity
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
                var str3 = '</div></div><div class="item-after"><i class="material-icons override-icon-size item-link" style="display: none">cancel</i></div></div> </a > </li></ul></div></div></div>';
                //var str = '<div class="card"><div class="card-content"><div class="list-block"><ul><li><a class="item-link item-content" onclick="loadSpecificTransaction(\'' + displayCarPlate.toString() + '\');" href="vehicle-history"><div class="item-inner style="padding-right: 10px" style="background-image:none"><div class="item-title"><div class="owned-car">GOTCHA</div><div class="cards-item-title">hint</div></div><div class="item-after"></div><i class="material-icons override-icon-size item-link" style="">cancel</i></div></a></li></ul></div></div></div>';
                if (cars[displayCarPlate].isDelete === false)
                {
                    $$('#sub-tab-vehicle').append(str1 + displayCarPlate + str2 + cars[displayCarPlate].description + str3);
                }                                                                                
            }

            // flip delete 
            $$('.flip-cancel').on('click', function () {

                var something = $$(this).attr('state');
                console.log(something);


                if ($$(this).attr('state') == 'open') {
                    $$('#sub-tab-vehicle').empty();
                    var cars = Db.user.cars;
                    for (var displayCarPlate in cars) {//write to UI
                        var str1 = '<div class="card"><div class="card-content"><div class="list-block" style="background-color: LightGray"><ul><li><div class="item-content item-link"><div class="item-inner" style="background-image:none; padding-right: 20px"><div class="item-title"><div class="owned-car">';
                        var str2 = '</div><div class="cards-item-title">'
                        var str3 = '</div></div><div class="item-after"><a href="#" onclick="removeVehicle(this);" class="override-icon-color"><i class="material-icons override-icon-size item-link vehicle-cancel" style="display: none">cancel</i></a></div></div></div></li></ul></div></div></div>';

                        if (cars[displayCarPlate].isDelete === false) {
                            $$('#sub-tab-vehicle').append(str1 + displayCarPlate + str2 + cars[displayCarPlate].description + str3);
                        }                     
                    }
                    $$('.vehicle-cancel').show();
                    $$(this).attr('state', 'close');

                }

                else if ($$(this).attr('state') == 'close') {
                    $$('#sub-tab-vehicle').empty();
                    var cars = Db.user.cars;
                    for (var displayCarPlate in cars) {//write to UI
                        var str1 = '<div class="card"><div class="card-content"><div class="list-block"><ul><li><a class="item-content item-link" href="vehicle-history" onclick="loadSpecificTransaction(\'' + displayCarPlate.toString() + '\');"><div class="item-inner" style="background-image:none; padding-right: 20px"><div class="item-title"><div class="owned-car">';
                        var str2 = '</div><div class="cards-item-title">'
                        var str3 = '</div></div><div class="item-after"><i class="material-icons override-icon-size item-link vehicle-cancel" style="display: none">cancel</i></div></div></a></li></ul></div></div></div>';

                        if (cars[displayCarPlate].isDelete === false) {
                            $$('#sub-tab-vehicle').append(str1 + displayCarPlate + str2 + cars[displayCarPlate].description + str3);
                        }                        
                    }

                    $$(this).attr('state', 'open');
                    $$('.floating-button').click();
                }


            });



            //Get tokens
            userRef.child('balance').on('value', function (snapshot) {
                $$('.token').html(+snapshot.val());
                console.log('token:'+snapshot.val())
            })

            //Get History of Active Car
            var activeCarRead = carRead;
            for (var activeCarPlate in activeCarRead) {
                var activeStatus = activeCarRead[activeCarPlate].parking.active;
                var activeAmount = activeCarRead[activeCarPlate].parking.amount;
                var activeDuration = activeCarRead[activeCarPlate].parking.duration;
                var activeTimestamp = activeCarRead[activeCarPlate].parking.timestamp;
                var activeLocation = activeCarRead[activeCarPlate].parking.location;
                var activeCity = activeCarRead[activeCarPlate].parking.city;
                var activePromo = activeCarRead[activeCarPlate].parking.promocode;
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

                    if (activePromo == "")
                        activePromo = "Nothing is used!"

                    var dataProgress = Math.floor((((activeDuration - remain_time) / activeDuration) * 100));
                    var percentProgress = dataProgress - 100;
                    var str_active = '<li class="actively-parking-car">' +
                        '<a href="#" data-popover=".popover-active' + activeCarPlate + '" class="item-link item-content open-popover">' +
                        '<div class="item-inner">' +
                        '<div class="item-title-row">' +
                        '<div id="car-icon" class="item-title"><sub><i class="material-icons">drive_eta</i></sub>' + activeCarPlate + '</div>' +
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
                        '<div id="promo">Promotion used: ' + activePromo + '</div>' +
                        '<div id="lbl-time">Expected End Time:</div>' +
                        '<div id="time-remain">' + end_time_dis.getHours() + ' : ' + end_time_dis.getMinutes() + ' : ' + end_time_dis.getSeconds() + '</div><br />' +
                        '<div id="lbl-btns">Press button to extend or terminate the parking time.</div><br/>' +
                        '<div id="btns">' +
                        '<a class="button button-fill button-raised" id="terminate-btn" onclick="terminateParkingTime(\'' + activeCarPlate + '\',this)">Terminate</a>' +
                        '<a class="button button-fill button-raised" id="extend-btn" onclick="extendParkingTime(\'' + activeCarPlate + '\',this)">Extend</a>' +
                        '</div>' +
                        '</div>' +
                        '</div>' +
                        '</div>' +
                        '<span class="progressbar" id="progressbar' + activeCarPlate + '" data-progress="' + dataProgress + '">' +
                        '<span class="" id="innerProgressbar' + activeCarPlate + '" style="transform: translate3d(' + percentProgress + '%, 0px, 0px);"></span>' +
                        '</span>'
                    '</li>';
                    $$('#ulist-active').append(str_active);
                    $$('.actively-parking-car').each(function () {
                        if ($$(this).find('#active-car-plate').text() === activeCarPlate) {
                            $$(this).find('.active-car-location').html('<sub><i class="material-icons">place</i></sub>' + activeCity);
                            $$(this).find('#location').html(activeCity);
                        }
                    })
                }
            }
        }
    },100)

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
                if (carRead[ownedCarPlate].isDelete) {
                    continue;
                }
                var parkingActive = carRead[ownedCarPlate].parking.active;
                var parkingAmount = carRead[ownedCarPlate].parking.amount;
                var parkingDuration = carRead[ownedCarPlate].parking.duration;
                var parkingTimestamp = carRead[ownedCarPlate].parking.timestamp;
                var parkingLocation = carRead[ownedCarPlate].parking.location;
                var parkingCity = carRead[ownedCarPlate].parking.city;
                if (parkingActive) {
                    if (parkingDuration + parkingTimestamp < Math.floor(Date.now())) {
                        carRef.child(ownedCarPlate).child('history').child(ownedCarPlate + parkingTimestamp).update({
                            amount: parkingAmount,
                            promocode: "ILOVEDOUBLEPARK",
                            location: parkingLocation,
                            duration: timestamp2Time(parkingDuration).name,
                            start_time: parkingTimestamp,
                            city: parkingCity
                        })
                        historyRef.child(parkingTimestamp).update({
                            carPlate: ownedCarPlate,
                            amount: parkingAmount,
                            location: parkingLocation,
                            duration: timestamp2Time(parkingDuration).name,
                            startTime: parkingTimestamp,
                            city: parkingCity
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
        //--------------------
        // Get Selected Car
        //--------------------
        $$('.car-choice').on('click', function () {
            console.log('ok')
            carPlate = $$(this).find('input[name=car-plate]').val();
            $$('.selected-car-plate').html(carPlate);
            $$('.selected-car-logo').css('color', 'blue');
            selectedCar = true;
            myApp.closeModal();
        })
    });

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

    getDuration();

    setInterval(function () {
        getDuration();
    }, 60000)

    $$('.park-duration').on('input', function () {
        getDuration();
    })

    //-----------------------
    // Pay Button Function
    //-----------------------
    $$('.confirm-payment-button').on('click', function () {   
        if (selectedCar && selectedLocation && parkDuration > 0) {
            confirmText =
                'Selected Car is&emsp;&emsp;&nbsp: <a><b>' + carPlate.toString() + '</b></a><br>' +
                'Park Until&emsp;&emsp;&emsp;&emsp;&ensp;: <a><b>' + $$('.selected-duration').text() + '</b></a><br>' +
                'Token required is&emsp;: <a><b>' + tokenReq.toString() + '</b></a>' +
                '<div class="promo-code" >\
                    <p class="row">\
                        <input type="text" id="used-promo-code" style="text-align:center;" placeholder=" PROMOCODE" />\
                    </p>\
                </div >'+
                'Confirm Transaction?';
            myApp.confirm(confirmText, 'Confirmation', function () {

                tokenNo = Db.user.balance;
                tokenBal = tokenNo - tokenReq;
                if (tokenBal < 0) {
                    myApp.alert('Insufficient balance.', 'Notification');
                }
                else {
                    var pos = { lat: user_pos.lat, lng: user_pos.lng };
                    var nearbyPromoShop = false;
                    var request = {
                        location: pos,
                        radius: '250',          // unit is in meters (value now is 250m)
                        type: ['restaurant', 'bank']
                    };

                    var service = new google.maps.places.PlacesService(document.createElement('div'));
                    service.nearbySearch(request, checkNearby);

                    function checkNearby(results, status) {
                        if (status === google.maps.places.PlacesServiceStatus.OK) {
                            var comparedLocality = 0, localityList = [];
                            for (var i = 0; i < results.length; i++) {
                                if (results[i].types[0] == 'locality' || results[i].types[1] == 'locality') {
                                    localityList.push(results[i].vicinity);
                                }
                            }
                            console.log(results)
                            console.log(localityList)
                            for (var localitY in localityList) {
                                (function (locality) {
                                    adminRef.child('promotions/' + locality).once('value', function (snapshot) {
                                        for (var sublocality in snapshot.val()) {
                                            console.log(sublocality)
                                            for (var promoCompany in snapshot.child(sublocality).val()) {
                                                console.log(promoCompany)
                                                for (var i = 0; i < results.length; i++) {
                                                    if (~results[i].name.indexOf(promoCompany) && ~results[i].vicinity.indexOf(sublocality)) {
                                                        nearbyPromoShop = true;
                                                    }
                                                }
                                            }
                                        }
                                        comparedLocality++;
                                    })
                                })(localityList[localitY]);
                            }
                            var intrvNearbyGotPromo = setInterval(function () {
                                if (comparedLocality == localityList.length) {
                                    clearInterval(intrvNearbyGotPromo);
                                    if (nearbyPromoShop) {
                                        myApp.modal({
                                            title: 'Payment confirmed',
                                            text: 'Nearbyshop might have some special promotions for YOU! Get FREE tokens by watching their promotion videos <br /><br />',
                                            afterText: '<img src="https://developers.google.com/places/documentation/images/powered-by-google-on-white.png">',
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
                                    }
                                }
                            },100)
                        }
                    }
                    if (Db.user.locality) {
                        for (var localitY in user_pos.locality) {
                            (function (locality) {
                                if (Db.user.locality[locality]) {
                                    userRef.child('locality').update({
                                        [locality]: Db.user.locality[locality] + 1
                                    });
                                }
                                else {
                                    userRef.child('locality').update({
                                        [locality]: 1
                                    });
                                }
                            })(user_pos.locality[localitY]);
                        }
                    }
                    else {
                        for (var locality in user_pos.locality) {
                            (function (locality) {
                                userRef.child('locality').update({
                                    [locality]: 1
                                });
                            })(user_pos.locality[localitY]);
                        }
                    }
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
                    myApp.showTab('#tab-history');
                    myApp.showTab('#active');
                    var timestamp = Math.floor(Date.now());
                    carRef.child(carPlate).child('parking').update({
                        active: true,
                        amount: tokenReq,
                        timestamp: timestamp,
                        duration: parkDuration,
                        location: { lat: user_pos.lat, lng: user_pos.lng },
                        city: user_pos.city,
                        promocode: $$('#used-promo-code').val()
                    })

                    //write data to UI
                    var promoCode = $$('#used-promo-code').val();
                    var current_time = Date.now();
                    var end_time = timestamp + parkDuration;
                    var end_time_dis = new Date(end_time);
                    var remain_time = end_time - current_time;
                    var time_val;
                    var time_unit;
                    var dataProgress;

                    if (promoCode == "")
                        promoCode = "Nothing is used!"

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
                                                    '<div id="car-icon" class="item-title"><sub><i class="material-icons" style="padding-top:7px">drive_eta</i></sub>' + carPlate + '</div>' +
                                                    '<input id="timestamp-active-end" value="' + end_time + '" />' +
                                                    '<div id="lbl-time-left" class="item-after">' + time_val + '</div>' +
                                                    '<div id="lbl-time-remain" class="item-after">' + time_unit + ' <br />remaining</div>' +
                                                    '</div>' +
                                                    '<div class="item-subtitle active-car-location"><sub><i class="material-icons">place</i></sub>' + user_pos.city + '</div>' +
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
                                                    '<div id="lbl-btns">Press button to extend or terminate the parking time.</div><br/>' +
                                                    '<div id="btns">' +
                                                        '<a class="button button-fill button-raised" id="terminate-btn" onclick="terminateParkingTime(\''+ carPlate +'\',this)">Terminate</a>' +
                                                        '<a class="button button-fill button-raised" id="extend-btn" onclick="extendParkingTime(\''+ carPlate +'\',this)">Extend</a>' +
                                                    '</div>' +
                                                '</div>' +
                                            '</div>' +
                                        '</div>' +
                                        '<span class="progressbar" id="progressbar' + carPlate + '" data-progress="' + dataProgress + '">' +
                                            '<span class="" id="innerProgressbar' + carPlate + '" style="transform: translate3d(' + percentProgress + '%, 0px, 0px);"></span>' +
                                        '</span>' +
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

    $$('.check-promotion').on('click', function () {
        user_pos = {
            lat: 0,
            lng: 0,
            city: 'none',
            full_addr: 'none'
        };
        checkPromo = true;
    })

    $$('#tab-history-button').on('click', function () {
        refreshActiveHistory();
    })

    $$('#tab-active-button').on('click', function () {
        refreshActiveHistory();
    })

    // Vehicle Tab - Adding vehicle via floating action button
    $$('.modal-vehicle').on('click', function () {
    $$('#sub-tab-vehicle').empty();
                    var cars = Db.user.cars;
                    for (var displayCarPlate in cars) {//write to UI
                        var str1 = '<div class="card"><div class="card-content"><div class="list-block"><ul><li><a class="item-content item-link" href="vehicle-history" onclick="loadSpecificTransaction(\'' + displayCarPlate.toString() + '\');"><div class="item-inner" style="background-image:none; padding-right: 20px"><div class="item-title"><div class="owned-car">';
                        var str2 = '</div><div class="cards-item-title">'
                        var str3 = '</div></div><div class="item-after"><i class="material-icons override-icon-size item-link vehicle-cancel" style="display: none">cancel</i></div></div></a></li></ul></div></div></div>';

                        if (cars[displayCarPlate].isDelete === false) {
                            $$('#sub-tab-vehicle').append(str1 + displayCarPlate + str2 + cars[displayCarPlate].description + str3);
                        }
                                                                          
                    }

                    $$(this).attr('state', 'close');
                    $$('.floating-button').click();


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
                        var cars = Db.user.cars;

                        //write into database
                        carRef.child(displayCarPlate).update({
                            description: $$('#txt-car-description').val(),
                            timestamp_reg: Math.floor(Date.now()),
                            history: '',
                            isDelete: false
                        });

                        carRef.child(displayCarPlate).child('parking').update({
                            active: false,
                            duration: 0,
                            amount: 0,
                            timestamp: ''

                        })

                        for (displayCarPlate in cars) {
                            if (cars[displayCarPlate].isDelete === true) {
                                myApp.alert("Car Model already exist!");
                               
                            }

                            else if (cars[displayCarPlate].isDelete === false) {
                                //write to UI
                                var str1 = '<div class="card"><div class="card-content"><div class="list-block"><ul><li><a class="item-content item-link" href="vehicle-history" onclick="loadSpecificTransaction(\'' + displayCarPlate.toString() + '\');"><div class="item-inner" style="background-image:none; padding-right: 20px"><div class="item-title"><div class="owned-car">';
                                var str2 = '</div><div class="cards-item-title">'
                                var str3 = '</div></div><div class="item-after"><i onclick="alert("a")" class="material-icons override-icon-size item-link vehicle-cancel" style="display: none">cancel</i></div></div></a></li></ul></div></div></div>';
                                //var str = '<div class="card"><div class="card-content"><div class="list-block"><ul><li><a class="item-link item-content" onclick="loadSpecificTransaction(\'' + displayCarPlate.toString() + '\');" href="vehicle-history"><div class="item-inner style="padding-right: 10px" style="background-image:none"><div class="item-title"><div class="owned-car">GOTCHA</div><div class="cards-item-title">hint</div></div><div class="item-after"></div><i class="material-icons override-icon-size item-link" style="">cancel</i></div></a></li></ul></div></div></div>';
                                $$('#sub-tab-vehicle').append(str1 + displayCarPlate + str2 + $$('#txt-car-description').val() + str3);
                                myApp.closeModal();
                            }
                        }                                                  
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

    refreshHistory();

    $$('#show-history').on("accordion:open", function () {
        var k;
        if (Object.keys(historyRead).length <= 100) {
            k = Object.keys(historyRead).length;
        }
        else {
            k = 100;
        }
        for (j = 0; j <= k ; j++) {
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

    
    refreshTopupHist();

    $$('#show-topup-hist').on("accordion:open", function () {
        var k;
        if (Object.keys(historyRead).length <= 100) {
            k = Object.keys(historyRead).length;
        }
        else {
            k = 100;
        }
        for (j = 0; j <= k; j++) {
            var ID = document.getElementById('topupHistInfo' + j + '1');
            myApp.accordionCheckClose(ID);
        }
        return;
    });

    //--Profile Tab-------------------------------------------------
    $$('.confirm-logout-ok').on('click', function () {
        myApp.confirm('Are you sure to logout?', 'Logout', function () {
            firebase.auth().signOut().then(function () {
                // Sign-out successful.
                myApp.showPreloader();
                location = "index.html";
            }).catch(function (error) {
                // An error happened.
            });
        });
    });

    //profile tab
    $$('.load-username').html(Db.user.username);
    $$('.load-token').append(Db.user.balance.toString());

    var ministr1 = '<img src="';
    var ministr2 = '" width="80" height="80">';

    if (user.photoURL != null) {
        $$('.profile-pic-mini').append(ministr1 + user.photoURL + ministr2);
    } else {
        $$('.profile-pic-mini').append('<img class="profile-pic" src="images/profile_pic_default.png" width="80" height="80">');
    }

});

//---------------------------------------
// Extend Button Function
//---------------------------------------
function extendParkingTime(theCar) {
    theCarPlate = theCar;
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
        expired = false;
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
                        '<div class="right"><a href="#" class="close-picker" id="extendCancel">Cancel&emsp;</a></div>' +
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
                        '<a class="button button-fill button-raised" id="confirm-btn" onclick="extendConfirmed(\''+ theCarPlate +'\',this)">Confirm</a>' +
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
        'Selected car is&emsp;&emsp;&nbsp: <a><b>' + theCar.toString() + '</b></a><br>' +
        'Extended until&emsp;&emsp; : <a><b>' + $$('.extended-duration').text() + '</b></a><br>' +
        'Token required is&emsp;: <a><b>' + tokenReq.toString() + '</b></a><br><br>' +
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
    myApp.showTab('#tab-history');
    myApp.showTab('#active');
}

//---------------------------------------
// Terminate Function
//---------------------------------------
function terminateParkingTime(theCar) {
    var timeVal, timeUnit;
    var terminateTotalAmount = carRead[theCar].parking.amount;
    var terminateDuration = carRead[theCar].parking.duration;
    var terminateTimestamp = carRead[theCar].parking.timestamp;
    var terminateLocation = carRead[theCar].parking.location;
    var terminatePromoCode = carRead[theCar].parking.promocode;
    var terminateCity = carRead[theCar].parking.city;

    var terminateRemainTime = (terminateTimestamp + terminateDuration) - Date.now();
    var terminateTime = new Date(terminateTimestamp + terminateDuration);
    var terminateRemainToken = 2 * Math.floor(terminateRemainTime / 600000);
    var tokenBalance = Db.user.balance;
    tokenBalance += terminateRemainToken;
    var terminateAmount = terminateTotalAmount - terminateRemainToken;

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
        'Car Plate Number&nbsp; : <a><b>' + theCar.toString() + '</b></a><br/>' +
        'Time Remaining&emsp; : <a><b>' + timeVal + ' ' + timeUnit + '</b></a><br/>' +
        'Expected End Time is :<br/><a><b><center>' + terminateTime.getHours() + ' : ' + terminateTime.getMinutes() + ' : ' + terminateTime.getSeconds() + '</center></b></a><br/><br/>' +
        'Confirm to Terminate?';

    myApp.closeModal();
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
            start_time: terminateTimestamp,
            city: terminateCity
        })
        
        userRef.update({
            balance: tokenBalance
        })

        historyRef.child(terminateTimestamp).update({
            carPlate: theCar,
            amount: terminateAmount,
            location: terminateLocation,
            duration: timestamp2Time(terminateDuration).name,
            startTime: terminateTimestamp,
            city: terminateCity
        }).then(function () {
            refreshHistory();
            })

        myApp.alert('The parking for car plate number ' + theCar + ' is terminated.<br>Token refunded: ' + terminateRemainToken + ' tokens', 'Confirmation');
        $$('.close-picker').click();
    })
    refreshActiveHistory();
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
    });

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
            var param = {
                url: 'https://api.authy.com/protected/json/phones/verification/start?via=sms&phone_number=' + $$('#su-phone-no').val() + '&country_code=60&locale=en',
                method: 'POST',
                contentType: 'application/json',
                crossDomain: true,
                headers: {
                    "Content-Type": "application/json",
                    "X-Authy-API-Key": "qApVobMpvUu4WrJxfkEYgXzoBOjmRvYj"
                },
                success: function (data, status, xhr) {

                    myApp.prompt('Verification code', function(value){
                        var param2 = {
                            url: 'https://api.authy.com/protected/json/phones/verification/check?phone_number=' + $$('#su-phone-no').val() + '&country_code=60&verification_code=' + value,
                            method: 'GET',
                            contentType: 'application/json',
                            crossDomain: true,
                            headers: {
                                "Content-Type": "application/json",
                                "X-Authy-API-Key": "qApVobMpvUu4WrJxfkEYgXzoBOjmRvYj"
                            },
                            success: function (data, status, xhr) {
                                
                                if (status !== 200) {
                                    alert('Verification failed!');
                                    return
                                }
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
                            },
                            error: function (xhr, status) {
                                alert('ERROR VERIFY: ' + status);
                            }
                        }
                        $$.ajax(param2);
                    });
                },
                error: function (xhr, status) {
                    alert('ERROR SEND: ' + status);
                }
            }
            $$.ajax(param);

        }
    })
});

// ======= Color themes ======= 
myApp.onPageInit('color-themes', function (page) {
    $$(page.container).find('.color-theme').click(function () {
        changeColorTheme($$(this).attr('data-theme'));
        localStorage.removeItem("color_theme");
        localStorage.setItem('color_theme', $$(this).attr('data-theme'));
    });
});

function changeColorTheme(color) {
    var classList = $$('body')[0].classList;
    for (var i = 0; i < classList.length; i++) {
        if (classList[i].indexOf('theme') === 0) classList.remove(classList[i]);
    }
    classList.add('theme-' + color);
    switch (color) {
        case 'red':
        case 'pink':
            colorTheme = "#ffe0e0";
            break;
        case 'purple':
        case 'deeppurple':
            colorTheme = "#f9e0ff";
            break;
        case 'indigo':
        case 'blue':
        case 'lightblue': ;
        case 'cyan':
            colorTheme = "aliceblue";
            break;
        case 'teal':
        case 'green':
        case 'lightgreen':
            colorTheme = "#eeffe8";
            break;
        case 'lime':
        case 'yellow':
        case 'amber':
            colorTheme = "lightgoldenrodyellow";
            break;
        case 'orange':
        case 'deeporange':
            colorTheme = "#ffdfbf";
            break;
        case 'brown':
            colorTheme = "lightgoldenrodyellow";
            break;
        case 'gray':
        case 'bluegray':
        case 'black':
            colorTheme = "whitesmoke";
            break;
    }
}

function to_blob(url) {

    return new Promise(function (resolve, reject) {
        try {
            var xhr = new XMLHttpRequest();
            xhr.open("GET", url);
            xhr.responseType = "blob";
            xhr.onerror = function () { reject("Network error.") };
            xhr.onload = function () {
                if (xhr.status === 200) { resolve(xhr.response) }
                else { reject("Loading error:" + xhr.statusText) }
            };
            xhr.send();
        }
        catch (err) { reject(err.message) }
    });
}

function setOptions(srcType) {
    var options = {
        // Some common settings are 20, 50, and 100
        quality: 50,
        destinationType: Camera.DestinationType.FILE_URI,
        // In this app, dynamically set the picture source, Camera or photo gallery
        sourceType: srcType,
        encodingType: Camera.EncodingType.JPEG,
        mediaType: Camera.MediaType.PICTURE,
        allowEdit: true,
        correctOrientation: true  //Corrects Android orientation quirks
    }
    return options;
}

var testurl;

//FilePicker//
function openFilePicker(selection) {

    var srcType = Camera.PictureSourceType.SAVEDPHOTOALBUM;
    var options = setOptions(srcType);
    var func = createNewFileEntry;
    var imgUri = null;
    testurl = null;

    if (selection == "picker-thmb") {
        // To downscale a selected image,
        // Camera.EncodingType (e.g., JPEG) must match the selected image type.
        options.targetHeight = 100;
        options.targetWidth = 100;
    }

    navigator.camera.getPicture(function cameraSuccess(data) {
        /*
        var blob = to_blob(imageUri);
        return blob;
        console.log("return blob liao");
        */
        testurl = data;
            //.toString().replace('blob:', '');
        console.log('data');
        console.log(data);
        console.log("return data in terms of testurl liao");
    }, function cameraError(error) {
        console.debug("Unable to obtain picture: " + error, "app");

        }, options);
    console.log('returned');
}

function getFileEntry(imgUri) {
    window.resolveLocalFileSystemURL(imgUri, function success(fileEntry) {

        // Do something with the FileEntry object, like write to it, upload it, etc.
        // writeFile(fileEntry, imgUri);
        console.log("got file: " + fileEntry.fullPath);
        // displayFileData(fileEntry.nativeURL, "Native URL");

    }, function () {
        // If don't get the FileEntry (which may happen when testing
        // on some emulators), copy to a new FileEntry.
        createNewFileEntry(imgUri);
    });
}

function createNewFileEntry(imgUri) {
    window.resolveLocalFileSystemURL(cordova.file.cacheDirectory, function success(dirEntry) {

        // JPEG file
        dirEntry.getFile("tempFile.jpeg", { create: true, exclusive: false }, function (fileEntry) {
            // Do something with it, like write to it, upload it, etc.
            // writeFile(fileEntry, imgUri);
            console.log("got file: " + fileEntry.fullPath);
            // displayFileData(fileEntry.fullPath, "File copied to");

        }, onErrorCreateFile);

    }, onErrorResolveUrl);
}

//My Profile!!!!
myApp.onPageInit('profile-myprofile', function (page) {
    //Display Profile Pic and Info
    var str1 = '<img class="profile-pic" src="';
    var str2 = '" width="100" height="100">';
    if (user.photoURL != null) {
        $$('.button-profile-pic').append(str1 + user.photoURL + str2);
   //     console.log(user.photoURL);
    } else {
        $$('.button-profile-pic').append('<img class="profile-pic" src="images/profile_pic_default.png" width="100">');
    }
    $$('.load-username').html(Db.user.username);
    $$('.load-real-name').html(Db.user.real_name);
    $$('.load-email').html(Db.user.email);          //might need to change
    $$('.load-phone-no').html(Db.user.phone_no);
    $$('.load-ic-no').html(Db.user.IC);
    $$('.load-gender').html(Db.user.gender);
    $$('.load-birthday').html(Db.user.birthday);
    $$('.load-address').html(Db.user.address);

    //Profile-Pic Action Sheet
    $$('.button-profile-pic').on('click', function () {
        var options = [
            {
                text: 'View Profile Picture',
                bold: true,
                onClick: function () {
                    mainView.router.loadPage("view-profile-pic.html");
                }
            },
            {
                text: 'Edit Profile Picture',
                    bold: true,
                    onClick: function () {
                        mainView.router.loadPage("edit-profile-pic.html");
                        }
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
    myApp.showIndicator();
    var default_marker = [];
    var default_pos = {
        lat: 0,
        lng: 0,
        city: 'none',
        full_addr: 'none',
        locality: 'none'
    };
    var selfset_pos = {
        lat: 0,
        lng: 0,
        city: 'none',
        full_addr: 'none',
        locality: 'none'
    };
    var default_user_addr;
    var map = new google.maps.Map(document.getElementById('map'), {
        center: { lat: -34.397, lng: 150.644 },
        zoom: 18
    });

    ////--------------------------------
    //// default checkbox function
    ////--------------------------------
    //$$('input[name=default-loca]').change(function () {
    //    if ($$(this).is(':checked')) {
    //        selfset = false;
    //        // checked
    //        default_marker.forEach(function (marker) {
    //            marker.setMap(null);
    //        });
    //        default_marker = [];
    //        $$('#default-address').html(default_pos['full_addr']);
    //        document.getElementById("pac-input").style.visibility = "hidden";
    //        var pos = {
    //            lat: default_pos['lat'],
    //            lng: default_pos['lng']
    //        }
    //        map.setCenter(pos);
    //        map.setZoom(18);
    //        // Create a marker for each place.
    //        default_marker.push(new google.maps.Marker({
    //            map: map,
    //            position: pos,
    //            icon: customMarker
    //        }));
    //    }
    //    else {
    //        selfset = true;
    //        // not checked
    //        default_marker.forEach(function (marker) {
    //            marker.setMap(null);
    //        });
    //        default_marker = [];
    //        $$('#default-address').html(selfset_pos['full_addr']);
    //        document.getElementById("pac-input").style.visibility = "visible";
    //        var pos = {
    //            lat: selfset_pos['lat'],
    //            lng: selfset_pos['lng']
    //        }
    //        map.setCenter(pos);
    //        map.setZoom(18);
    //        // Create a marker for each place.
    //        default_marker.push(new google.maps.Marker({
    //            map: map,
    //            position: pos,
    //            icon: customMarker
    //        }));
    //    }
    //});

    var click_counter;
    $$('#default-location').on('click', function () {
        if (click_counter === 0) {
            document.getElementById("default-location").style.backgroundColor = "green";
            document.getElementById("default-location").style.color = "white";
            document.getElementById("defaultcheckbox").checked = true;
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
                position: pos,
                icon: customMarker
            }));
            click_counter = 1;
        }
        else if (click_counter === 1) {
            document.getElementById("default-location").style.backgroundColor = "white";
            document.getElementById("default-location").style.color = "green";
            document.getElementById("defaultcheckbox").checked = false;
            selfset = true;
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
                position: pos,
                icon: customMarker
            }));
            click_counter = 0;
        }
    });

    // User click confirm button function
    $$('#use-selfset-loca').on('click', function () {
        if (selfset === true) {
            user_pos['lat'] = selfset_pos['lat'];
            user_pos['lng'] = selfset_pos['lng'];
            user_pos['city'] = selfset_pos['city'];
            user_pos['full_addr'] = selfset_pos['full_addr'];
            user_pos['locality'] = selfset_pos['locality'];
        }
        else {
            user_pos['lat'] = default_pos['lat'];
            user_pos['lng'] = default_pos['lng'];
            user_pos['city'] = default_pos['city'];
            user_pos['full_addr'] = default_pos['full_addr'];
            user_pos['locality'] = default_pos['locality'];
        }
        console.log(user_pos);
        mainView.router.back();
        $$('.selected-location').html(user_pos['city']);
        $$('.selected-location-logo').css('color', 'red');
        selectedLocation = true;
    })

    initMap(map);

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
                    position: place.geometry.location,
                    icon: customMarker
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

        $$('body').on('touchstart', '.pac-container', function (e) {
            e.stopImmediatePropagation();
        })
    }

    //---------------------------------------
    // Full address and city name Geocoding
    //---------------------------------------
    function geocodeLatLng(latlng, obj) {
        var geocoder = new google.maps.Geocoder;
        var request = {
            location: latlng,
            radius: '250',          // unit is in meters (value now is 250m)
            type: ['restaurant', 'bank']
        };

        var service = new google.maps.places.PlacesService(document.createElement('div'));
        service.nearbySearch(request, checkNearby);

        function checkNearby(results, status) {
            var localityList = [];
            if (status === google.maps.places.PlacesServiceStatus.OK) {
                for (var i = 0; i < results.length; i++) {
                    if (results[i].types[0] == 'locality' || results[i].types[1] == 'locality') {
                        localityList.push(results[i].vicinity);
                    }
                }
            }
            obj['locality'] = localityList;
        }
        geocoder.geocode({ 'location': latlng }, function (results, status) {
            var city, route, locality;
            if (status === 'OK') {
                if (results[0]) {
                    console.log(results[0])
                    results[0].address_components.forEach(function (element2) {
                        element2.types.forEach(function (element3) {
                            switch (element3) {
                                case 'sublocality':
                                    city = element2.long_name;
                                    break;
                                case 'route':
                                    route = element2.long_name;
                                    break;
                                case 'locality':
                                    locality = element2.long_name;
                                    break;
                            }
                        })
                    });
                    if (city) {
                        obj['city'] = city;

                    }
                    else {
                        obj['city'] = route;
                    }
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
                click_counter = 1;
                document.getElementById("default-location").style.backgroundColor = "green";
                document.getElementById("default-location").style.color = "white";

                if (selectedLocation && selfset) {
                    $$('input[name=default-loca]').prop('checked', false);
                    document.getElementById("pac-input").style.visibility = "visible";
                    click_counter = 0;
                    document.getElementById("default-location").style.backgroundColor = "white";
                    document.getElementById("default-location").style.color = "green";
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
                // Create a marker 
                default_marker.push(new google.maps.Marker({
                    map: map,
                    position: pos,
                    icon: customMarker
                }));

                initAutocomplete(map);
                myApp.hideIndicator();
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
    var available_promo = 0;
    var have_promo = 0;
    //To display
    var str1 = '<li class="accordion-item"> <a href="#" class="item-link item-content"> <div class="item-inner"> <div class="item-title">'
    var str2 = '</div>'
    var str3 = '</div > </a > <div class="accordion-item-content"> <div class="content-block"> <p>Discount Amount: '
    var str4 = ' tokens</p> <p>Expiry Date: '
    var str5 = '</p> <p>'
    var str6 = '</p> </div> </div> </li>'

    function loadPromo() {
        var promotion = Db.user.promotion; // Clone it to prevent async bugs
        for (var eachPromotion in promotion) {
            have_promo = 1;
            var promocode = promotion[eachPromotion];
            if (promocode.status.toLowerCase() === 'available') {
                $$('.promo-list-available').append(str1 + eachPromotion + str2 + str3 + promocode.amount + str4 + promocode.expiry_date + str5 + promocode.text);
                available_promo = 1;
                var str_all = '<div class="item-after" style = "color: springgreen" >Available</div>'
            } else if (promocode.status.toLowerCase() === 'expired') {
                var str_all = '<div class="item-after" style = "color: red" >Expired</div>'
            } else if (promocode.status.toLowerCase() === 'used') {
                var str_all = '<div class="item-after">Used</div>'
            }
            $$('.promo-list-all').append(str1 + eachPromotion + str2 + str_all + str3 + promocode.amount + str4 + promocode.expiry_date + str5 + promocode.text + str6);
        }
    };

    function is_no_promo() {
        if (available_promo == 0) {
            $$('.promo-list-available').append('<div class="no-promo">No available promocode!</div>');
        }
        if (have_promo == 0) {
            $$('.promo-list-all').append('<div class="no-promo">No promocode!</div>');
        }
    };

    loadPromo();
    is_no_promo();
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
                    mainView.router.refreshPage();
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

//add upload pic, add case-key(timestamp?), add copy to admin backup//////////////////////
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
            var report_timestamp = (Date.now()).toString();

            cl_owner_name = $$('#cl-owner-name').val();
            cl_owner_ic = $$('#cl-owner-ic').val();
            cl_owner_pass = $$('#cl-owner-pass').val();
            cl_phone = $$('#cl-phone').val();
            cl_plate = $$('#cl-plate').val();
            cl_location = $$('#cl-location').val();
            cl_remarks = $$('#cl-remarks').val();

            userRef.child('report').child('car_loss').child(report_timestamp + cl_plate).update({
                cl_owner_name: cl_owner_name,
                cl_owner_ic: cl_owner_ic,
                cl_owner_pass: cl_owner_pass,
                cl_phone: cl_phone,
                cl_plate: cl_plate,
                cl_location: cl_location,
                cl_remarks: cl_remarks
            }).then(function () {
                adminRef.child('report_cases').child('car_loss').child(report_timestamp + cl_plate).update({
                    cl_owner_name: cl_owner_name,
                    cl_owner_ic: cl_owner_ic,
                    cl_owner_pass: cl_owner_pass,
                    cl_phone: cl_phone,
                    cl_plate: cl_plate,
                    cl_location: cl_location,
                    cl_remarks: cl_remarks,
                    cl_user: user.uid,
                });
            }).then(function () {
                myApp.alert('Report Submitted!');
                mainView.router.refreshPage();
            }).catch(function (error) {
            });
        }
    });


    var ip_plate, ip_location, ip_behavior, ip_remarks, ip_photo_downloadURL, isready = false, ip_photo_localURL;

    //Photo Preview
    $$('#ip-photo').on('change', function (event) {
        var files = event.target.files, file;
        if (files && files.length > 0) {
            file = files[0];
            ip_photo_localURL = window.URL.createObjectURL(file);
            $$('.ip-photo-show').append(' <li><div class="item-content"><div class="item-inner"><div class="item-title label">Proof</div><div><img class="view-big-pic" src="' + ip_photo_localURL + '" /></div></div></div></li >');
            isready = true;
        }
    });

    // Submit button for illegal parking
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

            var report_timestamp = (Date.now()).toString();
            userRef.child('report').child('illegal_park').child(report_timestamp + ip_plate).update({
                ip_plate: ip_plate,
                ip_location: ip_location,
                ip_behavior: ip_behavior,
                ip_remarks: ip_remarks,
            }).then(function () {
                adminRef.child('report_cases').child('illegal_park').child(report_timestamp + ip_plate).update({
                    ip_plate: ip_plate,
                    ip_location: ip_location,
                    ip_behavior: ip_behavior,
                    ip_remarks: ip_remarks,
                    ip_user: user.uid
                });
            }).then(function () {
                if (isready == true) {
                    to_blob(ip_photo_localURL).then(function (blob) {
                        var uploadTask = storageReport_ip_Ref.child(report_timestamp + ip_plate).put(blob);
                        uploadTask.on(firebase.storage.TaskEvent.STATE_CHANGED, function (snapshot) {
                            var progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                            console.log('Upload is ' + progress + '% done');
                            switch (snapshot.state) {
                                case firebase.storage.TaskState.PAUSED: // or 'paused'
                                    console.log('Upload is paused');
                                    break;
                                case firebase.storage.TaskState.RUNNING: // or 'running'
                                    console.log('Upload is running');
                                    break;
                            }
                        }, function (error) {
                            switch (error.code) {
                                case 'storage/unauthorized':
                                    break;
                                case 'storage/canceled':
                                    break;
                                case 'storage/unknown':
                                    break;
                            }
                        }, function () {
                            ip_photo_downloadURL = uploadTask.snapshot.downloadURL;
                            userRef.child('report').child('illegal_park').child(report_timestamp + ip_plate).update({
                                ip_photo: ip_photo_downloadURL
                            }).then(function () {
                                adminRef.child('report_cases').child('illegal_park').child(report_timestamp + ip_plate).update({
                                    ip_photo: ip_photo_downloadURL
                                });
                            }).then(function () {
                                myApp.alert('Report Submitted!');
                                mainView.router.refreshPage();
                            }).catch(function (error) {
                            });
                        });
                    });
                }
                else {
                    myApp.alert('Report Submitted!');
                    mainView.router.refreshPage();
                }
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

    myApp.showIndicator();


    var nearbyMarkers = [];
    var nearbyInfo = [];
    var nearby_map = new google.maps.Map(document.getElementById('nearby-map'), {
        center: { lat: -34.397, lng: 150.644 },
        zoom: 17
    });
    userRef.child('locality').orderByValue().limitToLast(3).once('value', function (snapshot) {
        var checkedLocality = 0, readyLocality = 0;
        for (var localitY in snapshot.val()) {
            readyLocality++;
            (function (locality) {
                adminRef.child('promotions/' + locality).once('value', function (snapshot) {
                    for (var sublocality in snapshot.val()) {
                        for (var promoCompany in snapshot.child(sublocality).val()) {
                            for (var promoNum in snapshot.child(sublocality).child(promoCompany).val()) {
                                $$('#nearbyPromo').append('\
                                    <div class="card">\
                                        <div class="card-content">\
                                            <div class="card-content-inner" style="padding:16px 16px 0px 16px;">\
                                                <p class="row">\
                                                    <span class="col-30"><img class="promo-card-logo" src="brokenImg" /></span>\
                                                    <span class="col-70" style="height:100%;">\
                                                        <b class="promo-card-title">'+ promoCompany + '</b><br />\
                                                        <i class="promo-card-content">'+ snapshot.child(sublocality).child(promoCompany).child(promoNum).val() + '</i><br />\
                                                    </span>\
                                                </p>\
                                            </div>\
                                            <div class="promo-sublocality" color="gray" style="text-align:right; width:100%; height:16px; font-size:x-small;">'+ sublocality + '&emsp;</div>\
                                        </div >\
                                    </div >\
                                ');
                                $$('.promo-card-title').each(function () {
                                    if ($$(this).text() == promoCompany) {
                                        $$(this).closest('.card').find('.promo-card-logo').attr('src', Strg.logo[promoCompany]);
                                    }
                                })
                            }
                        }
                    }
                    checkedLocality++;
                })
            })(localitY);
        }
        var promoCardIntrv = setInterval(function () {
            if (checkedLocality == readyLocality) {
                clearInterval(promoCardIntrv);
                $$('#nearbyPromo').append('<div class="card">&emsp;</div><div class="card">&emsp;</div><div class="card">&emsp;</div>');
                createMap(nearby_map);
            }
        }, 100);
    })


    //--------------
    // init map
    //--------------
    function createMap(map) {
        var pos;
        // Try HTML5 geolocation.
        if (user_pos.full_addr == 'none') {
            if (navigator.geolocation) {
                navigator.geolocation.getCurrentPosition(function (position) {
                    pos = {
                        lat: position.coords.latitude,
                        lng: position.coords.longitude
                    };
                }, function () {
                    myApp.alert("Ops! Geolocation service failed.", "Message");
                }, { enableHighAccuracy: true });
            }
            else {
                // Device doesn't support Geolocation
                myApp.alert("Device does not support geolocation.", "Message");
            }
        }
        else {
            pos = {
                lat: user_pos.lat,
                lng: user_pos.lng
            };
        }
        var mapIntrv = setInterval(function () {
            if (pos) {
                clearInterval(mapIntrv);
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
                    icon: customMarker
                }));

                google.maps.event.addListener(nearbyMarkers[0], 'click', function () {
                    nearbyInfo[0].open(nearby_map, nearbyMarkers[0]);

                });

                nearbySearch(map, pos);
            }
        },100)
    }
   
    //-------------------------------
    // Search nearby POI
    //-------------------------------
    function nearbySearch(map, pos) {
        var request = {
            location: pos,
            radius: '250',          // unit is in meters (value now is 250m)
            type: ['restaurant', 'bank']
        };
        var service = new google.maps.places.PlacesService(map);
        service.nearbySearch(request, displayNearby);
    }    

    var temp;
    $$('#okButton').on('click', function () {
        document.getElementById(temp + "But").style.visibility = "hidden";
        document.getElementById("ads-video").style.visibility = "hidden";
        document.getElementById("myPopUp").style.visibility = "hidden";
        document.getElementById("video-background").style.visibility = "hidden";
        if ($("input[name=ads-ans]:checked").val() === "correct") {
            userRef.update({
                balance: Db.user.balance + Db.admin.rewards[temp]
            }).then(function () {
                myApp.closeModal();
                $$('#ads-video').off('ended');
                myApp.alert(temp + ' rewards you ' + Db.admin.rewards[temp] + ' tokens', 'Notification')
            })
        }
        else {
            myApp.alert('You got the wrong answer.', 'Notification')
        }
    });

    $$('#cancelButton').on('click', function () {
        document.getElementById("ads-video").style.visibility = "hidden";
        document.getElementById("video-background").style.visibility = "hidden"; 
        document.getElementById("myPopUp").style.visibility = "hidden";
    });

    $$('#promoBack').on('click', function () {
        document.getElementById("promoPoster").style.visibility = "hidden";        
    });

    //-------------------------------
    // Display nearby POI on apps
    //-------------------------------
    function displayNearby(results, status) {
        if (status === google.maps.places.PlacesServiceStatus.OK) {
            var promoMarker = 0;
            var localityList = [];
            var comparedLocality = 0;
            for (var i = 0; i < results.length; i++) {
                if (results[i].types[0]=='locality' || results[i].types[1]=='locality') {
                    localityList.push(results[i].vicinity);
                }
            }
            console.log(results)
            console.log(localityList)
                // Create a marker for each place.
            for (var localitY in localityList) {
                (function (locality) {
                    adminRef.child('promotions/' + locality).once('value', function (snapshot) {
                        for (var sublocality in snapshot.val()) {
                            console.log(sublocality)
                            for (var promoCompany in snapshot.child(sublocality).val()) {
                                console.log(promoCompany)
                                for (var i = 0; i < results.length; i++) {
                                    if (~results[i].name.indexOf(promoCompany) && ~results[i].vicinity.indexOf(sublocality)) {
                                        var pos = {
                                            lat: results[i].geometry.location.lat(),
                                            lng: results[i].geometry.location.lng()
                                        };

                                        // Create a infowindow for each place.
                                        var contentString = Db.admin.rewards[promoCompany] + ' tokens';
                                        var infowindow = new google.maps.InfoWindow({
                                            content: '<h4>' + contentString.fontcolor("goldenrod") + '</h4>'
                                        });
                                        nearbyInfo.push(infowindow);

                                        promoMarker++;

                                        nearbyMarkers.push(new google.maps.Marker({
                                            map: nearby_map,
                                            position: pos,
                                            icon: Strg.icon[promoCompany]
                                        }));

                                        //-----------------------------------------------
                                        for (var promoNum in snapshot.child(sublocality).child(promoCompany).val()) {
                                            $$('#nearby-map-promo').append('\
                                                <li id="' + promoCompany + '-card">\
                                                    <div class="card">\
                                                        <div class="card-content">\
                                                            <div class="card-content-inner" style="padding:16px 16px 0px 16px;">\
                                                                <p class="row">\
                                                                    <span class="col-30"><img class="promo-card-logo" src="brokenImg" /></span>\
                                                                    <span class="col-70" style="height:100%;">\
                                                                        <b class="nearby-promo-card-title">'+ promoCompany + '</b><br />\
                                                                        <i class="promo-card-content">'+ snapshot.child(sublocality).child(promoCompany).child(promoNum).val() + '</i><br />\
                                                                    </span>\
                                                                </p>\
                                                            </div>\
                                                            <div class="promo-sublocality" color="gray" style="text-align:right; width:100%; height:16px; font-size:x-small;">'+ sublocality + '&emsp;</div>\
                                                        </div >\
                                                    </div >\
                                                </li>\
                                            ');
                                            $$('.nearby-promo-card-title').each(function () {
                                                if ($$(this).text() == promoCompany) {
                                                    $$(this).closest('.card').find('.promo-card-logo').attr('src', Strg.logo[promoCompany]);
                                                }
                                            })

                                            var someID = document.getElementById(promoCompany + '-card');
                                            var someButtonId;

                                            (function (_promoCompany) {
                                                // crerate new watch video button and add listener
                                                var btn = document.createElement("BUTTON");
                                                var t = document.createTextNode("Watch video & answer question to get free token");
                                                btn.className = "watchVideo";
                                                btn.setAttribute("id", _promoCompany + "But");
                                                btn.appendChild(t);
                                                document.getElementById('promoPoster').appendChild(btn);
                                                someButtonId = document.getElementById(_promoCompany + "But");

                                                someButtonId.addEventListener('click', function () {                                                
                                                    storageRef.child('ads/' + _promoCompany + '.mp4').getDownloadURL().then(function (url) {
                                                        $$('#ads-video-mp4-src').attr('src', url);
                                                        $$('#question').html(Db.admin.qna[_promoCompany].question);

                                                        var rng = Math.floor((Math.random() * 10) + 1);
                                                        if (rng >= 6) {
                                                            $$('#firstAns').html(Db.admin.qna[_promoCompany].correct);
                                                            document.getElementById("firstInput").value = "correct";
                                                            $$('#secondAns').html(Db.admin.qna[_promoCompany].wrong);
                                                            document.getElementById("secondInput").value = "wrong";
                                                        } else {
                                                            $$('#firstAns').html(Db.admin.qna[_promoCompany].wrong);
                                                            document.getElementById("firstInput").value = "wrong";
                                                            $$('#secondAns').html(Db.admin.qna[_promoCompany].correct);
                                                            document.getElementById("secondInput").value = "correct";
                                                        }

                                                        document.getElementById("video-background").style.visibility = "visible";
                                                        document.getElementById("myPopUp").style.visibility = "hidden";
                                                        document.getElementById("ads-video").style.visibility = "visible";
                                                        document.getElementById('ads-video').load();
                                                        document.getElementById('ads-video').play();
                                                        $$('#ads-video').on('ended', function () {
                                                            document.getElementById("video-background").style.visibility = "visible";
                                                            document.getElementById("ads-video").style.visibility = "hidden";
                                                            document.getElementById("myPopUp").style.visibility = "visible";
                                                            temp = _promoCompany;
                                                        })
                                                    })                                                 
                                                });

                                                // add listener to all cards
                                                someID.addEventListener('click', function () {
                                                    myApp.showIndicator();
                                                    document.getElementById("promoPoster").style.visibility = "visible";
                                                    storageRef.child('poster/' + _promoCompany + 'poster.png').getDownloadURL().then(function (url) {
                                                        $$('#poster').attr('src', url);
                                                        setTimeout(function () { myApp.hideIndicator(); }, 1000);                                                        
                                                    })
                                                    document.getElementById('promoDescription').innerHTML = Db.admin.poster[_promoCompany].Description;                                                    
                                                    $$("#termCondition").empty()
                                                    for (var k in Db.admin.poster[_promoCompany].term) {
                                                        var termCond = '<li>' + Db.admin.poster[_promoCompany].term[k] + '</li>';
                                                        $$('#termCondition').append(termCond);
                                                    }        
                                                    $$(".watchVideo").each(function (index) {
                                                        $$(this).css("z-index", "-200");
                                                    });
                                                    $$("#" + _promoCompany + "But").css("z-index", "20002");
                                                });
                                            })(promoCompany);
                                        }
                                        //----------------------------------------------
                                        for (var rewardCompany in Db.admin.rewards) {
                                            if (rewardCompany == promoCompany) {
                                                nearbyMarkers[promoMarker].setAnimation(google.maps.Animation.BOUNCE);
                                                nearbyInfo[promoMarker].open(nearby_map, nearbyMarkers[promoMarker]);
                                                (function (promoM) {
                                                    setTimeout(function () {
                                                        nearbyInfo[promoM].close();
                                                    }, 10000);
                                                })(promoMarker);
                                                (function (rewardCompany) {
                                                    google.maps.event.addListener(nearbyMarkers[promoMarker], 'click', function (innerKey) {
                                                        return function () {
                                                            nearbyInfo[innerKey].close();
                                                            nearbyMarkers[innerKey].setAnimation(null);
                                                            //storageRef.child('ads/' + rewardCompany + '.mp4').getDownloadURL().then(function (url) {

                                                            //    $$('#ads-video-mp4-src').attr('src', url);
                                                            //    $$('#question').html(Db.admin.qna[rewardCompany].question);

                                                            //    var rng = Math.floor((Math.random() * 10) + 1);
                                                            //    if (rng >= 6) {
                                                            //        $$('#firstAns').html(Db.admin.qna[rewardCompany].correct);
                                                            //        document.getElementById("firstInput").value = "correct";
                                                            //        $$('#secondAns').html(Db.admin.qna[rewardCompany].wrong);
                                                            //        document.getElementById("secondInput").value = "wrong";
                                                            //    } else {
                                                            //        $$('#firstAns').html(Db.admin.qna[rewardCompany].wrong);
                                                            //        document.getElementById("firstInput").value = "wrong";
                                                            //        $$('#secondAns').html(Db.admin.qna[rewardCompany].correct);
                                                            //        document.getElementById("secondInput").value = "correct";
                                                            //    }

                                                            //    document.getElementById("video-background").style.visibility = "visible";
                                                            //    document.getElementById("myPopUp").style.visibility = "hidden";
                                                            //    document.getElementById("ads-video").style.visibility = "visible";                                                                
                                                            //    document.getElementById('ads-video').load();
                                                            //    document.getElementById('ads-video').play();
                                                            //    $$('#ads-video').on('ended', function () {
                                                            //        document.getElementById("video-background").style.visibility = "visible";    
                                                            //        document.getElementById("ads-video").style.visibility = "hidden"; 
                                                            //        document.getElementById("myPopUp").style.visibility = "visible";      
                                                                    google.maps.event.clearListeners(nearbyMarkers[innerKey], 'click');
                                                            //        temp = rewardCompany;
                                                            //    })
                                                            //})
                                                        }
                                                    }(promoMarker));
                                                })(rewardCompany);
                                            }
                                        }
                                    }
                                }
                            }
                        }
                        comparedLocality++;
                    })
                })(localityList[localitY]);
            }
            var nearbyDisplayIntrv = setInterval(function () {
                if (comparedLocality == localityList.length) {
                    clearInterval(nearbyDisplayIntrv);
                    if (checkPromo) {
                        if (promoMarker === 0) {
                            checkPromo = false;
                            myApp.showTab('#nearbyPromo');
                        }
                    }
                    $$('#nearby-map-promo').append('<li><div class="card">&emsp;</div></li><li><div class="card">&emsp;</div></li>');
                    myApp.hideIndicator();
                }
            },100)
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
            
            myApp.popover('.popover-enter-password', $$('#button-update-hp'));
            $$('#button-verify-password').on('click', function () { 
                    myApp.closeModal();
                    myApp.showIndicator();
                    var credential = firebase.auth.EmailAuthProvider.credential(user.email, $$('#verify-password').val());
                    user.reauthenticateWithCredential(credential).then(function () {
                        console.log('password correct')
                        var param = {
                            url: 'https://api.authy.com/protected/json/phones/verification/start?via=sms&phone_number=' + $$('#new-hp').val() + '&country_code=60&locale=en',
                            method: 'POST',
                            contentType: 'application/json',
                            crossDomain: true,
                            headers: {
                                "Content-Type": "application/json",
                                "X-Authy-API-Key": "qApVobMpvUu4WrJxfkEYgXzoBOjmRvYj"
                            },
                            success: function (data, status, xhr) {
                                myApp.hideIndicator();
                                myApp.prompt('Verification code', function (value) {
                                    myApp.showIndicator();
                                    var param2 = {
                                        url: 'https://api.authy.com/protected/json/phones/verification/check?phone_number=' + $$('#new-hp').val() + '&country_code=60&verification_code=' + value,
                                        method: 'GET',
                                        contentType: 'application/json',
                                        crossDomain: true,
                                        headers: {
                                            "Content-Type": "application/json",
                                            "X-Authy-API-Key": "qApVobMpvUu4WrJxfkEYgXzoBOjmRvYj"
                                        },
                                        success: function (data, status, xhr) {
                                            myApp.hideIndicator();

                                            if (status !== 200) {
                                                alert('Verification failed!');
                                                return
                                            }
                                            userRef.update({
                                                phone_no: $$('#new-hp').val(),
                                            }).then(function () {
                                                myApp.alert('Your H/P number has been updated successfully!');
                                                mainView.router.refreshPage();
                                            }).catch(function (error) {
                                            });
                                        },
                                        error: function (xhr, status) {
                                            myApp.hideIndicator();
                                            alert('ERROR VERIFY: ' + status);
                                        }
                                    }
                                    $$.ajax(param2);
                                });
                            },
                            error: function (xhr, status) {
                                myApp.hideIndicator();
                                alert('ERROR SEND: ' + status);
                            }
                        }
                        $$.ajax(param);
                    }).catch(function (error) {
                        myApp.hideIndicator();
                        var errorCode = error.code;
                        var errorMessage = error.message;
                        if (errorCode === "auth/wrong-password")
                            myApp.alert(errorMessage, 'Error');
                    })          
            })
        }
        else {
            myApp.alert('H/P Number cannot be empty.', 'Error!');
        }
    });

});

//View Profile Picture
myApp.onPageInit('view-profile-pic', function (page) {

    var str1 = '<img class="view-profile-pic" src="';
    var str2 = '" />';
    if (user.photoURL != null) {
        $$('.view-profile-pic-append').append(str1 + user.photoURL + str2);
        console.log(user.photoURL);
    } else {
        $$('.view-profile-pic-append').append('<img class="view-profile-pic" src="images/profile_pic_default.png" />');
    }
});

//Edit Profile Picture
myApp.onPageInit('edit-profile-pic', function (page) {
    var isready = false;
    function readFile(input) {
        if (input.files && input.files[0]) {
            var reader = new FileReader();

            reader.onload = function (e) {
                $('#main-cropper').addClass('ready');
                to_crop.croppie('bind', {
                    url: e.target.result
                }).then(function () {
                    console.log('jQuery bind complete');
                    isready = true;
                });
            }
            reader.readAsDataURL(input.files[0]);
        }
    }

    var to_crop = $('#main-cropper').croppie({
        viewport: { width: 250, height: 250, type: 'circle' },
        boundary: { width: 280, height: 280 },
        showZoomer: false,
        enableExif: true
    });

    $('.actionChoose').on('change', function () { readFile(this); });
    $$('.actionDone').on('click', function (ev) {
        if (isready == true) {
            to_crop.croppie('result', {
                type: 'blob',
                size: { width: 400 },
                circle: 'false'
            }).then(function (blob) {
                var uploadTask = storageuserRef.child('profile_pic').put(blob);
                uploadTask.on(firebase.storage.TaskEvent.STATE_CHANGED, function (snapshot) {
                    var progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                    console.log('Upload is ' + progress + '% done');
                    switch (snapshot.state) {
                        case firebase.storage.TaskState.PAUSED: // or 'paused'
                            console.log('Upload is paused');
                            break;
                        case firebase.storage.TaskState.RUNNING: // or 'running'
                            console.log('Upload is running');
                            break;
                    }
                }, function (error) {
                    switch (error.code) {
                        case 'storage/unauthorized':
                            break;
                        case 'storage/canceled':
                            break;
                        case 'storage/unknown':
                            break;
                    }
                }, function () {
                    var downloadURL = uploadTask.snapshot.downloadURL;
                    $$('.profile-pic-mini').find('img').attr('src', downloadURL);
                    $$('.button-profile-pic').find('img').attr('src', downloadURL);
                    user.updateProfile({
                        photoURL: downloadURL
                    }).then(function () {
                        myApp.alert('Profile Picture has been updated!');
                        isready = false;
                        })
                });
            });
        }
        else {
            myApp.alert("Choose a File!!!!");
        };
    });

    /*
     //if using cordova
    $$('.actionUpload').on('click', function () {
        openFilePicker();
        var waitPhoto = setInterval(function () {
            if (testurl) {
                clearInterval(waitPhoto);
                test.croppie('bind', {
                    url: testurl,
                }).then(function () {
                    console.log('jQuery bind complete');
                });
            }
        }, 100)
    });

        var test = $('#main-cropper').croppie({
        viewport: { width: 250, height: 250, type: 'circle' },
        boundary: { width: 280, height: 280 },
        showZoomer: true,
        enableExif: true
    });
    */
});

    //$$('.actionCancel').on('click', function () {
    //    console.log(openFilePicker());
    //    console.log(testurl);
    //});


    $$('.actionDone').on('click', function () {
        //on button click
        test.result('blob').then(function (blob) {
            // do something with cropped blob
        });
    });




function playAudio(event) {    

    document.getElementById('default').pause();
    document.getElementById('stargaze').pause();
    document.getElementById('ding').pause();
    document.getElementById('tri-tone').pause();

    console.log("I'm here!");
    console.log(event);

    var sound = document.getElementById(event);
    var ringtone = document.getElementById('ring-tone');
    console.log(ringtone);
    console.log(sound);
    sound.load();
    sound.play();

}

