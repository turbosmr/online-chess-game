var express = require('express');
var router = express.Router();
var User = require("../controllers/user");
router.post('/register', User.register);
router.get('/register', function(req, res){
  res.render('register', { message: undefined});
});
router.get('/', function (req, res) {
  res.render('index', { message: undefined });
});

module.exports = router;
