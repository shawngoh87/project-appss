/*document.getElementById('car1').addEventListener('click', function () {
    document.getElementById('selected-car-plate').innerHTML = document.getElementById('car1').value;
})
document.getElementById('car2').addEventListener('click', function () {
    document.getElementById('selected-car-plate').innerHTML = document.getElementById('car2').value;
})
document.getElementById('car3').addEventListener('click', function () {
    document.getElementById('selected-car-plate').innerHTML = document.getElementById('car3').value;
})
document.getElementById('duration1').addEventListener('click', function () {
    document.getElementById('selected-duration').innerHTML = document.getElementById('duration1').value;
})
document.getElementById('duration2').addEventListener('click', function () {
    document.getElementById('selected-duration').innerHTML = document.getElementById('duration2').value;
})
document.getElementById('duration3').addEventListener('click', function () {
    document.getElementById('selected-duration').innerHTML = document.getElementById('duration3').value;
})
document.getElementById('duration4').addEventListener('click', function () {
    document.getElementById('selected-duration').innerHTML = document.getElementById('duration4').value;
})
document.getElementById('duration5').addEventListener('click', function () {
    document.getElementById('selected-duration').innerHTML = document.getElementById('duration5').value;
})*/

$$('#select-car').on('click', function () {
    var carPlate = $$('input[name=car-plate]:checked').val();
    $$('#selected-car-plate').html(carPlate);
    $$('#selected-car-logo').css('color', 'blue');
    $$('#close-popover-menu').click();
})

$$('#select-duration').on('click', function () {
    var parkDuration = +$$('input[name=duration]:checked').val();
    if (parkDuration > 1) {
        $$('#selected-duration').html(parkDuration + ' Hours');
    }
    else {
        $$('#selected-duration').html(parkDuration + ' Hour');
    }
    $$('#selected-duration-logo').css('color', 'blue');
    $$('#close-popover-menu').click();
})