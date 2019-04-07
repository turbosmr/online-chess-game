var express = require('express');
var http = require('http');
var path = require('path');
var socketIO = require('socket.io');
var mysql = require('mysql')

var app = express();
var server = http.Server(app);
var io = socketIO(server);

app.set('port', 8081);
app.use(express.static(path.join(__dirname, 'public')));

/* Routing */
// Display index.html
app.get('/', function(req, res){
    res.sendFile(__dirname + '/public/index.html');
});``

// Display login.html
app.get('/login', function(req, res){
    res.sendFile(__dirname + '/public/login.html');
});
// Display login.html
app.get('/lobby', function(req, res){
    res.sendFile(__dirname + '/public/lobby.html');
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