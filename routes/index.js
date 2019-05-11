/* This file handles routing except for registration and login */

const express = require('express');
const { ensureAuthenticated, forwardAuthenticated } = require('../config/auth');
const router = express.Router();
const Sequelize = require('sequelize');
const Op = Sequelize.Op;

// Load Games Model
const Game = require('../models').Game;

// Load User Model
const User = require('../models').User;

const Leaderboard = require('../models').Leaderboard;

var getCurrGames = function (req, res, next) {
  var currGames = [],
    now,
    timeRem,
    days,
    hours,
    minutes,
    timeRemFormatted;

  Game.findAndCountAll({
    where: {
      [Op.or]: [{ player1: req.user.userName }, { player2: req.user.userName }],
      [Op.not]: [{ player2: null }],
      result: null
    }
  }).then(function (results, err) {
    if (err) {
      console.log('Error retrieving current games.');
    }
    else {
      for (var i = 0; i < results.count; i++) {
        currGames[i] = results.rows[i];
        if (currGames[i].player1 == req.user.userName) {
          currGames[i].oppName = currGames[i].player2;
        }
        else {
          currGames[i].oppName = currGames[i].player1;
        }
        now = new Date().getTime();
        timeRem = results.rows[i].makeMoveBy - now;
        if (results.rows[i].turns > 0) {
          hours = Math.floor((timeRem / (1000 * 60 * 60)));
          minutes = Math.floor((timeRem % (1000 * 60 * 60)) / (1000 * 60));
          timeRemFormatted = ('0' + hours).slice(-3) + 'h' + ('0' + minutes).slice(-2) + 'm';
        }
        else {
          hours = Math.floor((results.rows[i].moveTimeLimit / (60)));
          minutes = results.rows[i].moveTimeLimit % 60;
          timeRemFormatted = ('0' + hours).slice(-3) + 'h' + ('0' + minutes).slice(-2) + 'm';
        }
        currGames[i].moveTime = timeRemFormatted;
      }
      req.currGames = currGames;
    }
  });

  return next();
}

var getAvailGames = function (req, res, next) {
  var availGames = [],
    days,
    hours,
    minutes,
    timeRemFormatted;

  Game.findAndCountAll({
    where: {
      player2: null,
      result: null
    }
  }).then(function (results, err) {
    console.log('finish get sql');
    if (err) {
      console.log('Error retrieving available games.');
    }
    else {
      for (var i = 0; i < results.count; i++) {
        console.log('looping');
        availGames[i] = results.rows[i];
        hours = Math.floor((results.rows[i].moveTimeLimit / (60)));
        minutes = results.rows[i].moveTimeLimit % 60;
        timeRemFormatted = ('0' + hours).slice(-3) + 'h' + ('0' + minutes).slice(-2) + 'm';
        availGames[i].moveTime = timeRemFormatted;
      }
      console.log('end of loop');
      req.availGames = availGames;
    }
  });
  return next();
}

var getLeaderboard = function (req, res, next) {
  var lbTop10 = [];
  var lbAll = [];

  User.findAndCountAll({
    order: [
      ['winCount', 'DESC'],
      ['loseCount', 'ASC'],
      ['drawCount', 'DESC']
    ]
  }).then(function (results, err) {
    if (err) {
      console.log('Error retrieving leaderboard.');
      return next();
    }
    else {
      for (var i = 0; i < results.count; i++) {
        if (i < 10) {
          lbTop10[i] = results.rows[i];
          lbTop10[i].rank = i + 1;
          lbAll[i] = results.rows[i];
          lbAll[i].rank = i + 1;
        }
        else {
          lbAll[i] = results.rows[i];
          lbAll[i].rank = i + 1;
        }
      }
      req.lbTop10 = lbTop10;
      req.lbAll = lbAll;
      return next();
    }
  });
}

// Welcome page
router.get('/', forwardAuthenticated, function (req, res) {
  res.render('welcome', {
    title: "Welcome - Team 10 Chess",
    active: { Welcome: true }
  });
});

// Lobby page
router.get('/lobby', ensureAuthenticated, getCurrGames, getAvailGames, getLeaderboard, function (req, res) {
  res.render('lobby', {
    currUser: req.user.userName,
    title: "Lobby - Team 10 Chess",
    active: { Lobby: true },
    currGames: req.currGames,
    availGames: req.availGames,
    lbTop10: req.lbTop10,
    lbAll: req.lbAll
  });
});

//search request searchController.search do the function callback at search controller
router.get('/search', ensureAuthenticated, function (req, res) {
  if (req.xhr || req.accepts('json, html') === 'json') {
    User.findAll({ where: { userName: { [Op.like]: '%' + req.query.search + '%' } } }).then(function (users) {
      console.log('users = ', users);
      if (users) {
        res.send({ users: users });
      } else {
        res.send({ users: undefined });
      }
    });

  } else {
    //Do something else by reloading the page.
    console.log('not ajax byebye');
    res.send({ users: undefined });
  }
});

// Profile page
router.get('/profile', ensureAuthenticated, function (req, res) {
  req.user.getFriends().then(function(friends){
    res.render('profile', {
      currUser: req.user.userName,
      title: "Profile - Team 10 Chess",
      active: { Profile: true },
      friends: friends
    });
  });
});

// How to Play page
router.get('/howToPlay', ensureAuthenticated, function (req, res) {
  res.render('howToPlay', {
    currUser: req.user.userName,
    title: "How to Play - Team 10 Chess",
    active: { HowToPlay: true }
  });
});

// About page
router.get('/about', ensureAuthenticated, function (req, res) {
  res.render('about', {
    currUser: req.user.userName,
    title: "About - Team 10 Chess",
    active: { About: true }
  });
});

router.post('/addFriend', (req, res, next) => {
  req.user.addFriends(parseInt(req.body.id)).then(function(){
    req.user.getFriends().then(function(friends){
      res.redirect('/profile');
    });
  });
});

router.post('/removeFriend', (req, res, next) => {
  req.user.removeFriend(parseInt(req.body.id)).then(function(){
    req.user.getFriends().then(function(friends){
      res.redirect('/profile');
    });
  });
});
// About page
router.get('/3d', ensureAuthenticated, function (req, res) {
  res.render('chess3D', {
    currUser: req.user.userName,
    title: "About - Team 10 Chess",
    active: { chess3D: true }
  });
});

module.exports = router;