$(function () {

    var socket = io();

    // To prevent from displaying multiple times during server restarts
    socket.on('reconnect', () => {
        $('#messages').empty();
    });

    // Retrieve number of connected users
    socket.on('users connected', function (num_users_connected) {
        $('#users-connected').html("Users connected: " + num_users_connected);
    });

    // Retrieve messages from database upon entering chatroom
    socket.on('retrieve messages', function (msg) {
        $('#messages').append($('<li>').text(msg.userName + ": " + msg.message));
    });
    $('#submit-msg').submit(function (e) {
        e.preventDefault(); // prevents page reloading
        console.log('submit method iinside mainjs');
        if ($('#m').val() != '') {
            socket.emit('chat message', {
                username: currUser,
                msg: $('#m').val()
            });
        }
        $('#m').val('');
        return false;
    });

    // Display messages on screen
    socket.on('chat message', function (data) {
        $('#messages').append($('<li>').text(data.username + ": " + data.msg));
    });

    //message scroll
    var $el = $("#messagesList");
    function anim() {
        var st = $el.scrollTop();
        var sb = $el.prop("scrollHeight")-$el.innerHeight();
        $el.animate({scrollTop: sb}, "fast",anim);
    }
    function stop(){
        $el.stop();
    }
    anim();
    $el.hover(stop, anim);
    //end of message scroll


    /**
     * Create a new game.
     */
    $('#new').on('click', function () {
        socket.emit('createGame', { player1: currUser });
    });

    /**
     * Redirect user to game page.
     */
    socket.on('newGame', function (data) {
        location.replace("/game/" + data.gameID);
    });
});