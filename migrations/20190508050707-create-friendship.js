'use strict';
module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.createTable('Friendships', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      userId: {
        allowNull: false,
<<<<<<< HEAD
        unique: 'compositeIndex',
=======
>>>>>>> f62e99c60a258e1c9049d8dc67ebd2d5c5e2721b
        type: Sequelize.INTEGER
      },
      friendId: {
        allowNull: false,
<<<<<<< HEAD
        unique: 'compositeIndex',
=======
        unique: true,
>>>>>>> f62e99c60a258e1c9049d8dc67ebd2d5c5e2721b
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
    return queryInterface.dropTable('Friendships');
  }
};