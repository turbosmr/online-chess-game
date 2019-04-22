const express = require('express');
const router = express.Router();
const { ensureAuthenticated, forwardAuthenticated } = require('../config/auth');

// Welcome page
router.get('/', forwardAuthenticated, function (req, res) {
  res.render('welcome', {
    title: "Welcome - Team 10 Chess",
    active: { Welcome: true }
  });
});

// Lobby page
router.get('/lobby', ensureAuthenticated, function (req, res) {
  res.render('lobby', {
    username: req.user.userName,
    title: "Lobby - Team 10 Chess",
    active: { Lobby: true }
  })
});

// Chess game page
router.get('/game', ensureAuthenticated, function (req, res) {
  res.render('chessBoard', {
    username: req.user.userName,
    title: "Game - Team 10 Chess",
    active: { Game: true }
  })
});

// Profile page
router.get('/profile', ensureAuthenticated, function (req, res) {
  res.render('profile', {
    username: req.user.userName,
    title: "Profile - Team 10 Chess",
    active: { Profile: true }
  })
});

// How to Play page
router.get('/howToPlay', function (req, res) {
  res.render('howToPlay', {
    username: req.user.userName,
    title: "How to Play - Team 10 Chess",
    active: { HowToPlay: true }
  })
});

// About page
router.get('/about', ensureAuthenticated, function (req, res) {
  res.render('about', {
    username: req.user.userName,
    title: "About - Team 10 Chess",
    active: { About: true }
  })
});

module.exports = router;