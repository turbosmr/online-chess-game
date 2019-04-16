const express = require('express');
const http = require('http');
const path = require('path');
const socketIO = require('socket.io');
const mysql = require('mysql');

const app = express();
const server = http.Server(app);
const io = socketIO(server);
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');

//User Router and model for passport
const userRouter = require('./routes/users'); //User routing methods
const userModel = require('./models/index').User;
//Session for Login using passport, express-session and bcrypt.js
var session = require("express-session");
const {comparePassword} = require('./lib/bcrypt');
var passport = require('passport')
  , LocalStrategy = require('passport-local').Strategy;

  //view engine setup
app.set('views', path.join(__dirname, '/public'));
app.engine('html', require('ejs').renderFile);
app.set('view engine', 'html');

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.set('port', 8081);
app.use(express.static(path.join(__dirname, 'public')));
  // passport user setup
passport.use('local-login', new LocalStrategy(
    // function(username, password, action, done) {
    //     userModel.findOne({ where: { userName: username }}).then(function(user, err) { //findOne() ajax call and nodejs called ajax as promise object
    //         if(action==sign-up) //do sign-up buttom
    //         {
    //             if(err){
    //                 return done(err);
    //             }
    //             if(user){
    //                 return done(null, false, { message: 'username already exist' });
    //             }else{
    //                 return done(null,user);
    //             }

    //         }else{ //do login buttom
    //             if (err) { return done(err); }
    //             if (!user) {
    //                 return done(null, false, { message: 'Incorrect username.' });
    //             }
    //             if (!comparePassword(password, user.password)) {
    //                 return done(null, false, { message: 'Incorrect password.' });
    //             }
    //             return done(null, user);
    //         }
    //     });
    // }
    function(username, password, done) {
        userModel.findOne({ where: { userName: username }}).then(function(user, err) { //findOne() ajax call and nodejs called ajax as promise object
            if (err) { return done(err); }
            if (!user) {
                return done(null, false, { message: 'Incorrect username.' });
            }
            if (!comparePassword(password, user.password)) {
                return done(null, false, { message: 'Incorrect password.' });
            }
            return done(null, user);
        });
    }
));
app.use(session({ secret: 'keyboard cat',resave: true, saveUninitialized:true})); // session secret

app.use(passport.initialize());
app.use(passport.session());



/* Routing */
// Display index.html
app.use('/', userRouter);
app.get('/lobby', function(req, res){
    res.sendFile(__dirname + '/public/lobby.html');
});

app.get('/', function(req, res){
    res.sendFile(__dirname + '/public/index.html');
});
app.post('/', function(req, res, next) {
    passport.authenticate('local-login', {
      successRedirect : '/lobby', // redirect to the secure profile section
      failureRedirect : '/', // redirect back to the signup page if there is an error
      failureFlash : true // allow flash messages
      },function(err, user, info) {
          if (err) { return next(err); }
          if (!user) { return res.redirect(info,'/'); }
          req.logIn(user, function(err) {
              if (err) { return next(err); }
              return res.redirect('/lobby');
          });
    })(req, res, next);
  });
  //session
passport.serializeUser(function(user, done) {
    return done(null, user.id);
});
  
passport.deserializeUser(function(id, done) {
    userModel.findByPk(id).then(function(user, err) {
        return done(err, user);
    });
});

/*Display login.html ok but better using routing method  There is no login.html
app.get('/login', function(req, res){
    res.sendFile(__dirname + '/public/login.html');
});*/
// Display login.html



/* Create database connection */
var pool = mysql.createPool({
    connectionLimit : 100,
    host            : 'localhost',
    user            : 'root',
    password        : 'password',
    database        : 'chatroom'
})


/* Check for server to database connection */
pool.getConnection((err) => {
    if(err){
        console.log('Error connecting to DB.');
    }
    else{
        console.log('Database connection established.');
    }
});

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
    socket.on('disconnect', function(){
        socketCount--;
        console.log('User disconnected');
        console.log('Connected users: ' + socketCount);
        socket.emit('users connected', socketCount);
    });

    // Retrieve messages from DB
    pool.query('SELECT * FROM lobbyChat', (err, result) => {
        if(err){
            console.log('Error selecting messages from DB.');
        }
        else{
            // Iterate over messages obtained from DB and send to client
            for (let index = 0; index < result.length; index++) {
                socket.emit('retrieve messages', result[index]);
            }
        }
    });

    // Store and display messages to connected clients, as well as console
    socket.on('chat message', (msg) => {
        pool.query('INSERT INTO lobbyChat(user, message) VALUE(?,?)', ['user', msg], (err) => {
            if(err){
                console.log('Error inserting message into DB.');
            }
            else{
                console.log('Message from user: ' + msg);
                io.emit('chat message', msg);
            }
        });
    });

    /**
     * Create a new game room and notify the creator of game. 
     */
    socket.on('createGame', function(data){
        var gameID = 'room-' + ++rooms;
        var gameRoom = {gameID: gameID, player1: data.name, player2: '', fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', pgn: ''};
        gameRooms.push(gameRoom);
        console.log(data.name + ' created Game ID: ' + gameRoom.gameID);
        socket.join(gameID);
        socket.emit('newGame', {name: data.name, gameID: gameID, fen: gameRoom.fen});
    });
    
    /**
     * Connect the Player 2 to the room he requested. Show error if room full.
     */
    socket.on('joinGame', function(data){
        var index;
        var gameFound = false;
        for (index = 0; index < gameRooms.length; index++) {
            if(gameRooms[index].gameID == data.room) {
                gameFound = true;
                if(gameRooms[index].player2 != data.name){
                    if(gameRooms[index].player2 == ''){
                        gameRooms[index].player2 = data.name;
                        socket.join(data.room);
                        console.log(data.name + ' has joined room: ' + data.room);
                        socket.broadcast.to(data.room).emit('player1', {name: data.name});
                        socket.emit('player2', {name: data.name, gameID: gameRooms[index].gameID, fen: gameRooms[index].fen});
                    }
                    else {
                        console.log(data.room + ' is full.');
                        socket.emit('err', {message: 'Sorry, The room is full!'});
                    }
                    break;
                }
                else {
                    console.log('You are already in this game.');
                    socket.emit('err', {message: 'You are already in this game.'});
                }
                break;
            }
        }
        if(gameFound == false) {
            console.log('Such game does not exist.');
            socket.emit('err', {message: 'Such game does not exist.'});
        }
    });
    
    /**
     * Handle the turn played by either player and notify the other. 
     */
    socket.on('playTurn', function(data){
        //update gameRoom object with new fen
        var index;
        for (index = 0; index < gameRooms.length; index++) {
            if(gameRooms[index].gameID == data.gameID) {
                gameRooms[index].fen = data.fen;
                break;
            }
        }
        socket.broadcast.to(data.gameID).emit('turnPlayed', data);
    });
    
    /**
     * Notify the players about the victor.
     */
    socket.on('gameEnded', function(data){
        socket.broadcast.to(data.room).emit('gameEnd', data);
    });
});

/* Start server */
server.listen(app.get('port'), function(){
    console.log('Starting server on port ' + app.get('port'));
});

/* End connection with DB */
pool.end




module.exports = app;
