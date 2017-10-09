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


// Login auth
$$('.button-login').on('click', function () {
    mainView.router.loadPage("main.html");
   
    //var username = $$('.username').val();
    //var password = $$('.password').val();

    //if (username == 'utarstudent' && password == '123') {
    //    mainView.router.loadPage("main.html");
    //}
    //else {
    //    alert('wrong username or password!')
    //}
})

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


    $$('.select-car').on('click', function () {
        carPlate = $$('input[name=car-plate]:checked').val();
        $$('.selected-car-plate').html(carPlate);
        $$('.selected-car-logo').css('color', 'blue');
        selectedCar = true;
        $$('#close-popover-menu').click();
    })

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

    $$('.confirm-payment').on('click', function () {
        tokenNo = +$$('.token').text();
        if (selectedCar && selectedDuration) {
            tokenReq = parkDuration * 2;
            tokenBal = tokenNo - tokenReq;
            confirmText =
                'Selected Car is&emsp;&emsp;&nbsp:' + carPlate.toString() + '<br>' +
                'Duration is&emsp;&emsp;&emsp;&emsp;:' + $$('.selected-duration').text() + '<br>' +
                'Token required is &emsp;:' + tokenReq.toString() + '<br>' +
                'Token balance is &emsp;&nbsp:' + tokenBal.toString() + '<br>' +
                'Confirm Transaction?';
            myApp.confirm(confirmText, 'Confirmation', function () {
                myApp.alert('Transaction is done successfully. Thank You!', 'Confirmation');
                $$('.token').html(tokenBal.toString());
                $$('.selected-car-plate').html('Select Car');
                $$('.selected-duration').html('Duration');
                $$('.selected-car-logo').css('color', 'inherit');
                $$('.selected-duration-logo').css('color', 'inherit');
                selectedCar = false;
                selectedDuration = false;
            });
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
                  }
              },
            ]
        })
    });

});