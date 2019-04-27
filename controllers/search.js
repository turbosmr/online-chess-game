const userModel = require('../models/index').User;
exports.search = function (req, res) {
    var body = req.body;
    console.log(body);
    const search = body.search;
    if (search) {
        userModel.findOne({ where: { userName: search } }).then(function (users) {
            if (users) {
                render();
            }
        });
    }
}