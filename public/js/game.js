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
        $('#messages').append($('<li>').text(msg.username + ": " + msg.message));
    });

    $('form').submit(function (e) {
        e.preventDefault(); // prevents page reloading
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

    /* Begin chessboard configuration */
    var board,
        game,
        player1 = false,
        player2 = false,
        gameStart = true,
        game2 = new Chess(), // used for game history
        history,
        hist_index,
        result;

    var removeGreySquares = function () {
        $('#board .square-55d63').css('background', '');
    };

    var greySquare = function (square) {
        var squareEl = $('#board .square-' + square);

        var background = '#a9a9a9';
        if (squareEl.hasClass('black-3c85d') === true) {
            background = '#696969';
        }

        squareEl.css('background', background);
    };

    var onDragStart = function (source, piece) {
        // do not pick up pieces if the game is over
        // or if it's not that side's turn
        // or if P1 has created game and P2 has not joined
        if (game.game_over() === true ||
            (player2 === true && game.turn() === 'w') ||
            (player1 === true && game.turn() === 'b') ||
            (player1 === true && piece.search(/^b/) !== -1) ||
            (player2 === true && piece.search(/^w/) !== -1) ||
            gameStart == false) {
            return false;
        }
    };

    var onDrop = function (source, target) {
        removeGreySquares();

        // see if the move is legal
        var move = game.move({
            from: source,
            to: target,
            promotion: 'q' // NOTE: always promote to a queen for example simplicity
        });

        // illegal move
        if (move === null) return 'snapback';
    };

    var onSnapEnd = function () {
        board.position(game.fen());
        game2.load_pgn(game.pgn());
        
        history = game2.history();
        hist_index = history.length;

        $('#userHello').remove();

        // Check move status
        $('#moveStatus').html(checkMove());

        socket.emit('playTurn', { gameID: gameID, fen: game.fen(), pgn: game.pgn(), turn: game.turn() });
    };

    var onMouseoverSquare = function (square, piece) {
        // get list of possible moves for this square
        var moves = game.moves({
            square: square,
            verbose: true
        });

        // exit if there are no moves available for this square
        if (moves.length === 0) return;

        // highlight the square they moused over
        greySquare(square);

        // highlight the possible squares for this piece
        for (var i = 0; i < moves.length; i++) {
            greySquare(moves[i].to);
        }
    };

    var onMouseoutSquare = function (square, piece) {
        removeGreySquares();
    };

    var cfg = {
        showNotation: false,
        draggable: true,
        position: 'start',
        onDragStart: onDragStart,
        onDrop: onDrop,
        //onMouseoutSquare: onMouseoutSquare,
        //onMouseoverSquare: onMouseoverSquare,
        onSnapEnd: onSnapEnd
    };


    /* Implementation of P2P functionality using sockets */

    /* Join user to the game with game ID from URL path */
    socket.emit('joinGame', { currUser: currUser, gameID: gameID });

    /**
     * Case where game does not exist, redirect user to lobby page.
     */
    socket.on('dneGame', function (data) {
        alert(data.message);
        location.replace("/");
    });

    /**
     * Case where game is full, redirect user to lobby page.
     */
    socket.on('fullGame', function (data) {
        alert(data.message);
        location.replace("/");
    });

    /**
     * Opponent joined the game, alert current user.
     * This event is received when opponent successfully joins the game. 
     */
    socket.on('oppJoined', function (data) {
        var message = 'Your opponent, ' + data.oppName + ' has joined the match.';
        $('#userHello').html(message);
        $('#oppName').html(data.oppName);

        // Check move status
        $('#moveStatus').html(checkMove());

        gameStart = true;
    });

    /**
     * Opponent rejoined the game, alert current user.
     * This event is received when opponent successfully rejoins the game. 
     */
    socket.on('oppRejoined', function (data) {
        var message = 'Your opponent, ' + data.oppName + ' has rejoined the match.';
        $('#userHello').html(message);
    });

    /**
     * Current user joined the game, render saved game state.
     * This event is received when current user successfully joins the game. 
     */
    socket.on('joinedGame', function (data) {
        var message;

        // Check if joining or rejoining game to display correct message
        if (!data.rejoin) {
            message = 'Hello, ' + currUser + ".";
        }
        else {
            message = 'Welcome back, ' + currUser + ".";
        }
        $('#userHello').html(message);

        gameID = data.gameID;
        game = new Chess(data.fen);

        if (data.pgn != null) {
            game.load_pgn(data.pgn);
        }

        cfg.position = data.fen;
        board = ChessBoard('board', cfg);

        game2.load_pgn(game.pgn());
        history = game2.history();
        hist_index = history.length;

        // Check if current user is P1
        if (data.player1 == currUser) {
            player1 = true;
            if (data.player2 == null) {
                // P1 has created new game
                $('#oppName').html('Waiting for an opponent to join...');
                $('#currUser').html(data.player1);
                gameStart = false;
            }
            else {
                $('#oppName').html(data.player2);
                $('#currUser').html(data.player1);
            }
        }
        // Check if current user is P2
        else {
            player2 = true;
            board.flip();
            $('#oppName').html(data.player1);
            $('#currUser').html(data.player2);
        }

        // Check move status
        $('#moveStatus').html(checkMove());
    });

    /**
     * Opponent played his turn. Update UI.
     * Allow the current player to play now. 
     */
    socket.on('turnPlayed', function (data) {
        game.load(data.fen);
        //game.load_pgn(data.pgn);
        board.position(data.fen);

        game2.load_pgn(game.pgn());
        history = game2.history();
        hist_index = history.length;

        // Check move status
        $('#moveStatus').html(checkMove());

        if (game.game_over() == true) {
            alert(checkGameStatus());
            socket.emit('gameEnded', { gameID: gameID, fen: game.fen(), pgn: game.pgn(), result: result });
        }
    });

    /**
     * If the other player wins or game is tied, this event is received. 
     * Notify the user about either scenario and end the game. 
     */
    socket.on('gameEnd', function (data) {
        alert(checkGameStatus());
    });

    /**
     * Check who has the current move, and render the message. 
     */
    var checkMove = function () {
        if (game.game_over() != true) {
            if (gameStart == false) {
                return '';
            }
            else if ((player1 == true && game.turn() == 'w') || (player2 == true && game.turn() == 'b')) {
                return 'Your move!';
            }
            else {
                return 'Opponent\'s move.';
            }
        }
    }

    /**
     * Check the game status, and render the result. 
     */
    var checkGameStatus = function (done) {
        var message;
        if (game.game_over() == true) {
            if (game.in_checkmate() == true) {
                result = 'Checkmate';
                if (game.turn() == 'b') {
                    if (player1 == true) {
                        message = 'Checkmate, you win!';
                    }
                    else {
                        message = 'Checkmate, you lost!';
                    }
                }
                else {
                    if (player2 == true) {
                        message = 'Checkmate, you win!';
                    }
                    else {
                        message = 'Checkmate, you lost!';
                    }
                }
            }
            // returns true if insufficient material or 50-move rule
            else if (game.in_draw() == true) {
                result = 'Draw';
                if (game.insufficient_material() == true) {
                    message = 'Draw - insufficient material';
                }
                else {
                    message = 'Draw - 50-move rule';
                }
            }
            else if (game.in_stalemate() == true) {
                result = 'Draw';
                message = 'Draw - stalemate';
            }
            else if (game.in_threefold() == true) {
                result = 'Draw';
                message = 'Draw - threefold repetition';
            }
        }
        $('#moveStatus').remove();
        $('#userHello').remove();
        return message;
    }

    /**
     * Game history, previous move. 
     */
    $('#prevBtn5').on('click', function () {
        game2.undo();
        board.position(game2.fen());
        hist_index -= 1;
        if (hist_index < 0) {
            hist_index = 0;
        }
    });

    /**
     * Game history, next move. 
     */
    $('#nextBtn5').on('click', function () {
        game2.move(history[hist_index]);
        board.position(game2.fen());
        hist_index += 1;
        if (hist_index > history.length) {
            hist_index = history.length;
        }
    });

    /**
     * Game history, starting position of board. 
     */
    $('#startPositionBtn5').on('click', function () {
        game2.reset();
        board.start();
        hist_index = 0;
    });

    /**
     * Game history, current state of game. 
     */
    $('#endPositionBtn5').on('click', function () {
        game2.load_pgn(game.pgn());
        board.position(game2.fen());
        hist_index = history.length;
    });

    // toggle chat and history / login and register
    $('#login-form-link').click(function (e) {
        $("#login-form").delay(0).fadeIn(0);
        $("#register-form").fadeOut(0);
        $('#register-form-link').removeClass('active');
        $(this).addClass('active');
        e.preventDefault();
      });
      $('#register-form-link').click(function (e) {
        $("#register-form").delay(0).fadeIn(0);
        $("#login-form").fadeOut(0);
        $('#login-form-link').removeClass('active');
        $(this).addClass('active');
        e.preventDefault();
      });
});