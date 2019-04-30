/* This file handles routing except for registration and login */

const express = require('express');
const router = express.Router();
const { ensureAuthenticated, forwardAuthenticated } = require('../config/auth');
const userModel = require('../models/index').User;
const Op = require('sequelize').Op;

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
    loggedUser: req.user.userName,
    title: "Lobby - Team 10 Chess",
    active: { Lobby: true }
  })
});

// Chess game page
router.get('/game', ensureAuthenticated, function (req, res) {
  res.render('chessBoard', {
    loggedUser: req.user.userName,
    title: "Game - Team 10 Chess",
    active: { Game: true }
  })
});


//search request searchController.search do the function callback at search controller
router.get('/search', ensureAuthenticated, function(req, res){
  if(req.xhr || req.accepts('json, html')==='json'){
    userModel.findAll({where: {userName:{[Op.like]: '%'+req.query.search+'%'}}}).then(function(users){
      console.log('users = ', users);
      if (users){
        res.send({users: users});
      } else {
        res.send({users: undefined});
      }
    });
    
  } else {
    //Do something else by reloading the page.
    console.log('not ajax byebye');
    res.send({users: undefined});
  }
});
// Profile page
router.get('/profile', ensureAuthenticated, function (req, res) {
  res.render('profile', {
    loggedUser: req.user.userName,
    title: "Profile - Team 10 Chess",
    active: { Profile: true }
  })
});

// How to Play page
router.get('/howToPlay', function (req, res) {
  res.render('howToPlay', {
    loggedUser: req.user.userName,
    title: "How to Play - Team 10 Chess",
    active: { HowToPlay: true }
  })
});

// About page
router.get('/about', function (req, res) {
  res.render('about', {
    loggedUser: req.user.userName,
    title: "About - Team 10 Chess",
    active: { About: true }
  })
});

module.exports = router;