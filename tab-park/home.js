/* ===== Home Page events  ===== */
myApp.onPageInit('home', function (page) {
    var token_no = parseInt($$('#token').text());
    var token_req;
    var token_bal;
    var carPlate;
    var parkDuration;
    var text1;
    var text2;
    var text3;

    $$('#select-car').on('click', function () {     
        carPlate = $$('input[name=car-plate]:checked').val().toString();
        text1 = 'Selected Car is ' + carPlate + '.<br>';
        $$('#selected-car-plate').html(carPlate);
        $$('#selected-car-logo').css('color', 'blue');
        $$('#close-popover-menu').click();
    })

    $$('#select-duration').on('click', function () {
        parkDuration = +$$('input[name=duration]:checked').val();   // + sign convert string to int
        text2 = 'Duration is ' + parkDuration.toString() + ' hour.<br>';                
        if (parkDuration > 1) {
            $$('#selected-duration').html(parkDuration + ' Hours');
        }
        else {
            $$('#selected-duration').html(parkDuration + ' Hour');
        }
        $$('#selected-duration-logo').css('color', 'blue');
        $$('#close-popover-menu').click();
    })    

    $$('.demo-confirm').on('click', function () {
        token_req = parseInt(text2.substring(12, 13)) * 2;
        token_bal = token_no - token_req;
        text3 = 'Token required is ' + token_req + '.<br>' + 'Your token balance is ' + token_bal + '.<br>' + 'Confirm Transaction?';
        myApp.confirm(text1 + text2 + text3, 'Confirmation', function () {
            myApp.alert('Transaction is done successfully. Thank You!', 'Confirmation');
        });
    });
});