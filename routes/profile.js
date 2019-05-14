/* This file handles "/profile" routes */

const express = require('express');
const { ensureAuthenticated, forwardAuthenticated } = require('../config/auth');
const router = express.Router();
const Sequelize = require('sequelize');
const Op = Sequelize.Op;

// Load Games Model
const Game = require('../models').Game;

// Load User Model
const User = require('../models').User;

// Profile page
router.get('/', ensureAuthenticated, function (req, res) {
  User.findOne({ where: { userName: req.user.userName }}).then(function (user, err) {
    req.user.getFriends().then(function(friends){
      res.render('profile', {
        currUser: req.user.userName,
        title: "Profile - Team 10 Chess",
        active: { Profile: true },
        friends: friends,
        boardTheme2D: user.boardTheme2D,
        pieceTheme2D: user.pieceTheme2D
      });
    });
  });
});

router.post('/save', (req, res, next) => {
  User.update({
    boardTheme2D: req.body.boardTheme2D,
    pieceTheme2D: req.body.pieceTheme2D
  }, { where: { userName: req.user.userName } });
  res.redirect('/profile');
});

// Handling a route that does not exist (i.e. /profile/abc123)
router.get('/*', ensureAuthenticated, function (req, res) {
  res.redirect('/profile');
});

module.exports = router;