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
                            User.findOne({ where: { userName: data.currUser } }).then(function (user) {
                                socket.emit('joinedGame', {
                                    gameID: game.gameId,
                                    player1: game.player1,
                                    player2: game.player2,
                                    fen: game.fen,
                                    pgn: game.pgn,
                                    rejoin: rejoin,
                                    boardTheme2D: user.boardTheme2D,
                                    pieceTheme2D: user.pieceTheme2D
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
                        socket.broadcast.to(game.gameId).emit('oppJoined', { oppName: data.currUser });
                        User.findOne({ where: { userName: data.currUser } }).then(function (user) {
                            socket.emit('joinedGame', {
                                gameID: game.gameId,
                                player1: game.player1,
                                player2: game.player2,
                                fen: game.fen,
                                pgn: game.pgn,
                                rejoin: rejoin,
                                boardTheme2D: user.boardTheme2D
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
                return game.update({
                    fen: data.fen,
                    pgn: data.pgn,
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
         * Move timer.
         */
        /*setInterval(function () {
            Game.findAndCountAll({
                where: {
                    [Op.not]: [{ player2: null }],
                    turns: { [Op.gt]: 0 },
                    result: null
                }
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
                    timeRemFormatted = 'Move Time Left: ' + ('0' + days).slice(-2) + ':' + ('0' + hours).slice(-2) + ':' + ('0' + minutes).slice(-2) + ':' + ('0' + seconds).slice(-2)
                    if (timeRem > 0) {
                        io.in(game.gameId).emit('moveTimer', { timeRem: timeRemFormatted });
                        //console.log(('0'  + days).slice(-2) + ':' + ('0'  + hours).slice(-2) + ':' + ('0'  + minutes).slice(-2) + ':' + ('0' + seconds).slice(-2));
                    }
                    else {
                        game.update({
                            result: 'Move Time Expired'
                        });
                        updateUserStat(game);
                        socket.in(game.gameId).emit('moveTimeExpired');
                    }
                }
            });
        }, 1000);*/
    });

    function updateUserStat(game) {

        var p1Rating;
        var p2Rating;

        User.findAndCountAll().then(function(users,error) {
            
            for(var i = 0; i < users.count; i++)
            {
                if(users.rows[i].userName == game.player1)
                {
                    p1Rating = users.rows[i].rating;
                }
                else if(users.rows[i].userName == game.player2)
                {
                    p2Rating = users.rows[i].rating;
                }
            }

            console.log('p1 rating: ' + p1Rating);
            console.log('p2 rating: ' + p2Rating);

            //determine k-factor for p1 and p2
            var k1Factor;
            var k2Factor;
            if(p1Rating < 2100)
            {
                k1Factor = 32;
            }
            else if(p1Rating >= 2100 && p1Rating <= 2400)
            {
                k1Factor = 24;
            }
            else
            {
                k1Factor = 16;
            }

            if(p2Rating < 2100)
            {
                k2Factor = 32;
            }
            else if(p2Rating >= 2100 && p2Rating <= 2400)
            {
                k2Factor = 24;
            }
            else
            {
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

                if(p1Rating > p2Rating)
                {
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
                else if(p1Rating < p2Rating)
                {
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
                else
                {
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
