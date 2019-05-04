const userModel = require('../models/index').User;

const Op = require('sequelize').Op;
exports.search = function (req, res) {
    userModel.findAll({where: {userName:{[Op.like]: '%'+req.query.search+'%'}}});
};