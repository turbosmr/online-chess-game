// Load Users Model
const User = require('../models').User;

module.exports = {
  // Prevent a client from accessing a page that requires authentication
  ensureAuthenticated: function (req, res, next) {
    if (req.isAuthenticated()) {
      User.findOne({ where: { userName: req.user.userName }}).then(function (user, err) {
        user.update({ isActive: true });
      });
      return next();
    }
    req.flash('error', 'Please log in');
    res.redirect('/users/login');
  },
  // Forward a client if already authenticated
  forwardAuthenticated: function (req, res, next) {
    if (!req.isAuthenticated()) {
      return next();
    }
    res.redirect('/lobby');
  }
};