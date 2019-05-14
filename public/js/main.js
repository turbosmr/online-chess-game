$(function () {
    var socket = io();

    // To prevent from displaying multiple times during server restarts
    socket.on('reconnect', () => {
        $('#messages').empty();
    });

    // Retrieve number of connected users
    socket.on('users connected', function (num_users_connected) {
        $('#players-online').html("Players online: " + num_users_connected);
    });

    // Submit lobby chat message
    $('#submit-msg').submit(function (e) {
        e.preventDefault(); // prevents page reloading
        if ($('#m').val() != '') {
            socket.emit('lobby chat', {
                username: currUser,
                msg: $('#m').val()
            });
        }
        $('#m').val('');
        return false;
    });

    // Display lobby chat messages on screen
    socket.on('lobby chat', function (data) {
        $('#messages').append("<li><b>" + data.username + "</b>: " + data.msg);
        // new message recieved, scroll to bottom
        scrollToBottom();
    });

    /* Begin message scroll functionality */
    var $el = $("#messagesList");
    var messagesList = document.getElementById('messagesList')
    function anim() {
        var st = $el.scrollTop();
        var sb = $el.prop("scrollHeight") - $el.innerHeight();
        $el.animate({ scrollTop: sb }, "fast", anim);
    }
    function stop() {
        $el.stop();
    }

    // Scroll to bottom
    function scrollToBottom() {
        messagesList.scrollTop = messagesList.scrollHeight;
    }

    // When hovering, stop animation of scrolling
    $el.hover(stop, anim);
    /* End of message scroll functionality */

    /**
     * Create a new game.
     */
    $('#new').on('click', function () {
        let html = '';
        if ($('#moveTimeLimit').val()) {
            $('#new').attr("data-dismiss", "modal");
            var moveTimeLimit = $("#moveTimeLimit option:selected").val();
            socket.emit('createGame', { player1: currUser, moveTimeLimit: moveTimeLimit });
        }
        else {
            alert('Please select a move time limit.');
        }
    });

    /**
     * Redirect user to game page.
     */
    socket.on('newGame', function (data) {
        document.location.replace("/game/" + data.gameID);
    });
});