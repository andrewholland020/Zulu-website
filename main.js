(function () {
  var header = document.querySelector('.zl-header');
  var menuBtn = document.querySelector('.zl-menu-btn');
  var lastY = window.scrollY || 0;
  function toneUnderHeader() {
    if (!header || !document.elementsFromPoint) return false;
    var y = Math.max(4, Math.min(header.offsetHeight, 90) - 8);
    var stack = document.elementsFromPoint(Math.round(window.innerWidth / 2), y);
    var el = null;
    for (var i = 0; i < stack.length; i++) { if (!header.contains(stack[i])) { el = stack[i]; break; } }
    while (el && el !== document.documentElement) {
      var m = getComputedStyle(el).backgroundColor.match(/[\d.]+/g);
      if (m && (m[3] === undefined || +m[3] > 0.5)) {
        return (0.2126 * m[0] + 0.7152 * m[1] + 0.0722 * m[2]) > 150;
      }
      el = el.parentElement;
    }
    return true;
  }
  function onScroll() {
    if (!header) return;
    var y = window.scrollY || 0;
    var open = header.classList.contains('menu-open');
    if (y <= 240 || y < lastY - 4 || open) header.classList.remove('is-hidden');
    else if (y > lastY + 4) header.classList.add('is-hidden');
    lastY = y;
    header.classList.toggle('on-light', toneUnderHeader());
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);
  setTimeout(onScroll, 50);
  if (menuBtn) menuBtn.addEventListener('click', function () {
    var open = header.classList.toggle('menu-open');
    menuBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
  });
  document.querySelectorAll('.zl-nav-links a').forEach(function (a) {
    a.addEventListener('click', function () { header.classList.remove('menu-open'); if (menuBtn) menuBtn.setAttribute('aria-expanded', 'false'); });
  });

  // Star rating
  var rating = 0;
  var stars = document.querySelectorAll('.zl-star');
  stars.forEach(function (b) {
    b.addEventListener('click', function () {
      rating = +b.getAttribute('data-star');
      stars.forEach(function (s) {
        var n = +s.getAttribute('data-star');
        s.classList.toggle('on', n <= rating);
        s.setAttribute('aria-checked', n === rating ? 'true' : 'false');
      });
      var err = document.querySelector('[data-rating-error]');
      if (err) err.hidden = true;
    });
  });

  // Forms. FORM_ENDPOINT is set when a form service is connected.
  var FORM_ENDPOINT = 'https://forminit.com/f/ady9nm3w3sw';
  document.querySelectorAll('form.zl-form').forEach(function (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var kind = form.getAttribute('data-form');
      if (kind === 'review' && !rating) {
        var err = form.querySelector('[data-rating-error]');
        if (err) err.hidden = false;
        return;
      }
      var data = new FormData(form);
      data.append('fi-text-formType', kind === 'quote' ? 'Get a Quote' : kind === 'contact' ? 'Contact Us' : 'Carrier Review');
      if (kind === 'review') data.append('fi-rating-rating', String(rating));
      // drop empty file inputs so the request stays small
      data.getAll('fi-file-documents[]').forEach(function (f) { if (f && f.size === 0) data.delete('fi-file-documents[]'); });
      var btn = form.querySelector('button[type="submit"]');
      function done() {
        var ok = form.querySelector('[data-success]');
        if (ok) { ok.hidden = false; ok.scrollIntoView({ behavior: 'smooth', block: 'center' }); }
        form.reset();
        if (kind === 'review') { rating = 0; stars.forEach(function (s) { s.classList.remove('on'); s.setAttribute('aria-checked', 'false'); }); }
        if (btn) btn.disabled = false;
      }
      if (!FORM_ENDPOINT) { done(); return; }
      if (btn) btn.disabled = true;
      fetch(FORM_ENDPOINT, { method: 'POST', body: data })
        .then(function (r) { return r.json().catch(function () { return {}; }).then(function (j) { if (!r.ok || j.success === false) throw new Error(j.message || 'send failed'); done(); }); })
        .catch(function () {
          if (btn) btn.disabled = false;
          alert('Sorry, your message could not be sent. Please call 510-996-4492 or email info@zululogisticshub.com.');
        });
    });
  });
})();
