const express = require('express');
const http = require('http');
const path = require('path');
const socketIO = require('socket.io');
const mysql = require('mysql');
const exphbs = require('express-handlebars');

const app = express();
const server = http.Server(app);
const io = socketIO(server);
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');

//User Router and model for passport
const userRouter = require('./routes/users'); //User routing methods
const userModel = require('./models/index').User;
//lobbyChat model
const lobbyChat = require('./models/index').lobbyChat;
//Session for Login using passport, express-session and bcrypt.js
var session = require("express-session");
const {comparePassword} = require('./lib/bcrypt');
var passport = require('passport')
  , LocalStrategy = require('passport-local').Strategy;


app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.set('port', 8081);
app.use(express.static(path.join(__dirname, 'public')));
  //view engine setup
  app.engine('.hbs', exphbs({extname: '.hbs'}));
  app.set('views', path.join(__dirname, '/public'));
  app.set('view engine', '.hbs');

  // passport user setup
passport.use('local-login', new LocalStrategy(
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

var currUser = "";

/* Routing */
app.use('/', userRouter);
app.get('/', function(req, res){
    res.render('index');
});
app.get('/index', function(req, res){
    res.render('index');
});

app.get('/lobby', function(req, res){
    //currUser = req.user.userName
    res.render('lobby', { user: req.user, message: undefined });
});

app.get('/profile', function(req, res){
    //currUser = req.user.userName
    res.render('profile', { user: req.user, message: undefined });
});

app.get('/register', function(req, res){
    //currUser = req.user.userName
    res.render('register');
});
app.get('/howToPlay', function(req, res){
    //currUser = req.user.userName
    res.render('howToPlay', { user: req.user, message: undefined });
});
app.get('/chessBoard', function(req, res){
    //currUser = req.user.userName
    res.render('chessBoard', { user: req.user, message: undefined });
});
app.get('/about', function(req, res){
    //currUser = req.user.userName
    res.render('about', { user: req.user, message: undefined });
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
    socket.on('chat message', (msg) => {
        io.emit('chat message', currUser, msg);
    });

    /**
     * Create a new game room and notify the creator of game. 
     */
    socket.on('createGame', function(data){
        var gameID = 'room-' + ++rooms;
        var gameRoom = {gameID: gameID, player1: data.name, player2: '', fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', pgn: ''};
        gameRooms.push(gameRoom);
        console.log(data.name + ' created game: ' + gameRoom.gameID);
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
            if(gameRooms[index].gameID == data.gameID) {
                gameFound = true;
                if(gameRooms[index].player2 != data.name){
                    if(gameRooms[index].player2 == ''){
                        gameRooms[index].player2 = data.name;
                        socket.join(data.gameID);
                        console.log(data.name + ' has joined game: ' + data.gameID);
                        socket.broadcast.to(data.gameID).emit('player1', {name: data.name});
                        socket.emit('player2', {name: data.name, gameID: gameRooms[index].gameID, fen: gameRooms[index].fen});
                    }
                    else {
                        console.log(data.gameID + ' is full.');
                        socket.emit('err', {message: 'Sorry, ' + data.gameID + ' is full.'});
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
// pool.end




module.exports = app;
