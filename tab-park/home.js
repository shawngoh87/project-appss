var user = firebase.auth().currentUser;
//------------------------------
// Update password
//------------------------------
$$('#change-password').on('click', function () {
	if ($$('#new-password').val() == $$('#confirm-new-password').val()) {
		user.updatePassword($$('#new-password').val()).then(function () {
			// Update successful.
			myApp.alert('Your password is updated');
		}).catch(function (error) {
			// An error happened.
		});
	} else
		myApp.alert('Password and confirm password does not match','Error!');
})