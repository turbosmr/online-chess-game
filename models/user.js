'use strict';
module.exports = (sequelize, DataTypes) => {
  const User = sequelize.define('User', {
    userName: {
      type: DataTypes.STRING,
      allowNull: false
    },
    password: {
      type: DataTypes.STRING,
      allowNull: false
    },
    winCount: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    loseCount: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    drawCount: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    rating: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1200
    },
    isActive: DataTypes.BOOLEAN,
    boardTheme2D: {
      type: DataTypes.STRING,
      defaultValue: 'default_board_theme'
    },
    pieceTheme2D: {
      type: DataTypes.STRING,
      defaultValue: 'wikipedia_piece_theme'
    }
  }, {});
  User.associate = function(models) {
    // associations can be defined here
    User.belongsToMany(User, {as: 'Friends', through: models.Friendship});
  };
  return User;
};