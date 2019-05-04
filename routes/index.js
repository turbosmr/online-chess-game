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

var findCurrGames = function (req, res, next) {
  var currGames = [];

  Game.findAndCountAll({
    where: {
      [Op.or]: [{ player1: req.user.userName }, { player2: req.user.userName }],
      [Op.not]: [{ player2: null }],
      result: null
    }
  }).then(function (results, err) {
    if (!results) {
      console.log('Error finding current games.');
      return next();
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
      }
      req.currGames = currGames;
      return next();
    }
  });
}

var findAvailGames = function (req, res, next) {
  var availGames = [];

  Game.findAndCountAll({
    where: {
      player2: null,
      result: null
    }
  }).then(function (results, err) {
    if (err) {
      console.log('Error finding available games.');
      return next();
    }
    else {
      for (var i = 0; i < results.count; i++) {
        availGames[i] = results.rows[i];
      }
      req.availGames = availGames;
      return next();
    }
  });
}

const leaderboardModel = require('../models').Leaderboard;

var top10 = [];
var rankings = [];

//get top 10
leaderboardModel.findAndCountAll({
  order: [
    ['winCount','DESC']
  ]
}).then(function(results,err) {
  if(err)
  {
      console.log('Error selecting messages from DB.');
  }
  else 
  {
    for(var i = 0; i < results.count; i++)
    {
      if(i < 10)
      {
        top10[i] = results.rows[i];
        rankings[i] = results.rows[i];
      }
      else
      {
        rankings[i] = results.rows[i];
      }
    }
  }
});

// Welcome page
router.get('/', forwardAuthenticated, function (req, res) {
  res.render('welcome', {
    title: "Welcome - Team 10 Chess",
    active: { Welcome: true }
  });
});

// Lobby page
router.get('/lobby', ensureAuthenticated, findCurrGames, findAvailGames, function (req, res) {
  res.render('lobby', {
    currUser: req.user.userName,
    title: "Lobby - Team 10 Chess",
    active: { Lobby: true },
    currGames: req.currGames,
    availGames: req.availGames
  });
});

// Profile page
router.get('/profile', ensureAuthenticated, function (req, res) {
  res.render('profile', {
    currUser: req.user.userName,
    title: "Profile - Team 10 Chess",
    active: { Profile: true }
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

module.exports = router;