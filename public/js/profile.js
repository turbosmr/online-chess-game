var loadDoc = function() {
  $.ajax({
    url: "/search",
    type: "GET",
    data: { search: $("input")[0].value },
    success: function(data) {
      let html = "";
      data.users.forEach(user => {
        html +=
          "<tr> \
                    <td>" +
          user.userName +
          '<span class="dot"></span> </td>\
                    <td><a type="button" href="/game" class="btn btn-success btn-xs">Add Friend</a></td>\
                </tr>';
      });
      $("#search-results").html(html);
    },
    error: function() {
      console.log("error");
    }
  });
};
