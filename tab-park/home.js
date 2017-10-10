$$('.button-signout').on('click', function () {
	firebase.auth().signOut().then(function () {
		// Sign-out successful.
		mainView.router.back();     // cant use router.loadPage(index.html), there are some issue
	}).catch(function (error) {
		// An error happened.
	});
})