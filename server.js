const express = require('express');
const http = require('http');
const path = require('path');
const socketIO = require('socket.io');
const mysql = require('mysql')

const app = express();
const server = http.Server(app);
const io = socketIO(server);

//User Router and model for passport
const userRouter = require('./routes/users');
const userModel = require('./models/index').User;
//Session for Login using passport, express-session and bcrypt. bcrypt defined within lib bcrypt.js
var session = require("express-session");
const {comparePassword} = require('./lib/bcrypt');
var passport = require('passport')
  , LocalStrategy = require('passport-local').Strategy;

app.set('port', 8081);
app.use(express.static(path.join(__dirname, 'public')));

/* Routing */
// Display index.html
app.get('/', function(req, res){
    res.sendFile(__dirname + '/public/index.html');
});``

// Display login.html ok but better using routing method
app.get('/login', function(req, res){
    res.sendFile(__dirname + '/public/login.html');
});
// Display login.html
app.get('/lobby', function(req, res){
    res.sendFile(__dirname + '/public/lobby.html');
});

/*login using passport in here */
app.use(express.static("public"));
app.use(session({ secret: "cats" }));
app.use(passport.initialize());
app.use(passport.session());
app.post('/login',
  passport.authenticate('local', { successRedirect: '/',
                                   failureRedirect: '/login',
                                   failureFlash: 'Invalid username or password.',
                                   successFlash: 'Welcome!' }));
//passport user setup
passport.use(new LocalStrategy(
    function(username, password, done) {
      console.log(userModel);
      userModel.findOne({ userName: username }, function (err, user) {
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
  passport.serializeUser(function(user, done) {
      done(null, user.id);
  });
    
  passport.deserializeUser(function(id, done) {
      userModel.findById(id, function(err, user) {
        done(err, user);
      });
  });


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
});

/* Start server */
server.listen(app.get('port'), function(){
    console.log('Starting server on port ' + app.get('port'));
});

/* End connection with DB */
pool.end




module.exports = app;
