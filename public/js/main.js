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
        //when msg recieved scroll to bottom
        scrollToBottom();
    });

    //message scroll
    var $el = $("#messagesList");
    var messagesList = document.getElementById('messagesList')
    function anim() {
        var st = $el.scrollTop();
        var sb = $el.prop("scrollHeight")-$el.innerHeight();
        $el.animate({scrollTop: sb}, "fast",anim);
    }
    function stop(){
        $el.stop();
    }

    //scroll to bottom
    function scrollToBottom() {
        messagesList.scrollTop = messagesList.scrollHeight;
    }

    //when hovering stop animation of scrolling
    $el.hover(stop, anim);
    //end of message scroll

    /**
     * Create a new game.
     */
    $('#new').on('click', function () {
        var moveTimeLimit = $("#moveTimeLimit option:selected").val();
        socket.emit('createGame', { player1: currUser, moveTimeLimit: moveTimeLimit });
    });

    /**
     * Redirect user to game page.
     */
    socket.on('newGame', function (data) {
        document.location.replace("/game/" + data.gameID);
    });
});