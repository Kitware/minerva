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

    it('should register a user (first is admin)',
       minervaTest.createUser('admin',
                              'admin@email.com',
                              'Admin',
                              'Admin',
                              'adminpassword!'));

    it("should be able to create a new session", function () {
        expect($('.m-session-create-button').length).toBe(1);
    });

    it('should logout', minervaTest.logout());

});

// Currently creating non-adminstrative users does not appear to work
// Seeing errors related to access denied on folders
// See https://github.com/OpenGeoscience/minerva/issues/71
xdescribe('Create a regular user and logout', function () {

    xit('should register a normal user',
       minervaTest.createUser('johndoe',
                              'john.doe@email.com',
                              'John',
                              'Doe',
                              'password!'));

    xit("should be able to create a new session", function () {
        expect($('.m-session-create-button').length).toBe(1);
    });

    xit('should logout', minervaTest.logout());

});

xdescribe('Create a new session', function () {
    var session_name = 'Test Session';
    var session_desc = 'Test Session Description';

    girderTest.shimBlobBuilder();

    it('should login as admin',
       minervaTest.login('admin',
                        'Admin',
                        'Admin',
                        'adminpassword!'));

    it('should create a new session', function () {
        waitsFor(function () {
            return $('.m-session-create-button').length > 0;
        });
        
        runs(function () {
            $('.m-session-create-button').click();
        });

        girderTest.waitForDialog();

        waitsFor(function () {
            return $('.m-save-session').length > 0;
        }, 'session edit form to render');

        // will redirect to session page
        runs(function () {
            $('#m-session-name').val(session_name);
            $('#m-session-description').val(session_desc);
            $('.m-save-session').click();
        });

        girderTest.waitForLoad();

        waitsFor(function () {
            return $('.m-session-title', '.m-session-header').length > 0;
        }, 'session page to render');

        runs(function () {
            // Make sure title and description are visible in session header
            expect($('.m-session-title', '.m-session-header').text()).toBe(session_name);
            expect($('.m-session-description', '.m-session-header').text()).toBe(session_desc);
            // Return to session page
            $('.m-maps-link').click();
        });

        waitsFor(function () {
            return $('.m-session-list-entry', '#g-app-body-container').length > 0;
        }, 'sessions page to load');

        // make sure we have a link and description with session_name and session_desc
        runs(function () {
            expect($('.m-session-link:contains(' + session_name + ')').length).toBe(1);
            expect($('.m-session-description:contains(' + session_desc + ')').length).toBe(1);
        });

    });

});
