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


// Vehicle Tab - modal for adding vehicles
$$('.modal-vehicle').on('click', function () {
    myApp.modal({
        title: 'Add vehicle',
        afterText: '<div class="input-field"><input type="text" id="car-plate" class="modal-text-input" placeholder="Car plate"></div><div class="input-field"><input type="text" id="car-hint" class="modal-text-input" placeholder="Hint"></div>',
        buttons: [
          {
              text: 'Cancel',
              onClick: function () {/* Do Nothing */}
          },
          {
              text: 'Ok',
              onClick: function () {
                  // TODO: Add validation/trimming function (refer to jom.js)
                  
                  var str1 = '<li class="swipeout"><div class="item-content swipeout-content"><div class="item-inner"><div class="item-title">'
                  var str2 = '</div><div class="item-after">'
                  var str3 = '</div></div></div><div class="swipeout-actions-right"><a href="#" data-confirm="Are you sure you want to delete this item?" class="swipeout-delete">Delete</a></div></li>'
                  var strComplete = '<div class="card"><div class="card-content"><div class="list-block"><ul><li><div class="item-content"><div class="item-inner"><div class="item-title">Ivan Petrov</div><div class="item-after"><i class="material-icons override-cancel-icon">cancel</i></div></div></div></li></ul></div></div></div>'
                  var preString = '<a href="#" class="item-link item-content"><div class="item-inner"><div class="item-title">';
                  var postString = '</div></div></a>';
                  $$('#tab-vehicle').append(strComplete);
                  //$$('#car-list').append(str1 + $$('#car-plate').val() + str2 + $$('#car-hint').val() + str3);
              }
          },
        ]
    })
});

function removeParentCard(item) {
    //var parent = item.parent('.card');
    //console.log(parent);
    item.remove();
}

myApp.onPageInit('stuff', function (page) {
$$('.open-3-modal').on('click', function () {
  myApp.modal({
    title:  'Modal with 3 buttons',
    text: 'Vivamus feugiat diam velit. Maecenas aliquet egestas lacus, eget pretium massa mattis non. Donec volutpat euismod nisl in posuere. Vestibulum ante ipsum primis in faucibus orci luctus et ultrices posuere cubilia Curae',
    buttons: [
      {
        text: 'B1',
        onClick: function() {
          myApp.alert('You clicked first button!')
        }
      },
      {
        text: 'B2',
        onClick: function() {
          myApp.alert('You clicked second button!')
        }
      },
      {
        text: 'B3',
        bold: true,
        onClick: function() {
          myApp.alert('You clicked third button!')
        }
      },
    ]
  })
});
});

/*

$$('.open-3-modal').on('click', function () {
  myApp.modal({
    title:  'Modal with 3 buttons',
    text: 'Vivamus feugiat diam velit. Maecenas aliquet egestas lacus, eget pretium massa mattis non. Donec volutpat euismod nisl in posuere. Vestibulum ante ipsum primis in faucibus orci luctus et ultrices posuere cubilia Curae',
    buttons: [
      {
        text: 'B1',
        onClick: function() {
          myApp.alert('You clicked first button!')
        }
      },
      {
        text: 'B2',
        onClick: function() {
          myApp.alert('You clicked second button!')
        }
      },
      {
        text: 'B3',
        bold: true,
        onClick: function() {
          myApp.alert('You clicked third button!')
        }
      },
    ]
  })
});

*/