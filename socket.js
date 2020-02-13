const Sequelize = require('sequelize');
const EloRating = require('elo-rating');
const Op = Sequelize.Op;

// Load Games Model
const Game = require('./models').Game;

// Load Users Model
const User = require('./models').User;

//Load GameChat Model
const GameChats = require('./models').GameChats;

var socketCount = 0;

module.exports = function (io) {
    /* Check for connection between client and server */
    io.on('connection', (socket) => {
        // Track which user connects/disconnect and how many users connected
        socketCount++;
        console.log('User connected');
        console.log('Connected users: ' + socketCount);
        io.emit('users connected', socketCount);
        socket.on('disconnect', function () {
            socketCount--;
            console.log('User disconnected');
            console.log('Connected users: ' + socketCount);
            io.emit('users connected', socketCount);
        });

        // Display lobby chat messages to connected clients
        socket.on('lobby chat', (data) => {
            io.emit('lobby chat', data);
        });

        // Store game chat messages and display to that specific gameroom
        socket.on('game chat', (data) => {
            GameChats.create({
                gameId: data.gameId,
                userName: data.username,
                message: data.msg
            });
            io.in(data.gameId).emit('game chat', data);
        });

        /**
         * Create a new game room and notify the creator of game. 
         */
        socket.on('createGame', function (data) {
            // Unique gameID generator
            var gameID = new IDGenerator().generate(),
                hours,
                minutes,
                timeRemFormatted;
            return Game.create({
                gameId: gameID,
                player1: data.player1,
                move: data.player1,
                moveTimeLimit: data.moveTimeLimit
            }).then(function (game) {
                console.log(game.player1 + ' created game: ' + game.gameId);
                hours = Math.floor((game.moveTimeLimit / (60)));
                minutes = game.moveTimeLimit % 60;
                timeRemFormatted = parseInt(hours, 10) + 'h' + parseInt(minutes, 10) + 'm';
                // handle rendering newly created game in lobby
                socket.broadcast.emit('newGameCreated', { 
                    gameID: game.gameId, 
                    player1: game.player1,
                    moveTime: timeRemFormatted
                });
                socket.emit('newGame', { gameID: game.gameId });
            });
        });

        /**
         * Connect the Player to the room they requested.
         */
        socket.on('joinGame', function (data) {
            var rejoin = false;
            Game.findOne({
                where: {
                    gameId: data.gameID,
                    result: null
                }
            }).then(function (game) {
                // Check to see if such game exist
                if (game) {
                    // Check if current user belongs to such game
                    if (game.player1 == data.currUser || game.player2 == data.currUser) {
                        socket.join(game.gameId);
                        if (game.player2 == null) {
                            console.log(data.currUser + ' joined game: ' + game.gameId);
                        }
                        else {
                            console.log(data.currUser + ' has returned back to game: ' + game.gameId);
                            rejoin = true;
                        }
                        //socket.broadcast.to(data.gameID).emit('oppRejoined', { oppName: data.currUser });
                        // Retrieve game chat messages
                        GameChats.findAndCountAll({ where: { gameId: data.gameID } }).then(function (messages, err) {
                            if (err) {
                                console.log('Error retrieving GameChats messages');
                            }
                            else {
                                for (var i = 0; i < messages.count; i++) {
                                    socket.emit('retrieve game chat', messages.rows[i]);
                                }
                            }
                        }).then(function () {
                            User.findAll({ where: { 
                                [Op.or]: [{ userName: game.player1 }, { userName: game.player2 }]
                            } }).then(function (user) {
                                //console.log(user)
                                var currUserRating, oppRating, boardTheme2D, pieceTheme2D, pieceTheme3D;
                                if (user[0].userName == data.currUser) {
                                    boardTheme2D = user[0].boardTheme2D;
                                    pieceTheme2D = user[0].pieceTheme2D;
                                    pieceTheme3D = user[0].pieceTheme3D;
                                    currUserRating = user[0].rating;
                                    if (game.player2 != null) {
                                        oppRating = user[1].rating;
                                    }
                                }
                                else {
                                    boardTheme2D = user[1].boardTheme2D;
                                    pieceTheme2D = user[1].pieceTheme2D;
                                    pieceTheme3D = user[1].pieceTheme3D;
                                    currUserRating = user[1].rating;
                                    oppRating = user[0].rating;
                                }
                                socket.emit('joinedGame', {
                                    gameID: game.gameId,
                                    player1: game.player1,
                                    player2: game.player2,
                                    fen: game.fen,
                                    pgn: game.pgn,
                                    rejoin: rejoin,
                                    boardTheme2D: boardTheme2D,
                                    pieceTheme2D: pieceTheme2D,
                                    pieceTheme3D: pieceTheme3D,
                                    currUserRating: currUserRating,
                                    oppRating: oppRating
                                });
                            });
                        });
                    }
                    // Check to see if game is full; if not, join current user
                    else if (game.player2 == null) {
                        game.update({
                            player2: data.currUser
                        });
                        socket.join(game.gameId);
                        console.log(data.currUser + ' has joined game: ' + game.gameId);
                        User.findAll({ where: { 
                            [Op.or]: [{ userName: game.player1 }, { userName: data.currUser }]
                        } }).then(function (user) {
                            var currUserRating, 
                                oppRating, 
                                boardTheme2D, 
                                pieceTheme2D, 
                                pieceTheme3D,
                                hours,
                                minutes,
                                timeRemFormatted;
                            if (user[1].userName == data.currUser) {
                                boardTheme2D = user[1].boardTheme2D;
                                pieceTheme2D = user[1].pieceTheme2D;
                                pieceTheme3D = user[1].pieceTheme3D;
                                currUserRating = user[1].rating;
                                oppRating = user[0].rating;
                            }
                            else {
                                boardTheme2D = user[0].boardTheme2D;
                                pieceTheme2D = user[0].pieceTheme2D;
                                pieceTheme3D = user[0].pieceTheme3D;
                                currUserRating = user[0].rating;
                                oppRating = user[1].rating;
                            }
                            socket.emit('joinedGame', {
                                gameID: game.gameId,
                                player1: game.player1,
                                player2: game.player2,
                                fen: game.fen,
                                pgn: game.pgn,
                                rejoin: rejoin,
                                boardTheme2D: boardTheme2D,
                                pieceTheme2D: pieceTheme2D,
                                pieceTheme3D: pieceTheme3D,
                                currUserRating: currUserRating,
                                oppRating: oppRating
                            });
                            socket.broadcast.to(game.gameId).emit('oppJoined', { 
                                oppName: data.currUser, 
                                oppRating: currUserRating 
                            });
                            // Let other users know that game is filled
                            hours = Math.floor((game.moveTimeLimit / (60)));
                            minutes = game.moveTimeLimit % 60;
                            timeRemFormatted = parseInt(hours, 10) + 'h' + parseInt(minutes, 10) + 'm';
                            socket.broadcast.emit('gameFilled', { 
                                gameID: game.gameId,
                                oppName: game.player2,
                                moveTime: timeRemFormatted,
                                move: game.move
                            });
                        });
                    }
                    // Game is full
                    else {
                        socket.emit('fullGame', { message: 'Game "' + game.gameId + '" is full.' });
                        console.log('Game "' + game.gameId + '" is full.');
                    }
                }
                // Game does not exist
                else {
                    socket.emit('dneGame', { message: 'Such game does not exist.' });
                    console.log('Game "' + data.gameID + '" does not exist.');
                }
            });
        });

        /**
         * Handle the turn played by either player and notify the other. 
         */
        socket.on('playTurn', function (data) {
            Game.findOne({ where: { gameId: data.gameID } }).then(function (game) {
                var move,
                    currDateTime = new Date();
                if (data.turn == 'w') {
                    move = game.player1;
                }
                else {
                    move = game.player2;
                }
                currDateTime.setMinutes(currDateTime.getMinutes() + game.moveTimeLimit);
                currDateTime.setSeconds(currDateTime.getSeconds() + 1);
                game.update({
                    fen: data.fen,
                    pgn: data.pgn,
                    turns: Sequelize.literal('turns + 1'),
                    move: move,
                    makeMoveBy: currDateTime.getTime()
                });
                socket.broadcast.to(game.gameId).emit('turnPlayed', data);
            });
        });

        /**
         * Notify the players about the victor.
         */
        socket.on('gameEnd', function (data) {
            Game.findOne({ where: { gameId: data.gameID } }).then(function (game) {
                var move;
                if (data.turn == 'w') {
                    move = game.player1;
                }
                else {
                    move = game.player2;
                }
                return game.update({
                    fen: data.fen,
                    pgn: data.pgn,
                    turns: Sequelize.literal('turns + 1'),
                    move: move,
                    result: data.result
                });
            }).then(function (game) {
                updateUserStat(game);
            });
            socket.broadcast.to(data.gameID).emit('gameEnded', data);
        });

        /**
         * Player requesting draw. Send request to opponent.
         */
        socket.on('offerDraw', function (data) {
            socket.broadcast.to(data.gameID).emit('offeredDraw', data);
        });

        /**
         * Player has resigned. Alert opponent.
         */
        socket.on('resignGame', function (data) {
            socket.broadcast.to(data.gameID).emit('resignedGame');
        });

        /**
         * Move timer.
         */
        setInterval(function () {
            Game.findAndCountAll({
                where: {
                    [Op.not]: [{ player2: null }],
                    turns: { [Op.gt]: 0 },
                    result: null
                }, logging: false
            }).then(function (results, err) {
                var game,
                    now,
                    timeRem,
                    days,
                    hours,
                    minutes,
                    seconds,
                    timeRemFormatted;
                for (var i = 0; i < results.count; i++) {
                    game = results.rows[i];
                    now = new Date().getTime();
                    timeRem = game.makeMoveBy - now;
                    days = Math.floor(timeRem / (1000 * 60 * 60 * 24));
                    hours = Math.floor((timeRem % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                    minutes = Math.floor((timeRem % (1000 * 60 * 60)) / (1000 * 60));
                    seconds = Math.floor((timeRem % (1000 * 60)) / 1000);
                    if (days > 1) {
                        timeRemFormatted = 'Move Time: ' + days +' Days'
                    }
                    else {
                        timeRemFormatted = 'Move Time: ' + ('0' + hours).slice(-2) + ':' 
                        + ('0' + minutes).slice(-2) + ':' + ('0' + seconds).slice(-2)
                    }
                    if (timeRem > 0) {
                        io.in(game.gameId).emit('moveTimer', { timeRem: timeRemFormatted });
                    }
                    else {
                        if (game.result == null) {
                            game.update({
                                result: 'Move Time Expired'
                            });
                        }
                        updateUserStat(game);
                        socket.in(game.gameId).emit('moveTimeExpired');
                    }
                }
            });
        }, 1000);
    });

    function updateUserStat(game) {
        var p1Rating,
            p2Rating,
            k1Factor,
            k2Factor;

        User.findAndCountAll().then(function(users,error) {
            for (var i = 0; i < users.count; i++) {
                if (users.rows[i].userName == game.player1) {
                    p1Rating = users.rows[i].rating;
                }
                else if (users.rows[i].userName == game.player2) {
                    p2Rating = users.rows[i].rating;
                }
            }

            console.log('p1 rating: ' + p1Rating);
            console.log('p2 rating: ' + p2Rating);

            // determine k-factor for p1 and p2
            if (p1Rating < 2100) {
                k1Factor = 32;
            }
            else if (p1Rating >= 2100 && p1Rating <= 2400) {
                k1Factor = 24;
            }
            else {
                k1Factor = 16;
            }

            if (p2Rating < 2100) {
                k2Factor = 32;
            }
            else if (p2Rating >= 2100 && p2Rating <= 2400) {
                k2Factor = 24;
            }
            else {
                k2Factor = 16;
            }

            console.log('k1Factor: ' + k1Factor);
            console.log('k2Factor: ' + k2Factor);

            if (game.result == 'Checkmate' || game.result == 'Move Time Expired' || game.result == 'Resignation') {
                if (game.move != game.player1) {
                    var elo = EloRating.calculate(p1Rating, p2Rating, true, k1Factor);
                    console.log(game.player1 + ' elo: ' + elo.playerRating + ', ' + game.player2 +  ' elo: ' + elo.opponentRating);
                    // Winner; update user's win count and rating
                    User.update({
                        winCount: Sequelize.literal('winCount + 1'),
                        rating: elo.playerRating
                    }, { where: { userName: game.player1 } });
                    // Loser; update user's lose count and rating
                    User.update({
                        loseCount: Sequelize.literal('loseCount + 1'),
                        rating: elo.opponentRating
                    }, { where: { userName: game.player2 } });
                }
                else {
                    var elo = EloRating.calculate(p2Rating, p1Rating, true, k2Factor);
                    console.log(game.player1 + ' elo: ' + elo.playerRating + ', ' + game.player2 +  ' elo: ' + elo.opponentRating);
                    // Winner; update user's win count
                    User.update({
                        winCount: Sequelize.literal('winCount + 1'),
                        rating: elo.playerRating
                    }, { where: { userName: game.player2 } });
                    // Loser; update user's lose count
                    User.update({
                        loseCount: Sequelize.literal('loseCount + 1'),
                        rating: elo.opponentRating
                    }, { where: { userName: game.player1 } });
                }
            }
            else if (game.result == 'Draw') {
                //k1 + [0.5 * expected score] //0.5 is the draw
                var expectedScore = EloRating.expected(p1Rating, p2Rating);
                var difference = k1Factor + (0.5 * expectedScore);

                if (p1Rating > p2Rating) {
                    // Update users' draw count
                    User.update({
                        drawCount: Sequelize.literal('drawCount + 1'),
                        rating: Sequelize.literal('rating -' + difference)
                    }, { where: { userName: game.player1 } });
                    // Update users' draw count
                    User.update({
                        drawCount: Sequelize.literal('drawCount + 1'),
                        rating: Sequelize.literal('rating +' + difference)
                    }, { where: { userName: game.player2 } });
                }
                else if (p1Rating < p2Rating) {
                    // Update users' draw count
                    User.update({
                        drawCount: Sequelize.literal('drawCount + 1'),
                        rating: Sequelize.literal('rating +' + difference)
                    }, { where: { userName: game.player1 } });
                    // Update users' draw count
                    User.update({
                        drawCount: Sequelize.literal('drawCount + 1'),
                        rating: Sequelize.literal('rating -' + difference)
                    }, { where: { userName: game.player2 } });
                }
                else {
                    // Update users' draw count
                    User.update({
                        drawCount: Sequelize.literal('drawCount + 1')
                    }, { where: { userName: game.player1 } });
                    // Update users' draw count
                    User.update({
                        drawCount: Sequelize.literal('drawCount + 1')
                    }, { where: { userName: game.player2 } });
                }
            }
        });
    }

    function IDGenerator() {
        this.length = 8;
        this.timestamp = +new Date;

        var _getRandomInt = function (min, max) {
            return Math.floor(Math.random() * (max - min + 1)) + min;
        }

        this.generate = function () {
            var ts = this.timestamp.toString();
            var parts = ts.split("").reverse();
            var id = "";

            for (var i = 0; i < this.length; ++i) {
                var index = _getRandomInt(0, parts.length - 1);
                id += parts[index];
            }

            return id;
        }
    }
}
