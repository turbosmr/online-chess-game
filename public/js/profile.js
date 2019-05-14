$('#saveProfile').on('click', function () {
  var boardTheme2D = $("#boardTheme2D_option option:selected").val();
  var pieceTheme2D = $("#pieceTheme2D_option option:selected").val();
  
  $.ajax({
    url: '/profile/save',
    type: 'POST',
    data: { boardTheme2D: boardTheme2D, pieceTheme2D: pieceTheme2D },
    success: function () {
      location.replace("/profile");
    }
  });
});