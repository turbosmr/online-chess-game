'use strict';
module.exports = (sequelize, DataTypes) => {
  const User = sequelize.define('User', {
    userId: DataTypes.INTEGER,
    userName: DataTypes.STRING,
    password: DataTypes.STRING,
    winCount: DataTypes.INTEGER,
    loseCount: DataTypes.INTEGER,
    drawCount: DataTypes.INTEGER,
    rating: DataTypes.DOUBLE,
    isActive: DataTypes.BOOLEAN
  }, {});
  User.associate = function(models) {
    // associations can be defined here
  };
  return User;
};