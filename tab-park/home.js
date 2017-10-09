/* ===== Home Page events  ===== */
myApp.onPageInit('main', function (page) {

    var token_no;   // user token number
    var token_req;  // token required for parking
    var carPlate;       // selected car
    var parkDuration;   // selected duration
    var message;
    var myCar;

    //---------------
    // car object
    //---------------
    function car (model, plateNo) {
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
                                '<div class="item-title">' + this.plateNo + '</div>' +
                                '</div>' +
                                '</label></li>';

            $$("#select-car").append(car_list_html);    // add html code
        }
    };   

    //------------------------------------------------------
    // Check whether car list is empty before open car menu
    //------------------------------------------------------
    $$('#carSelector').on('click', function () {
        if (car.emptyCount > 0)
            // open popover car menu only if the menu is not empty
            myApp.popover('.car-menu', this);
        else
            // empty car menu case
            myApp.alert('Please add your car in vehicle tab to proceed.', 'Message');
    })

    //----------------------------------
    // Get Selected Car Function
    //----------------------------------
    $$('#select-car').on('click', function () {
        carPlate = $$('input[name=car-plate]:checked').val().toString();    // get selected car from popover menu
        $$('#selected-car-plate').html(carPlate);
        $$('#selected-car-logo').css('color', 'blue');  // change icon color
        $$('#close-popover-menu').click();  // close popover menu
    })

    //----------------------------------
    // Get Selected Duration Function
    //----------------------------------
    $$('#select-duration').on('click', function () {
        parkDuration = +$$('input[name=duration]:checked').val();   // + sign convert string to int             
        if (parkDuration > 1) {
            $$('#selected-duration').html(parkDuration + ' Hours');
        }
        else {
            $$('#selected-duration').html(parkDuration + ' Hour');
        }
        $$('#selected-duration-logo').css('color', 'blue'); // change icon color
        $$('#close-popover-menu').click();  // close popover menu
    })    

    //-----------------------
    // Pay Button Function
    //-----------------------
    $$('.demo-confirm').on('click',function () {            
        token_no = parseInt($$('#token').text());   // get token number

        if (carPlate !== undefined && !isNaN(parkDuration)) {
            token_req = parkDuration * 2;   // compute token required for parking duration

            if ((token_no - token_req) < 0) {
                // Not enough token case
                myApp.alert('Ops! Insufficient Token. Please top up and try again.', 'Message');
            }
            else {
                message = 'Selected Car is ' + carPlate + '.<br>' +
                            'Duration is ' + $$('#selected-duration').text() + '.<br>' +
                            'Token required is ' + token_req + '.<br>' +
                            'Your token balance is ' + (token_no - token_req) + '.<br>' +
                            'Confirm Transaction?';

                myApp.confirm(message, 'Confirmation', function () {
                    // User confirm payment case
                    token_no = token_no - token_req;    // update token number
                    myApp.alert('', 'Transaction is done successfully. Thank You!');
                    $$('#token').html(token_no);        // change token number display
                });
            }
        }
        else {
            // Duration or Car is not selected case
            myApp.alert('Please select your car and duration.', 'Message');
        }            
    });

    //-----------------------
    // Demo Add Car Function
    //-----------------------
    $$('#addCar').on('click',
        function () {   
            var temp_model = $$('#model').val();        // get car model textbox value
            var temp_plate = $$('#plateNo').val();      // get car plate number textbox value
            myCar = new car(temp_model, temp_plate);    // create car object
            myCar.add_to_list();                        // add car to popover car menu
        }
    );
});