﻿var Appss = {};
Appss.time = Math.floor(Date.now());

function degreesToRadians(degrees) {
    return degrees * Math.PI / 180;
}

//------------------------------------------------------
//Function to calculate distance between two coordinate
//------------------------------------------------------
function MeterBetweenCoords(lat1, lon1, lat2, lon2) {
    var earthRadiusKm = 6371;

    var dLat = degreesToRadians(lat2 - lat1);
    var dLon = degreesToRadians(lon2 - lon1);

    lat1 = degreesToRadians(lat1);
    lat2 = degreesToRadians(lat2);

    var a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(lat1) * Math.cos(lat2);
    var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return earthRadiusKm * c * 1000;    //convert to meter
}

//------------------------------------
//Function to get time of timestamp
//------------------------------------
function timestamp2Time(value) {
    var time = { hour: 0, minute: 0, second: 0, name: '', shortName: '' };
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
        str3 = time.second - time.minute * 60 + ' Second';
        if (time.second - time.minute * 60 > 1) {
            str3 = str3 + 's';
        }
        str3 = str3 + ' ';
    }

    time.name = str1 + str2 + str3;
    time.shortName = time.name.replace('Hour', 'Hr').replace('Minute', 'Min').replace('Second', 'Sec');

    return time;
}


function clockPass(value) {
    var datestamp = Math.floor(Date.now()) + +value;
    var date = new Date(datestamp);
    var h, m, AorP = 'A';
    h = date.getHours();
    m = date.getMinutes();
    if (h >= 12) {
        if (m > 0) {
            AorP = 'P';
        }
    }
    if (h === 0) {
        h = 12;
    }
    if (h > 12) {
        h -= 12;
    }
    if (m < 10) {
        m = '0' + m;
    }
    var str = h + ':' + m + ' ' + AorP + 'M';
    return str
}

