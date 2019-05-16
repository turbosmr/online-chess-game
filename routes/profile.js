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
        pieceTheme2D: user.pieceTheme2D,
        pieceTheme3D: user.pieceTheme3D
      });
    });
  });
});

// Save profile settings
router.post('/save', (req, res, next) => {
  User.update({
    boardTheme2D: req.body.boardTheme2D,
    pieceTheme2D: req.body.pieceTheme2D,
    pieceTheme3D: req.body.pieceTheme3D
  }, { where: { userName: req.user.userName } });
  res.redirect('/profile');
});

// Friend search request
router.get('/search', ensureAuthenticated, function (req, res) {
  if (req.xhr || req.accepts('json, html') === 'json') {
    User.findAll({ where: { userName: { [Op.like]: '%' + req.query.search + '%' } } }).then(function (users) {
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

// Add friend
router.post('/addFriend', (req, res, next) => {
  req.user.addFriends(parseInt(req.body.id)).then(function(){
    req.user.getFriends().then(function(friends){
      res.redirect('/profile');
    });
  });
});

// Remove friend
router.post('/removeFriend', (req, res, next) => {
  req.user.removeFriend(parseInt(req.body.id)).then(function(){
    req.user.getFriends().then(function(friends){
      res.redirect('/profile');
    });
  });
});

module.exports = router;