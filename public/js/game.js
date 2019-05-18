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
    socket.on('retrieve game chat', function (data) {
        $('#messages').append("<li><b>" + data.userName + "</b>: " + data.message);
        // new message recieved, scroll to bottom
        scrollToBottom();
    });

    // Submit game chat message
    $('form').submit(function (e) {
        e.preventDefault(); // prevents page reloading
        if ($('#m').val() != '') {
            socket.emit('game chat', {
                gameId: gameID,
                username: currUser,
                msg: $('#m').val()
            });
        }
        $('#m').val('');
        return false;
    });

    // Display game chat messages on screen
    socket.on('game chat', function (data) {
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

    /* Begin chessboard configuration */
    var board,
        game,
        player1 = false,
        player2 = false,
        isGameActive = true,
        game2 = new Chess(), // used for game history
        history,
        hist_index,
        result,
        drawAccepted = false,
        oppResigned = false;

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
            isGameActive == false) {
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
        $('#userHello').remove();

        board.position(game.fen());

        document.getElementById("submitMove").disabled = false;
        document.getElementById("undoMove").disabled = false;
    };

    $('#submitMove').on('click', function () {
        game2.load_pgn(game.pgn());
        history = game2.history();
        hist_index = history.length;

        // Check move status
        $('#moveStatus').html(checkMove());

        // Print move history
        $('#move-history-pgn').html(game.pgn({ max_width: 10, newline_char: '<br />' }));
        
        if (game.game_over()) {
            alert(checkGameStatus());
            socket.emit('gameEnd', { gameID: gameID, fen: game.fen(), pgn: game.pgn(), turn: game.turn(), result: result });
        }
        else {
            socket.emit('playTurn', { gameID: gameID, fen: game.fen(), pgn: game.pgn(), turn: game.turn() });
        }
    });

    $('#undoMove').on('click', function () {
        game.undo();
        board.position(game.fen());
        document.getElementById("submitMove").disabled = true;
        document.getElementById("undoMove").disabled = true;
    });

    $('#offerDraw').on('click', function () {
        alert('Draw request sent!');
        socket.emit('offerDraw', { gameID: gameID });
    });

    $('#resignGame').on('click', function () {
        var r = confirm('Are you sure you want to resign the game?');
        if (r == true) {
            isGameActive = false;
            document.getElementById("offerDraw").disabled = true;
            document.getElementById("resignGame").disabled = true;
            $('#moveTimer').remove();
            $('#moveStatus').remove();
            $('#userHello').remove();
            socket.emit('gameEnd', { gameID: gameID, fen: game.fen(), pgn: game.pgn(), result: 'Resignation' });
            //location.replace("/");
            socket.emit('resignGame', { gameID: gameID });
        }
    });

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
        showNotation: true,
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
        $('#oppName').append('\t(' + data.oppRating + ')');

        isGameActive = true;

        // Check move status
        $('#moveStatus').html(checkMove());
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
        /*else {
            message = 'Welcome back, ' + currUser + ".";
        }*/
        $('#userHello').html(message);

        gameID = data.gameID;
        game = new Chess(data.fen);

        if (data.pgn != null) {
            game.load_pgn(data.pgn);
        }

        cfg.boardTheme = window[data.boardTheme2D];
        cfg.pieceTheme = window[data.pieceTheme2D];
        cfg.pieceSet = window[data.pieceTheme3D];
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
                $('#currUser').append('\t(' + data.currUserRating + ')');
                isGameActive = false;
            }
            else {
                $('#oppName').html(data.player2);
                $('#oppName').append('\t(' + data.oppRating + ')');
                $('#currUser').html(data.player1);
                $('#currUser').append('\t(' + data.currUserRating + ')');
            }
        }
        // Check if current user is P2
        else {
            player2 = true;
            board.flip();
            $('#oppName').html(data.player1);
            $('#oppName').append('\t(' + data.oppRating + ')');
            $('#currUser').html(data.player2);
            $('#currUser').append('\t(' + data.currUserRating + ')');
        }

        // Check move status
        $('#moveStatus').html(checkMove());

        // Print move history
        $('#move-history-pgn').html(game.pgn({ max_width: 10, newline_char: '<br />' }));
    });

    /**
     * Opponent played his turn. Update UI.
     * Allow the current player to play now. 
     */
    socket.on('turnPlayed', function (data) {
        game.load(data.fen);
        game.load_pgn(data.pgn);
        board.position(data.fen);

        game2.load_pgn(game.pgn());
        history = game2.history();
        hist_index = history.length;

        // Check move status
        $('#moveStatus').html(checkMove());

        // Print move history
        $('#move-history-pgn').html(game.pgn({ max_width: 10, newline_char: '<br />' }));
    });

    /**
     * If the other player wins or game is tied, this event is received. 
     * Notify the user about either scenario and end the game. 
     */
    socket.on('gameEnded', function (data) {
        game.load(data.fen);
        game.load_pgn(data.pgn);
        board.position(data.fen);

        game2.load_pgn(game.pgn());
        history = game2.history();
        hist_index = history.length;

        // Check move status
        $('#moveStatus').html(checkMove());

        // Print move history
        $('#move-history-pgn').html(game.pgn({ max_width: 10, newline_char: '<br />' }));

        isGameActive = false;

        if (data.result == 'Draw') {
            drawAccepted = true;
        }
        else if (data.result == 'Resignation') {
            oppResigned = true;
        }

        alert(checkGameStatus());
        alert('Once you exit the game, it will no longer exist.');
    });

    /**
     * Render move timer. 
     */
    socket.on('moveTimer', function (data) {
        $('#moveTimer').html(data.timeRem);
    });

    /**
     * Move time expired. Alert user. 
     */
    socket.on('moveTimeExpired', function () {
        isGameActive = false;
        document.getElementById("offerDraw").disabled = true;
        document.getElementById("resignGame").disabled = true;

        $('#moveTimer').remove();
        $('#moveStatus').remove();
        $('#userHello').remove();

        if ((game.turn() == 'w' && player1 == true) || (game.turn() == 'b' && player2 == true)) {
            alert('Time expired, you lost!');
        }
        else {
            alert('Time expired, you won!');
        }

        alert('Once you exit the game, it will no longer exist.');
    });

    /**
     * Opponent requested draw. Prompt to accept or not. 
     */
    socket.on('offeredDraw', function (data) {
        var r = confirm('Opponent has requested for a draw. Accept?');

        if (r == true) {
            document.getElementById("offerDraw").disabled = true;
            document.getElementById("resignGame").disabled = true;
            $('#moveTimer').remove();
            $('#moveStatus').remove();
            $('#userHello').remove();
            socket.emit('gameEnd', { gameID: gameID, fen: game.fen(), pgn: game.pgn(), result: 'Draw' });
        }
    });

    /**
     * Opponent has resigned. Alert current user. 
     */
    socket.on('resignedGame', function () {
        alert('Opponent has resigned, you win!');
    });

    /**
     * Check who has the current move, and render the message. 
     */
    var checkMove = function () {
        if (game.game_over() != true) {
            if (isGameActive == false) {
                return '';
            }
            else if ((player1 == true && game.turn() == 'w') || (player2 == true && game.turn() == 'b')) {
                document.getElementById("offerDraw").disabled = false;
                document.getElementById("resignGame").disabled = false;
                return 'Your move';
            }
            else {
                document.getElementById("submitMove").disabled = true;
                document.getElementById("undoMove").disabled = true;
                document.getElementById("offerDraw").disabled = true;
                document.getElementById("resignGame").disabled = true;
                return 'Opponent\'s move';
            }
        }
    }

    /**
     * Check the game status, and render the result. 
     */
    var checkGameStatus = function () {
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
        else if (drawAccepted == true) {
            message = 'Opponent has accepted your draw request.';
        }
        else if (oppResigned == true) {
            message = 'Opponent has resigned, you win!';
        }
        document.getElementById("offerDraw").disabled = true;
        document.getElementById("resignGame").disabled = true;
        $('#moveTimer').remove();
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
    $('#game-chat-link').click(function (e) {
        $("#game-chat").delay(0).fadeIn(0);
        $("#move-history").fadeOut(0);
        $('#move-history-link').removeClass('active');
        $(this).addClass('active');
        e.preventDefault();
    });
    $('#move-history-link').click(function (e) {
        $("#move-history").delay(0).fadeIn(0);
        $("#game-chat").fadeOut(0);
        $('#game-chat-link').removeClass('active');
        $(this).addClass('active');
        e.preventDefault();
    });

    function setUpBoard(dimensions) {
        if (board !== undefined) {
            currentPosition = board.position();
            board.destroy();
        }
        if (dimensions >= 3) {
            $('#board').css('width', '525px');
            $('#board').css('height', '393px');
            cfg.backgroundColor = 0x383434;
            cfg.lightSquareColor = Number(cfg.boardTheme[0]);
            cfg.darkSquareColor = Number(cfg.boardTheme[1]);
            cfg.blackPieceColor = 0x000000;
            cfg.blackPieceSpecular = 0x646464;
            cfg.whitePieceColor = 0xffffff;
            board = new ChessBoard3('board', cfg);
        } else {
            $('#board').css('width', '526px');
            $('#board').css('height', '526px');
            board = new ChessBoard('board', cfg);
        }
        board.position(game.fen(), false);
        if (player2 == true) {
            board.flip();
        }
    }
    $('#2D').on('click', function () { setUpBoard(2); });
    $('#3D').on('click', function () { setUpBoard(3); });
});