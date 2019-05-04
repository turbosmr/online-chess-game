'use strict';
module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.removeColumn('', '');
  },
  down: (queryInterface, Sequelize) => {
    return queryInterface.dropTable('');
  }
};