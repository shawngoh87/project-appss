function identify() {
    var username = document.getElementById("username").value;
    var password = document.getElementById("password").value;

    if(username == 'utarstudent' && password == '123'){
        location = "profile.html";
    }
    else {
        alert('wrong username or password!')
    }
}

document.getElementById("login").addEventListener("click", identify);