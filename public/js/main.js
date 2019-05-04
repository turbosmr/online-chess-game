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

<<<<<<< HEAD
    // //message scroll
    // var messageList = document.getElementById('messagesList');

    // function getMessages() {
    //     shouldScroll = messagesList.scollTop + messagesList.clientHeight === messagesList.scrollHeight;

    //     if(!shouldScroll) {
    //         scrollToBottom()
    //     }
    // }

    // function scrollToBottom() {
    //     messagesList.scrollTop = messagesList.scrollHeight;
    // }
    
    // scrollToBottom();
    
    // setInterval(getMessages, 100);
=======
    //message scroll
    function getMessages() {
        shouldScroll = messagesList.scollTop + messagesList.clientHeight === messagesList.scrollHeight;

        if (!shouldScroll) {
            scrollToBottom()
        }
    }

    function scrollToBottom() {
        messagesList.scrollTop = messagesList.scrollHeight;
    }

    scrollToBottom();

    setInterval(getMessages, 100);
>>>>>>> 2db62f870809be10da9abb4ae6e96e75b026343d
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