/* Project Appss - Utility - Generate Users

	Generates random user data and uploads to 
	Firebase Realtime DB /users/

	Usage: 
	-- Go to browser's developer console (F12).
	-- Call Generator()
	-- @params: MAX_USER		int		number of users
				MAX_CARS		int		number of cars per user
				MAX_HISTORY		int		number of history per car
				MAX_TOPUP		int		number of topup transaction per user
				MAX_PROMOCODE	int 	number of promocodes
*/




/* Random functions */

function rChoice(someArray){

    return someArray[Math.floor(Math.random()*someArray.length)];
}

function rAlphaNum(count, small){
    var ret = "";
    var sample = "";
    if (small){
        sample = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    }
    else{
        sample = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    }
    for (var i = 0; i < count; i++){
        ret += rChoice(sample);
    }
    return ret;
}

function rNum(count){
    var ret = "";
    var sample = "0123456789";
    for (var i = 0; i < count; i++){
        ret += rChoice(sample);
    }
    return ret;
}

function randomTimestamp(){
    // returns UTC + maximum 100 seconds
    return Math.floor(Date.now() + Math.random()*100000);
}

function randomName(){
    // returns a random name from predefined array
    var firstNames = ["Bill", "Henry", "Bruce", "Avril"];
    var lastNames = ["Burr", "Cavill", "Wayne", "Lavigne"];

    return rChoice(firstNames) + ' ' + rChoice(lastNames);
}

function randomAddress(){
    // returns random address from predefined array
    var streets = ["Bunga", "Ayer", "Coco", "Bedak", "Ringan"];
    var states = ["Johor", "Selangor", "Kedah", "Perlis", "Pahang"];
    var ret = (Math.floor(Math.random()*100+1)).toString() + ', Jalan ' + rChoice(streets) + ', ' + rChoice(states);

    return ret;
}

function randomLocation(){
    // returns random GPS locations
    return (Math.random()*180-90).toString() + ', ' + (Math.random()*360-180).toString();
}

function randomDuration(){
    // returns random duration between 30-540 minutes
    var ret = Math.floor(Math.random()*510+30);
    return ret.toString() + ' minutes';
}

function randomUidHex32(){
    // returns random 32 character UID
    function four(){
        return Math.floor((1 + Math.random())*0x10000).toString(16).substring(1);
    }

    return four() + four() + '-' + four() + '-' + four() + '-' + four() + '-' + four() + four() + four();
}

function randomUid(){
    // returns random 28 character firebase UID	

    return rAlphaNum(28, small=true);
}

function randomCarPlate(){
    // returns random carplate number;
    var alphabets = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    var ret = "";
    for ( var i = 0; i < 3; i++){
        ret += alphabets[Math.floor(Math.random()*26)];
    }
    for ( var i = 0; i < 4; i++){
        ret += Math.floor(Math.random()*10).toString();
    }
    return ret;
}

function randomEmail(name){
    var domains = ["hotmail", "gmail", "live"];

    return (name.toLowerCase().replace(/\s+/g, '') || "unknownfella") + Math.floor(Math.random()*1000).toString() + '@' + rChoice(domains) + '.com';
}

function randomUsername(name){

    return (name.toLowerCase().replace(/\s+/g, '') || "unknownfella") + rNum(3);
}

function randomUrl(){

    return "www.dev.to";
}

function randomPromoStatus(){
    var states = ["Available", "Used", "Expired"];
    return rChoice(states);
}

function randomString(){
    var adj = ["magical ", "happy ", "clever "];
    var noun = ["unicorn", "teabag", "bottle"];

    return 'A ' + rChoice(adj) + rChoice(noun) + ' says hi!';
}


/************************************/
/*				MAIN				*/
/************************************/


var users = {};

function Generator(MAX_USER, MAX_CARS, MAX_HISTORY, MAX_TOPUP, MAX_PROMOCODE){

    // History generator
    function generateHistory(carPlate){
        var history = {};

        for (var j = 0; j < MAX_HISTORY; j++){
            var time = randomTimestamp();
            var id = carPlate + time;
            history[id] = {
                "promocode":rAlphaNum(5),
                "location":randomLocation(),
                "start_time":time,
                "duration":randomDuration(),
                "amount":rNum(1)+'.00'
            }
        }

        return history;
    }

    // Promocode generator
    function generatePromocode(){
        var obj = {};

        for(var i = 0; i < MAX_PROMOCODE; i++){
            obj[rAlphaNum(5)] = {
                "status":randomPromoStatus(),
                "text":randomString(),
                "amount":rNum(1)+'.00'
            }
        }
		
        return obj;
    }

    // Topup generator
    function generateTopup(uid){
        var obj = {};
        var time = randomTimestamp();

        for(var i = 0; i < MAX_TOPUP; i++){
            obj[uid+time] = {
                "credit_card_no":rNum(16),
                "expire_date":randomTimestamp(),
                "ccw":rNum(3),
                "amount":rNum(1)+'.00',
                "timestamp":time
            }
        }

        return obj;
    }

    // Generate users
    for (var i = 0; i < MAX_USER; i++){
        var cars = {};

        // Generate some cars
        for (var j = 0; j < MAX_CARS; j++){
            var carPlate = randomCarPlate();

            cars[carPlate] = {
                "description":randomString(),
                "timestamp_reg":randomTimestamp(),
                "history": generateHistory(carPlate)
            }
        }

        var name = randomName();
        var uid = randomUid();

        users[uid] = {
            "email":randomEmail(name),
            "username": randomUsername(name),
            "phone":'01' + rNum(9),
            "ic":rChoice([7,8,9]) + rNum(11),
            "profile_picture":randomUrl(),
            "cars":cars,
            "balance":rNum(1)+'.00',
            "topup_history":generateTopup(uid),
            "promotion":generatePromocode(),
            "transaction":{},
            "friends":{
                "uid":randomUid(),
                "time_link":randomTimestamp()
            },
            "card_profile":""
        }

        // Append each car's transaction 
        var garage = users[uid].cars;
        for (var eachCar in garage){
            var record = garage[eachCar].history;
            for (var eachHistory in record){
                users[uid].transaction[eachHistory] = record[eachHistory];
            }
        }	

        firebase.database().ref('users/' + uid).set(users[uid]);
    }
}
