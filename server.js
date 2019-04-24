const express = require('express');
const http = require('http');
const path = require('path');
const socketIO = require('socket.io');
const mysql = require('mysql');
const exphbs = require('express-handlebars');
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');
const passport = require('passport')
const flash = require('connect-flash');
const session = require("express-session");

const app = express();
const server = http.Server(app);
const io = socketIO(server);

// Passport config
require('./config/passport')(passport);

// Static files
app.use(express.static(path.join(__dirname, 'public')));

// Handlebars
app.engine('hbs', exphbs({
    defaultLayout: 'main',
    extname: '.hbs'
}));
app.set('view engine', 'hbs');

// Body parser
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// Cookie parser
//app.use(cookieParser());

// Express session
app.use(session({
    secret: 'secret',
    resave: true,
    saveUninitialized: true
}));

// Passport middleware
app.use(passport.initialize());
app.use(passport.session());

// Connect flash
app.use(flash());

// Global variables
app.use(function (req, res, next) {
    res.locals.success = req.flash('success');
    res.locals.error_msg = req.flash('error_msg');
    res.locals.error = req.flash('error');
    next();
});

// Routes
app.use('/', require('./routes/index.js'));
app.use('/users', require('./routes/users.js'));

var socketCount = 0;
var rooms = 0;
var gameRooms = [];

/* Check for connection between client and server */
io.on('connection', (socket) => {
    // Track which user connects/disconnect and how many users connected
    socketCount++;
    console.log('User connected');
    console.log('Connected users: ' + socketCount);
    socket.emit('users connected', socketCount);
    socket.on('disconnect', function () {
        socketCount--;
        console.log('User disconnected');
        console.log('Connected users: ' + socketCount);
        socket.emit('users connected', socketCount);
    });

    // lobbyChat.findAndCountAll().then(function(results,err) {
    //     if(err)
    //     {
    //         console.log('Error selecting messages from DB.');
    //     }
    //     else 
    //     {
    //         for(var index = 0; index < results.count; index++)
    //         {
    //             socket.emit('retrieve messages', results.rows[index]);
    //         }
    //     }
    // })

    // Store and display messages to connected clients, as well as console
    socket.on('chat message', (loggedUser, msg) => {
        io.emit('chat message', loggedUser, msg);
    });

    //leaderboard stuff

    /**
     * Create a new game room and notify the creator of game. 
     */
    socket.on('createGame', function (data) {
        var gameID = 'room-' + ++rooms;
        var gameRoom = { gameID: gameID, fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', pgn: '', player1: data.name, player2: '', result: '' };
        gameRooms.push(gameRoom);
        console.log(data.name + ' created game: ' + gameRoom.gameID);
        socket.join(gameID);
        socket.emit('newGame', { name: data.name, gameID: gameID, fen: gameRoom.fen });
    });

    /**
     * Connect the Player 2 to the room he requested. Show error if room full.
     */
    socket.on('joinGame', function (data) {
        var index;
        var gameFound = false;
        for (index = 0; index < gameRooms.length; index++) {
            if (gameRooms[index].gameID == data.gameID) {
                gameFound = true;
                if (gameRooms[index].player2 != data.name) {
                    if (gameRooms[index].player2 == '') {
                        gameRooms[index].player2 = data.name;
                        socket.join(data.gameID);
                        console.log(data.name + ' has joined game: ' + data.gameID);
                        socket.broadcast.to(data.gameID).emit('player1', { name: data.name });
                        socket.emit('player2', { name: data.name, gameID: gameRooms[index].gameID, fen: gameRooms[index].fen });
                    }
                    else {
                        console.log(data.gameID + ' is full.');
                        socket.emit('err', { message: 'Sorry, ' + data.gameID + ' is full.' });
                    }
                    break;
                }
                else {
                    console.log('You are already in this game.');
                    socket.emit('err', { message: 'You are already in this game.' });
                }
                break;
            }
        }
        if (gameFound == false) {
            console.log('Such game does not exist.');
            socket.emit('err', { message: 'Such game does not exist.' });
        }
    });

    /**
     * Handle the turn played by either player and notify the other. 
     */
    socket.on('playTurn', function (data) {
        //update gameRoom object with new FEN and PGN
        var index;
        for (index = 0; index < gameRooms.length; index++) {
            if (gameRooms[index].gameID == data.gameID) {
                gameRooms[index].fen = data.fen;
                gameRooms[index].pgn = data.pgn;
                break;
            }
        }
        socket.broadcast.to(data.gameID).emit('turnPlayed', data);
    });

    /**
     * Notify the players about the victor.
     */
    socket.on('gameEnded', function (data) {
        //update gameRoom object with result
        var index;
        for (index = 0; index < gameRooms.length; index++) {
            if (gameRooms[index].gameID == data.gameID) {
                gameRooms[index].result = data.result;
                break;
            }
        }
        console.log(gameRooms[index].result);
        socket.broadcast.to(data.gameID).emit('gameEnd', data);
    });
});

// Set port number
app.set('port', 8081);

/* Start server */
server.listen(app.get('port'), function () {
    console.log('Starting server on port ' + app.get('port'));
});

/* End connection with DB */
// pool.end




module.exports = app;
