const userModel = require('../models/index').User;
//bcrypt lib 
const {encrypt} = require('../lib/bcrypt');
exports.register = function(req, res) {
  // res.send('NOT IMPLEMENTED: Book update GET');
  var body = req.body;
  const username = body.username;
  const password = body.password;
  if (body.password != body.confirmPassword) {
    res.status(400).render('sign-up', { message: 'Password not match' });
  } else if (username && password) { //check username and password is not null
    userModel.findOne({ where: { userName: username }}).then(function(checkUser) {
      if (checkUser) {
        res.status(400).render('sign-up', { message: 'User name has been used' });
      } else {
        encrypt(password).then(function(saltPassword) { 
          userModel.create({userName: body.username, password: saltPassword });
          res.status(200).render('login', { message: 'You have been registered. Please login.' });
        });
      }
    });
  } else {
    res.status(400).render('sign-up', { message: 'UserName or password cannot be empty' });
  }
};
