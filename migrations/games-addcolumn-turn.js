'use strict';
module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.dropTable('Games');
  },
  down: (queryInterface, Sequelize) => {
    return queryInterface.dropTable('Games');
  }
};