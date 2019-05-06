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

var getCurrGames = function (req, res, next) {
  var currGames = [];

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
        /*User.findOne({
          where: {
            userName: currGames[i].oppName
          }
        }).then(function (result, err) {
          if (err) {
            console.log('Error retrieving user.');
          }
          else {
            if (result.isActive) {
              console.log(currGames[i].oppName)
            }
            else {
              console.log(currGames[i].oppName)
            }
          }
        });*/
      }
      req.currGames = currGames;
    }
    return next();
  });
}

var getAvailGames = function (req, res, next) {
  var availGames = [];

  Game.findAndCountAll({
    where: {
      player2: null,
      result: null
    }
  }).then(function (results, err) {
    if (err) {
      console.log('Error retrieving available games.');
    }
    else {
      for (var i = 0; i < results.count; i++) {
        availGames[i] = results.rows[i];
      }
      req.availGames = availGames;
    }
    return next();
  });

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
          lbTop10[i].rank = i+1;
          lbAll[i] = results.rows[i];
          lbAll[i].rank = i+1;
        }
        else {
          lbAll[i] = results.rows[i];
          lbAll[i].rank = i+1;
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