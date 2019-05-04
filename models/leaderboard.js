'use strict';
module.exports = (sequelize, DataTypes) => {
  const Leaderboard = sequelize.define('Leaderboard', {
    userName: DataTypes.STRING,
    winCount: DataTypes.INTEGER,
    loseCount: DataTypes.INTEGER,
    drawCount: DataTypes.INTEGER
  }, {});
  Leaderboard.associate = function(models) {
    // associations can be defined here
  };
  return Leaderboard;
};