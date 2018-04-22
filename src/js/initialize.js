export default function() {
  $('.h-subtitle').show();
  $('.typed-subtitle').typed({
    stringsElement: $('.typing-subtitle'),
    loop: true
  });
  $('.typed-bread').typed({
    stringsElement: $('.typing-bread'),
    showCursor: false
  });
  setTimeout(function() {
    $(".h-title").removeClass("glitch-effect");
  }, 1500);
}
