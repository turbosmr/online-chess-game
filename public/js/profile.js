

    $(document).ready(function () {

        //hides dropdown content
        $(".size_chart").hide();

        //unhides first option content
        $("#option1").show();

        //listen to dropdown for change
        $("#size_select").change(function () {
            //rehide content on change
            $('.size_chart').hide();
            //unhides current item
            $('#' + $(this).val()).show();
        });

    });


    var loadDoc = function () {
        $.ajax({
            url: '/search',
            type: 'GET',
            data: { search: $('input')[0].value, },
            success: function (data) {
                let html = '';
                data.users.forEach(user => {
                    html += '<tr> \
                    <td>'+ user.userName + '<span class="dot"></span> </td>\
                    <td><a type="button" href="/game" class="btn btn-success btn-xs">Add Friend</a></td>\
                </tr>';
                });
                $('#search-results').html(html);
            },
            error: function () {
                console.log('error');
            }
        });
    };
