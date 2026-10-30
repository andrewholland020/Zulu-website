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

  // Approved reviews come from the Google Sheet (tick "Approved"); reviews.json is a backup list.
  var REVIEWS_URL = 'https://script.google.com/macros/s/AKfycbw9nKyw6nfvmM7SiD2Kpwv0frjuuS4iXPvE1g2Kh0E2M1L2IKNmK_oNTS2uS-C-bLm_aA/exec';
  var list = document.querySelector('[data-review-list]');
  function getJson(url) {
    return fetch(url, { cache: 'no-store' }).then(function (r) { return r.ok ? r.json() : []; }).catch(function () { return []; });
  }
  if (list && window.fetch) {
    Promise.all([getJson(REVIEWS_URL), getJson('/reviews.json')])
      .then(function (res) { return [].concat(Array.isArray(res[0]) ? res[0] : [], Array.isArray(res[1]) ? res[1] : []); })
      .then(function (items) {
        if (!Array.isArray(items) || !items.length) return;
        var empty = document.querySelector('[data-no-reviews]');
        if (empty) empty.hidden = true;
        items.forEach(function (it) {
          var n = Math.max(1, Math.min(5, parseInt(it.rating, 10) || 5));
          var card = document.createElement('div');
          card.className = 'zl-review';
          var st = document.createElement('span');
          st.setAttribute('aria-label', n + ' out of 5 stars');
          st.style.cssText = 'font-size:20px;letter-spacing:2px;color:#F28C28';
          st.textContent = '★'.repeat(n) + '☆'.repeat(5 - n);
          var tx = document.createElement('p');
          tx.style.cssText = 'margin:0;font-size:15px;line-height:1.65;color:#26313F';
          tx.textContent = '“' + (it.review || '') + '”';
          var foot = document.createElement('div');
          foot.style.cssText = 'margin-top:auto;padding-top:14px;border-top:1px solid #E1E6EE';
          var nm = document.createElement('p');
          nm.style.cssText = 'margin:0;font-weight:700;font-size:15px;color:#0B1F3A';
          nm.textContent = it.name || 'Carrier';
          var meta = document.createElement('p');
          meta.style.cssText = 'margin:2px 0 0;font-size:13px;color:#5B6778';
          meta.textContent = [it.company, it.truck].filter(Boolean).join(' · ') || 'Carrier';
          foot.appendChild(nm); foot.appendChild(meta);
          card.appendChild(st); card.appendChild(tx); card.appendChild(foot);
          list.appendChild(card);
        });
      })
      .catch(function () {});
  }

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
      if (kind === 'review' && REVIEWS_URL) {
        var sheetData = new URLSearchParams();
        sheetData.append('name', form.querySelector('[name="fi-sender-fullName"]').value);
        sheetData.append('company', form.querySelector('[name="fi-text-company"]').value);
        sheetData.append('truck', form.querySelector('[name="fi-select-truckType"]').value);
        sheetData.append('review', form.querySelector('[name="fi-text-review"]').value);
        sheetData.append('rating', String(rating));
        fetch(REVIEWS_URL, { method: 'POST', mode: 'no-cors', body: sheetData }).catch(function () {});
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
