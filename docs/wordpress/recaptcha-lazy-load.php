<?php
/**
 * Lazy load reCAPTCHA – ładuj tylko gdy formularz jest widoczny
 * Kadence Blocks Form – reCAPTCHA v2
 * 
 * Instrukcja: INSTRUKCJA_RECAPTCHA_LAZY.md
 */

add_action('wp_enqueue_scripts', function() {
    wp_dequeue_script('kadence-blocks-google-recaptcha-v2-js');
    wp_deregister_script('kadence-blocks-google-recaptcha-v2-js');
}, 100);

add_action('wp_footer', function() {
    if (!is_singular()) return;
    $sitekey = '6Lf7-iQsAAAAAOg0BD0pnMRAnD9G8B3xHUHZn8Sv'; // Kadence – sprawdź w ustawieniach formularza
    ?>
<script>
(function(){
  var loaded=0,sitekey=<?php echo json_encode($sitekey); ?>;
  window.kbOnloadV2Callback=window.kbOnloadV2Callback||function(){
    if(typeof jQuery!=='undefined'&&typeof grecaptcha!=='undefined'){
      jQuery('.wp-block-kadence-form').find('.kadence-blocks-g-recaptcha-v2').each(function(){
        var el=jQuery(this)[0];
        if(el&&!el.getAttribute('data-rendered')){
          try{grecaptcha.render(el.id,{sitekey:sitekey});el.setAttribute('data-rendered','1');}catch(e){}
        }
      });
    }
  };
  function loadRecaptcha(){
    if(loaded)return;
    loaded=1;
    var s=document.createElement('script');
    s.src='https://www.google.com/recaptcha/api.js?render=explicit&onload=kbOnloadV2Callback&ver=3.6.0';
    s.async=1;
    s.defer=1;
    document.body.appendChild(s);
  }
  var form=document.querySelector('.wp-block-kadence-form .kadence-blocks-g-recaptcha-v2');
  if(!form)return;
  var wrapper=form.closest('.wp-block-kadence-form')||form.closest('form');
  if(!wrapper)return;
  if('IntersectionObserver' in window){
    var io=new IntersectionObserver(function(entries){
      if(entries[0].isIntersecting)loadRecaptcha();
    },{rootMargin:'200px'});
    io.observe(wrapper);
  }else{
    var r=wrapper.getBoundingClientRect();
    if(r.top<window.innerHeight+200)loadRecaptcha();
  }
  wrapper.addEventListener('focusin',function(){loadRecaptcha();},{passive:true,once:true});
})();
</script>
    <?php
}, 5);
