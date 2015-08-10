$(function () {
    minerva.events.trigger('g:appload.before');
    minerva.mainApp = new minerva.App({
        el: 'body',
        parentView: null
    });
    minerva.events.trigger('g:appload.after');
});

describe('a test for the minerva plugin application', function () {

    it('displays the minerva app', function () {
        waitsFor(function () {
            return $('a.m-maps-link:visible').length === 1;
        }, 'the maps button to be visible');
    });

    it('should display a register button', function () {
        expect($('.g-register').length).toBe(1);
    });

    it('should display a login button', function () {
        expect($('.g-login').length).toBe(1);
    });

});

describe('Create an admin user and logout', function () {

    it('should register a user (first is admin)', function () {
        minervaTest.createUser('admin',
                               'admin@email.com',
                               'Admin',
                               'Admin',
                               'adminpassword!');
        expect($('.m-session-create-button').length).toBe(1);
    });

    it('should logout', girderTest.logout());

});

describe('Create a regular user and logout', function () {

    it('should register a normal user', function () {
        minervaTest.createUser('johndoe',
                              'john.doe@email.com',
                              'John',
                              'Doe',
                              'password!');
        expect($('.m-session-create-button').length).toBe(1);

    });

    it('should logout', girderTest.logout());

});

