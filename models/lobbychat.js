'use strict';
module.exports = (sequelize, DataTypes) => {
  const lobbyChat = sequelize.define('lobbyChat', {
    username: DataTypes.STRING,
    message: DataTypes.STRING
  }, {});
  lobbyChat.associate = function(models) {
    // associations can be defined here
  };
  return lobbyChat;
};