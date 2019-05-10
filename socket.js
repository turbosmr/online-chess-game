const Sequelize = require('sequelize');

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

        // Store and display messages to connected clients, as well as console
        socket.on('chat message', (data) => {
            io.emit('chat message', data);
        });

        GameChats.findAndCountAll().then(function(result, error) {
            if(error)
            {
                console.log('Error retrieving GameChats messages');
            }
            else
            {
                for(var i = 0; i < result.count; i++)
                {
                    //console.log(result.rows[i]);
                    socket.emit('retrieve messages', result.rows[i]);
                }
            }
        });

        socket.on('game chat message', (data) => {
            GameChats.create({
                gameId: data.gameId,
                userName: data.username,
                message: data.msg
            });

            io.emit('game chat message', data);
        });

        //leaderboard stuff

        /**
         * Create a new game room and notify the creator of game. 
         */
        socket.on('createGame', function (data) {
            // Unique gameID generator
            var gameID = new IDGenerator().generate();
            Game.create({
                gameId: gameID,
                player1: data.player1,
                move: data.player1,
                moveTimeLimit: data.moveTimeLimit,
                gameTimeLimit: data.gameTimeLimit
            });
            console.log(data.player1 + ' created game: ' + gameID);
            socket.emit('newGame', { gameID: gameID });
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
                            console.log(data.currUser + ' created game: ' + game.gameId);
                        }
                        else {
                            console.log(data.currUser + ' has returned back to game: ' + game.gameId);
                            rejoin = true;
                        }
                        socket.broadcast.to(data.gameID).emit('oppRejoined', { oppName: data.currUser });
                        socket.emit('joinedGame', {
                            gameID: game.gameId,
                            player1: game.player1,
                            player2: game.player2,
                            fen: game.fen,
                            pgn: game.pgn,
                            rejoin: rejoin
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
                        socket.emit('joinedGame', {
                            gameID: game.gameId,
                            player1: game.player1,
                            player2: game.player2,
                            fen: game.fen,
                            pgn: game.pgn,
                            rejoin: rejoin
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
                var move;
                if (data.turn == 'w') {
                    move = game.player1;
                }
                else {
                    move = game.player2;
                }
                game.update({
                    fen: data.fen,
                    pgn: data.pgn,
                    move: move
                });
                socket.broadcast.to(game.gameId).emit('turnPlayed', data);
            });
        });

        /**
         * Notify the players about the victor.
         */
        socket.on('gameEnded', function (data) {
            Game.findOne({ where: { gameId: data.gameID } }).then(function (game) {
                return game.update({
                    fen: data.fen,
                    pgn: data.pgn,
                    result: data.result
                });
            }).then(function (game) {
                if (data.result == 'Checkmate') {
                    if (game.move != game.player1) {
                        // Winner; update user's win count
                        User.update({
                            winCount: Sequelize.literal('winCount + 1')
                        }, { where: { userName: game.player1 } });
                        // Loser; update user's lose count
                        User.update({
                            loseCount: Sequelize.literal('loseCount + 1')
                        }, { where: { userName: game.player2 } });
                    }
                    else {
                        // Winner; update user's win count
                        User.update({
                            winCount: Sequelize.literal('winCount + 1')
                        }, { where: { userName: game.player2 } });
                        // Loser; update user's lose count
                        User.update({
                            loseCount: Sequelize.literal('loseCount + 1')
                        }, { where: { userName: game.player1 } });
                    }
                }
                else if (data.result == 'Draw') {
                    // Update users' draw count
                    User.update({
                        drawCount: Sequelize.literal('drawCount + 1')
                    }, { where: { userName: game.player1, userName: game.player2 } });
                }
            });
            socket.broadcast.to(data.gameID).emit('gameEnd', data);
        });
    });

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
