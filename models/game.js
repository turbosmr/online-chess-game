'use strict';
module.exports = (sequelize, DataTypes) => {
  const Game = sequelize.define('Game', {
    gameId: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    player1: {
      type: DataTypes.STRING,
      allowNull: false
    },
    player2: DataTypes.STRING,
    fen: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'
    },
    pgn: DataTypes.STRING,
    turns: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    move: {
      type: DataTypes.STRING,
      allowNull: false
    },
    result: DataTypes.STRING,
    startTime: DataTypes.TIME,
    endTime: DataTypes.TIME,
    moveTimeLimit: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    makeMoveBy: DataTypes.DOUBLE,
    gameTimeLimit: DataTypes.INTEGER
  }, {});
  Game.associate = function(models) {
    // associations can be defined here
  };
  return Game;
};