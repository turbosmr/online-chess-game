const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const passport = require('passport');

// Load Users Model
const User = require('../models').User;

const { ensureAuthenticated, forwardAuthenticated } = require('../config/auth');

// Login page
router.get('/login', forwardAuthenticated, function (req, res) {
  res.render('login', {
    title: "Login - Team 10 Chess",
    active: {Login: true}
  });
});

// Register page
router.get('/register', forwardAuthenticated, function (req, res) {
  res.render('register', {
    title: "Register - Team 10 Chess",
    active: {Register: true}
  });
});

// Register handle
router.post('/register', (req, res) => {
  const { username, password, password2 } = req.body;
  let regErrors = [];
  let regSuccess = [];

  // Check required fields
  if (!username || !password || !password2) {
    regErrors.push({ msg: 'Please enter all fields' });
  }
  else {
    // Check password is between 5-10 characters
    if (username.length < 5 || username.length > 10) {
      regErrors.push({ msg: 'Username must be between 5-10 characters' });
    }
    // Check password is between 8-20 characters
    else if (password.length < 8 || password.length > 20) {
      regErrors.push({ msg: 'Password must be between 8-20 characters' });
    }
    // Check passwords match
    else if (password != password2) {
      regErrors.push({ msg: 'Passwords do not match' });
    }
  }

  if (regErrors.length > 0) {
    res.render('register', {
      regErrors,
      username
    });
  }
  else {
    // Validation passed
    // Check if username already exists
    User.findOne({ where: { userName: username } }).then(function (checkUser) {
      if (checkUser) {
        regErrors.push({ msg: 'Account aleady exists' });
        res.render('register', {
          regErrors
        });
      }
      else {
        const newUser = { username: username, password: password };
        bcrypt.genSalt(10, (err, salt) => {
          bcrypt.hash(newUser.password, salt, (err, hash) => {
            newUser.password = hash;
            if (err) throw err;
            newUser.password = hash;
            User.create({ userName: newUser.username, password: newUser.password }).then(function () {
              req.flash('success', 'Successfully registered, please login to play');
              res.redirect('/users/login');
            });
          });
        });
      }
    });
  }
});

// Login handle
router.post('/login', (req, res, next) => {
  passport.authenticate('local-login', {
    successRedirect: '/lobby',
    failureRedirect: '/users/login',
    badRequestMessage: 'Please enter all fields',
    failureFlash: true
  })(req, res, next);
});

// Logout
router.get('/logout', ensureAuthenticated, (req, res) => {
  User.findOne({ where: { userName: req.user.userName }}).then(function (user, err) {
    user.update({ isActive: false });
  });
  
  req.logout();
  req.flash('success', 'You are logged out');
  res.redirect('/users/login');
});

module.exports = router;