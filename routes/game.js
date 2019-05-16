/* This file handles "/game" routes */

const express = require('express');
const { ensureAuthenticated } = require('../config/auth');
const router = express.Router();

// Chess game index page
router.get('/', ensureAuthenticated, function (req, res) {
    res.redirect('/lobby');
});

// Chess gameroom page
router.get('/:gameID', ensureAuthenticated, function (req, res) {
    res.render('chessboard', {
        currUser: req.user.userName,
        title: "Game - Team 10 Chess",
        active: { Game: true },
        gameID: req.params.gameID
    });
});

module.exports = router;