const LocalStrategy = require('passport-local').Strategy;
const bcrypt = require('bcryptjs');

// Load userModel
const User = require('../models').User;

// passport user setup
module.exports = function (passport) {
    passport.use('local-login', new LocalStrategy(
        function (username, password, done) {
            // Match username
            User.findOne({ where: { userName: username } }).then(function (user, err) {
                if (!user) {
                    return done(null, false, { message: 'Username and/or password is incorrect' });
                }
                // Match password
                bcrypt.compare(password, user.password, (err, isMatch) => {
                    if (err) throw err;
                    if (isMatch) {
                        return done(null, user);
                    }
                    else {
                        return done(null, false, { message: 'Username and/or password is incorrect' });
                    }
                });
            });
        }
    ));

    passport.serializeUser(function (user, done) {
        return done(null, user.id);
    });

    passport.deserializeUser(function (id, done) {
        User.findByPk(id).then(function (user) {
            return done(null, user);
        }).catch(function (err) {
            if (err) {
                throw err;
            }
        });
    });
};