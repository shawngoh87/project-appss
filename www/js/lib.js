﻿var Appss = {};


//------------------------------------
//Function to get time of timestamp
//------------------------------------
function timestamp2Time(value) {
    var time = { hour: 0, minute: 0, second: 0, name: '' };
    var str1 = '', str2 = '', str3 = '';
    time.hour = Math.floor(value / 3600000);
    time.minute = Math.floor(value / 60000);
    time.second = Math.floor(value / 1000);
    if (time.hour > 0) {
        str1 = time.hour + ' Hour';
        if (time.hour > 1) {
            str1 = str1 + 's';
        }
        str1 = str1 + ' ';
    }
    if (time.minute - time.hour * 60 > 0) {
        str2 = time.minute - time.hour * 60 + ' Minute';
        if (time.minute - time.hour * 60 > 1) {
            str2 = str2 + 's';
        }
        str2 = str2 + ' ';
    }
    if (time.second - time.minute * 60 > 0) {
        str2 = time.second - time.minute * 60 + ' Second';
        if (time.second - time.minute * 60 > 1) {
            str3 = str3 + 's';
        }
        str3 = str3 + ' ';
    }

    time.name = str1 + str2 + str3;

    return time;
}


//Appss.time = Math.floor(Date.now());
//Appss.geolocate = null;