module.exports = {
  // Prevent a client from accessing a page that requires authentication
  ensureAuthenticated: function (req, res, next) {
    if (req.isAuthenticated()) {
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