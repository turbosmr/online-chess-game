'use strict';
module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.createTable('Game', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      gameId: {
        type: Sequelize.INTEGER
      },
      player1: {
        type: Sequelize.STRING
      },
      player2: {
        type: Sequelize.STRING
      },
      fen: {
        type: Sequelize.STRING
      },
      pgn: {
        type: Sequelize.STRING
      },
      turn: {
        type: Sequelize.STRING
      },
      result: {
        type: Sequelize.STRING
      },
      startTime: {
        type: Sequelize.TIME
      },
      endTime: {
        type: Sequelize.TIME
      },
      moveTimeLimit: {
        type: Sequelize.INTEGER
      },
      gameTimeLimit: {
        type: Sequelize.INTEGER
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE
      }
    });
  },
  down: (queryInterface, Sequelize) => {
    return queryInterface.dropTable('Game');
  }
};