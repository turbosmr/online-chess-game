'use strict';
module.exports = (sequelize, DataTypes) => {
  const GameChats = sequelize.define('GameChats', {
    gameId: DataTypes.INTEGER,
    userName: DataTypes.STRING,
    message: DataTypes.STRING
  }, {});
  GameChats.associate = function(models) {
    // associations can be defined here
  };
  return GameChats;
};