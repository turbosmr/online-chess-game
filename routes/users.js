var express = require('express');
var router = express.Router();
var User = require("../controllers/user")

router.post('/register', User.register);
router.get('/', function (req, res) {
  res.render('/', { message: undefined });
});
router.get('/', function (req, res) {
  res.render('/', { message: undefined }); //Need to write login and reg page
});
module.exports = router;
