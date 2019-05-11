'use strict';
module.exports = (sequelize, DataTypes) => {
  const Friendship = sequelize.define('Friendship', {
    userId: DataTypes.INTEGER,
    friendId: DataTypes.INTEGER
  }, {});
  Friendship.associate = function(models) {
    // associations can be defined here
  };
  return Friendship;
};