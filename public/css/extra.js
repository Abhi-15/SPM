var form = document.querySelectorAll("#form-id");

form.forEach(form => {

	form.addEventListener("click", event => {
        form.submit();
   });

});
