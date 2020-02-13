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

    /**
     * Preprend newly created game into available games well.
     */
    socket.on('newGameCreated', function (data) {
        let html = '<tr id="'+ data.gameID +'">\
                        <td class="col-xs-3">'+ data.player1 +'</td>\
                        <td class="col-xs-3">'+ data.moveTime +'</td>\
                        <td class="col-xs-2"></td>\
                        <td class="col-xs-4"><a type="button" href="/game/'+ data.gameID +'"\
                        class="btn pull-right btn-success btn-xs">Join</a></td>\
                    </tr>';
        $(html).prependTo('#availGamesScroll').hide().fadeIn(2000);
    });

    /**
     * Remove game once available game is filled,
     * and preprend filled  game into current games well.
     */
    socket.on('gameFilled', function (data) {
        $('#' + data.gameID).fadeOut(2000, function () {
            $(this).remove();
        });
        
        let html = '<tr id="'+ data.gameID +'">\
                        <td class="col-xs-3">'+ data.oppName +'</td>\
                        <td class="col-xs-3">'+ data.moveTime +'</td>\
                        <td class="col-xs-3">'+ data.move +'</td>\
                        <td class="col-xs-3"><a type="button" href="/game/'+ data.gameID +'"\
                        class="btn pull-right btn-success btn-xs">Rejoin</a></td>\
                    </tr>';
        $(html).prependTo('#currGamesScroll').hide().fadeIn(2000);
    });
});