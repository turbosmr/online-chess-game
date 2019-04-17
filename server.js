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
//lobbyChat model
const lobbyChat = require('./models/index').lobbyChat;
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
// Display index.html
app.use('/', userRouter);
app.get('/lobby', function(req, res){
    currUser = req.user.userName
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

    lobbyChat.findAndCountAll().then(function(results,err) {
        if(err)
        {
            console.log('Error selecting messages from DB.');
        }
        else 
        {
            for(var index = 0; index < results.count; index++)
            {
                socket.emit('retrieve messages', results.rows[index]);
            }
        }
    })

    // Store and display messages to connected clients, as well as console
    socket.on('chat message', (msg) => {
        io.emit('chat message', currUser, msg);
    });
});

/* Start server */
server.listen(app.get('port'), function(){
    console.log('Starting server on port ' + app.get('port'));
});

/* End connection with DB */
// pool.end




module.exports = app;
