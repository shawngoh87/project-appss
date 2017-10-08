// Init App
var myApp = new Framework7({
    modalTitle: 'Framework7',
    // Enable Material theme
    material: true,
});
// Expose Internal DOM library
var $$ = Dom7;

// Add main view
var mainView = myApp.addView('.view-main', {
});

$$('#login').on('click', function () {
    var username = $$('#username').val();
    var password = $$('#password').val();

    if (username == 'utarstudent' && password == '123') {
        mainView.router.loadPage("main.html");
    }
    else {
        alert('wrong username or password!')
    }
})

myApp.onPageInit('main', function (page) {

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
                      var str3 = '</div> </div> <div class="item-after"><a href="#" class="override-icon-color" onclick="$$(this).closest(\'.card\').remove()"><i class="material-icons override-icon-size item-link">cancel</i></a></div> </div> </div> </li> </ul> </div> </div> </div>'
                      var STR = '<div class="card"> <div class="card-content"> <div class="list-block"> <ul> <li> <div class="item-content"> <div class="item-inner"> <div class="item-title"> <div>ABC 1111</div> <div class="cards-item-title">Name</div> </div> <div class="item-after"><a href="#" class="override-icon-color" onclick="removeParentCard(this);"><i class="material-icons override-icon-size item-link">cancel</i></a></div> </div> </div> </li> </ul> </div> </div> </div>'
                      $$('#tab-vehicle').append(str1 + $$('#car-plate').val() + str2 + $$('#car-hint').val() + str3);
                      //$$('#car-list').append(str1 + $$('#car-plate').val() + str2 + $$('#car-hint').val() + str3);
                  }
              },
            ]
        })
    });

});