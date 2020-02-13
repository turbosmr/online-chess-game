$(function () {
  document.getElementById(boardTheme2D).selected = "true";
  document.getElementById(pieceTheme2D).selected = "true";
  document.getElementById(pieceTheme3D).selected = "true";

  //hides dropdown content
  $(".boardTheme2D_img").hide();
  $(".pieceTheme2D_img").hide();
  $(".pieceTheme3D_img").hide();
  //unhides first option content
  $("." + boardTheme2D).show();
  $("." + pieceTheme2D).show();
  $("." + pieceTheme3D).show();

  //listen to dropdown for change
  $(".boardTheme2D_option").change(function () {
      //rehide content on change
      $('.boardTheme2D_img').hide();
      //unhides current item
      $('.' + $(this).val()).show();
  });
  $(".pieceTheme2D_option").change(function () {
      //rehide content on change
      $('.pieceTheme2D_img').hide();
      //unhides current item
      $('.' + $(this).val()).show();
  });
  $(".pieceTheme3D_option").change(function () {
      //rehide content on change
      $('.pieceTheme3D_img').hide();
      //unhides current item
      $('.' + $(this).val()).show();
  });
})

$('#saveProfile').on('click', function () {
  var boardTheme2D = $(".boardTheme2D_option option:selected").val();
  var pieceTheme2D = $(".pieceTheme2D_option option:selected").val();
  var pieceTheme3D = $(".pieceTheme3D_option option:selected").val();
  
  $.ajax({
    url: '/profile/save',
    type: 'POST',
    data: { boardTheme2D: boardTheme2D, pieceTheme2D: pieceTheme2D, pieceTheme3D: pieceTheme3D },
    success: function () {
      location.replace("/profile");
    }
  });
});

var loadDoc = function () {
  $.ajax({
      url: '/profile/search',
      type: 'GET',
      data: { search: $('input')[0].value, },
      success: function (data) {
          let html = '';
          html += '<div class="well friendsSearchScroll">'
          if (data.users.length == 0) {
            html += 'No users found.\
                    </div>';
          }
          else {
            html += '<table class="table">\
                      <tbody>';
            data.users.forEach(user => {
                html += '<tr>\
                          <td class="col-xs-3">'+ user.userName + '</td>\
                          <td class="col-xs-3"></td>\
                          <td class="col-xs-3"></td>\
                          <td class="col-xs-3"><form action="/profile/addFriend" method="POST"><input type="hidden" name="id" value="'+ user.id + '">\
                            <button type="submit" class="btn btn-success btn-xs pull-right">Add</button>\
                            </form></td>\
                          </tr>';
            });
            html += '   </tbody>\
                      </table>\
                    </div>'
          }
          $('#search-results').html(html);
      },
      error: function () {
          console.log('error');
      }
  });
};

/**
 * Create a new game.
 */
$('#new').on('click', function () {
  if ($('#moveTimeLimit').val()) {
      $('#new').attr("data-dismiss", "modal");
      var moveTimeLimit = $("#moveTimeLimit option:selected").val();
      socket.emit('createGame', { player1: currUser, moveTimeLimit: moveTimeLimit });
  }
  else {
      alert('Please select a move time limit.');
  }
});

var socket = io();

socket.on('newGame', function (data) {
  document.location.replace("/game/" + data.gameID);
});