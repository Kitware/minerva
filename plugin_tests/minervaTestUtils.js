/**
 * Contains utility functions used in the girder jasmine tests.
 */
var minervaTest = minervaTest || {};

window.alert = function (msg) {
    // alerts block phantomjs and will destroy us.
    console.log(msg);
};

// Timeout to wait for asynchronous actions
minervaTest.TIMEOUT = 5000;

minervaTest.createUser = function (login, email, firstName, lastName, password) {

    runs(function () {
        expect(girder.currentUser).toBe(null);
    });

    waitsFor(function () {
        return $('.g-register').length > 0;
    }, 'Girder app to render');

    runs(function () {
        $('.g-register').click();
    });

    girderTest.waitForDialog();

    waitsFor(function () {
        return $('input#g-email').length > 0;
    }, 'register dialog to appear');

    runs(function () {
        $('#g-login').val(login);
        $('#g-email').val(email);
        $('#g-firstName').val(firstName);
        $('#g-lastName').val(lastName);
        $('#g-password,#g-password2').val(password);
        $('#g-register-button').click();
    });

    girderTest.waitForLoad();

    waitsFor(function () {
        return $('.m-user-link')[0].text === firstName + ' ' + lastName;
    }, 'user to be logged in');

    runs(function () {
        expect(girder.currentUser).not.toBe(null);
        expect(girder.currentUser.name()).toBe(firstName + ' ' + lastName);
        expect(girder.currentUser.get('login')).toBe(login);
    });


};
