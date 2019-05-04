'use strict';
module.exports = (sequelize, DataTypes) => {
  const Game = sequelize.define('Game', {
    gameId: DataTypes.INTEGER,
    player1: DataTypes.STRING,
    player2: DataTypes.STRING,
    fen: DataTypes.STRING,
    pgn: DataTypes.STRING,
    move: DataTypes.STRING,
    result: DataTypes.STRING,
    startTime: DataTypes.TIME,
    endTime: DataTypes.TIME,
    moveTimeLimit: DataTypes.INTEGER,
    gameTimeLimit: DataTypes.INTEGER
  }, {});
  Game.associate = function(models) {
    // associations can be defined here
  };
  return Game;
};