(function () {
  var SHEET_URL = 'https://script.google.com/macros/s/AKfycbw9nKyw6nfvmM7SiD2Kpwv0frjuuS4iXPvE1g2Kh0E2M1L2IKNmK_oNTS2uS-C-bLm_aA/exec';
  var FORM_ENDPOINT = 'https://forminit.com/f/ady9nm3w3sw';

  // ---------- Header: hide on scroll down, show on scroll up, mobile menu ----------
  var header = document.querySelector('.zl-header');
  var menuBtn = document.querySelector('.zl-menu-btn');
  var lastY = window.scrollY || 0;
  function onScroll() {
    if (!header) return;
    var y = window.scrollY || 0;
    var open = header.classList.contains('menu-open');
    if (y <= 240 || y < lastY - 4 || open) header.classList.remove('is-hidden');
    else if (y > lastY + 4) header.classList.add('is-hidden');
    header.classList.toggle('is-scrolled', y > 20);
    lastY = y;
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
  if (menuBtn) menuBtn.addEventListener('click', function () {
    var open = header.classList.toggle('menu-open');
    menuBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
  });
  document.querySelectorAll('.zl-nav-links a').forEach(function (a) {
    a.addEventListener('click', function () { header.classList.remove('menu-open'); if (menuBtn) menuBtn.setAttribute('aria-expanded', 'false'); });
  });

  // ---------- Helpers ----------
  function el(tag, css, text) {
    var e = document.createElement(tag);
    if (css) e.style.cssText = css;
    if (text != null) e.textContent = text;
    return e;
  }
  function getJson(url) {
    return fetch(url, { cache: 'no-store' })
      .then(function (r) { return r.ok ? r.json() : null; })
      .catch(function () { return null; });
  }
  function cacheGet(key) {
    try { var v = JSON.parse(localStorage.getItem(key) || 'null'); return Array.isArray(v) ? v : null; } catch (e) { return null; }
  }
  function cacheSet(key, v) {
    try { localStorage.setItem(key, JSON.stringify(v)); } catch (e) {}
  }
  function safeUrl(u) {
    u = String(u || '').trim();
    return /^https:\/\//i.test(u) ? u : '';
  }
  function fmtDate(d) {
    var t = new Date(d);
    if (isNaN(t)) return '';
    return t.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  }

  // ---------- Star rating (review form) ----------
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

  // ---------- Approved reviews (Google Sheet), shown instantly from cache ----------
  var list = document.querySelector('[data-review-list]');
  var emptyReviews = document.querySelector('[data-no-reviews]');
  function reviewCard(it) {
    var n = Math.max(1, Math.min(5, parseInt(it.rating, 10) || 5));
    var card = el('div'); card.className = 'zl-review';
    var st = el('span', 'font-size:20px;letter-spacing:2px;color:#F28C28', '★'.repeat(n) + '☆'.repeat(5 - n));
    st.setAttribute('aria-label', n + ' out of 5 stars');
    var foot = el('div', 'margin-top:auto;padding-top:14px;border-top:1px solid #E1E6EE');
    foot.appendChild(el('p', 'margin:0;font-weight:700;font-size:15px;color:#0B1F3A', it.name || 'Carrier'));
    foot.appendChild(el('p', 'margin:2px 0 0;font-size:13px;color:#5B6778', [it.company, it.truck].filter(Boolean).join(' · ') || 'Carrier'));
    card.appendChild(st);
    card.appendChild(el('p', 'margin:0;font-size:15px;line-height:1.65;color:#26313F', '“' + (it.review || '') + '”'));
    card.appendChild(foot);
    return card;
  }
  function renderReviews(items, final) {
    if (!list) return;
    if (!items.length && !final) return; // keep the loading placeholders until we know
    list.innerHTML = '';
    items.forEach(function (it) { list.appendChild(reviewCard(it)); });
    if (emptyReviews) emptyReviews.hidden = items.length > 0;
  }
  if (list && window.fetch) {
    var cachedReviews = cacheGet('zl-reviews');
    if (cachedReviews) renderReviews(cachedReviews, true);
    Promise.all([getJson(SHEET_URL), getJson('/reviews.json')]).then(function (res) {
      if (res[0] === null && cachedReviews) return; // sheet unreachable: keep what we showed
      var items = [].concat(Array.isArray(res[0]) ? res[0] : [], Array.isArray(res[1]) ? res[1] : []);
      cacheSet('zl-reviews', items);
      renderReviews(items, true);
    });
  }

  // ---------- Blog & News (Google Sheet "Posts", tick "Published") ----------
  var blogList = document.querySelector('[data-blog-list]');
  var blogPost = document.querySelector('[data-blog-post]');
  var blogEmpty = document.querySelector('[data-blog-empty]');
  var blogTabs = document.querySelectorAll('[data-blog-filter]');
  var blogFilter = 'All';
  var posts = [];
  var DEFAULT_IMG = '/hero-dry-van.jpg';
  function postCard(p) {
    var a = el('a'); a.className = 'zl-post-card'; a.href = '/blog?post=' + encodeURIComponent(p.id);
    var img = el('img'); img.className = 'zl-post-img'; img.alt = ''; img.loading = 'lazy'; img.src = safeUrl(p.image) || DEFAULT_IMG;
    img.onerror = function () { img.onerror = null; img.src = DEFAULT_IMG; };
    var body = el('div', 'padding:20px 22px 24px;display:flex;flex-direction:column;gap:10px;flex:1');
    var meta = el('div', 'display:flex;gap:10px;align-items:center;flex-wrap:wrap');
    var tag = el('span', '', p.category || 'Blog'); tag.className = 'zl-post-tag' + ((p.category || '').toLowerCase() === 'news' ? ' is-news' : '');
    meta.appendChild(tag);
    meta.appendChild(el('span', 'font-size:13px;color:#5B6778', fmtDate(p.date)));
    body.appendChild(meta);
    body.appendChild(el('h3', "margin:0;font-family:'Montserrat',sans-serif;font-weight:700;font-size:19px;line-height:1.35;color:#0B1F3A", p.title || ''));
    body.appendChild(el('p', 'margin:0;font-size:15px;line-height:1.6;color:#3D4A5C', p.summary || ''));
    body.appendChild(el('span', 'margin-top:auto;font-weight:600;font-size:15px;color:#B45F12', 'Read more →'));
    a.appendChild(img); a.appendChild(body);
    return a;
  }
  function renderBlogList(final) {
    if (!blogList) return;
    var shown = posts.filter(function (p) { return blogFilter === 'All' || (p.category || 'Blog').toLowerCase() === blogFilter.toLowerCase(); });
    if (!shown.length && !final) return;
    blogList.innerHTML = '';
    shown.forEach(function (p) { blogList.appendChild(postCard(p)); });
    if (blogEmpty) blogEmpty.hidden = shown.length > 0;
  }
  function renderPost(id, final) {
    var p = posts.filter(function (x) { return String(x.id) === String(id); })[0];
    if (!p) {
      if (!final) return;
      blogPost.innerHTML = '';
      blogPost.appendChild(el('p', 'margin:0 0 18px;font-size:18px;color:#3D4A5C', 'Sorry, this post could not be found.'));
      var back0 = el('a', 'font-weight:600;color:#B45F12', '← Back to Blog & News'); back0.href = '/blog';
      blogPost.appendChild(back0);
      return;
    }
    document.title = (p.title || 'Blog') + ' | Zulu Logistics';
    blogPost.innerHTML = '';
    var back = el('a', 'display:inline-block;margin-bottom:22px;font-weight:600;color:#B45F12;text-decoration:none', '← Back to Blog & News'); back.href = '/blog';
    blogPost.appendChild(back);
    var meta = el('div', 'display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin-bottom:12px');
    var tag = el('span', '', p.category || 'Blog'); tag.className = 'zl-post-tag' + ((p.category || '').toLowerCase() === 'news' ? ' is-news' : '');
    meta.appendChild(tag); meta.appendChild(el('span', 'font-size:14px;color:#5B6778', fmtDate(p.date)));
    blogPost.appendChild(meta);
    blogPost.appendChild(el('h1', "margin:0 0 22px;font-family:'Montserrat',sans-serif;font-weight:700;font-size:clamp(28px,4vw,40px);line-height:1.2;letter-spacing:-.5px;color:#0B1F3A", p.title || ''));
    var img = safeUrl(p.image);
    if (img) {
      var im = el('img', 'width:100%;max-height:440px;object-fit:cover;border-radius:16px;display:block;margin-bottom:26px'); im.alt = ''; im.src = img;
      im.onerror = function () { im.remove(); };
      blogPost.appendChild(im);
    }
    String(p.content || p.summary || '').split(/\n\s*\n|\r\n\s*\r\n/).forEach(function (para) {
      para = para.trim();
      if (!para) return;
      blogPost.appendChild(el('p', 'margin:0 0 18px;font-size:17px;line-height:1.8;color:#26313F;white-space:pre-line', para));
    });
    var cta = el('div', 'margin-top:32px;padding:24px;border-radius:16px;background:#0B1F3A;color:#FFFFFF;display:flex;flex-wrap:wrap;gap:16px;align-items:center;justify-content:space-between');
    cta.appendChild(el('p', "margin:0;font-family:'Montserrat',sans-serif;font-weight:600;font-size:18px", 'Ready to keep your truck loaded?'));
    var btn = el('a', '', 'Get a Quote'); btn.className = 'zl-btn zl-btn-primary'; btn.href = '/#quote';
    cta.appendChild(btn);
    blogPost.appendChild(cta);
  }
  var postId = new URLSearchParams(location.search).get('post');
  if ((blogList || blogPost) && window.fetch) {
    if (postId && blogPost) {
      var listWrap = document.querySelector('[data-blog-list-wrap]');
      if (listWrap) listWrap.hidden = true;
      blogPost.hidden = false;
    }
    var cachedPosts = cacheGet('zl-posts');
    if (cachedPosts) { posts = cachedPosts; postId ? renderPost(postId, false) : renderBlogList(true); }
    getJson(SHEET_URL + '?type=posts').then(function (res) {
      if (res === null && cachedPosts) return;
      posts = (Array.isArray(res) ? res : []).filter(function (x) { return x && x.title && x.id; });
      cacheSet('zl-posts', posts);
      postId ? renderPost(postId, true) : renderBlogList(true);
    });
    blogTabs.forEach(function (t) {
      t.addEventListener('click', function () {
        blogFilter = t.getAttribute('data-blog-filter');
        blogTabs.forEach(function (x) { x.setAttribute('aria-pressed', x === t ? 'true' : 'false'); });
        renderBlogList(true);
      });
    });
  }

  // ---------- Forms (Forminit) + reviews to the Google Sheet ----------
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
      data.getAll('fi-file-documents[]').forEach(function (f) { if (f && f.size === 0) data.delete('fi-file-documents[]'); });
      var btn = form.querySelector('button[type="submit"]');
      function done() {
        var ok = form.querySelector('[data-success]');
        if (ok) { ok.hidden = false; ok.scrollIntoView({ behavior: 'smooth', block: 'center' }); }
        form.reset();
        if (kind === 'review') { rating = 0; stars.forEach(function (s) { s.classList.remove('on'); s.setAttribute('aria-checked', 'false'); }); }
        if (btn) btn.disabled = false;
      }
      if (kind === 'review' && SHEET_URL) {
        var sheetData = new URLSearchParams();
        sheetData.append('name', form.querySelector('[name="fi-sender-fullName"]').value);
        sheetData.append('company', form.querySelector('[name="fi-text-company"]').value);
        sheetData.append('truck', form.querySelector('[name="fi-select-truckType"]').value);
        sheetData.append('review', form.querySelector('[name="fi-text-review"]').value);
        sheetData.append('rating', String(rating));
        fetch(SHEET_URL, { method: 'POST', mode: 'no-cors', body: sheetData }).catch(function () {});
      }
      if (btn) btn.disabled = true;
      fetch(FORM_ENDPOINT, { method: 'POST', body: data })
        .then(function (r) {
          return r.json().catch(function () { return {}; }).then(function (j) {
            if (!r.ok || j.success === false) throw new Error(j.message || 'send failed');
            done();
          });
        })
        .catch(function () {
          if (btn) btn.disabled = false;
          alert('Sorry, your message could not be sent. Please call 510-954-6745 or email info@zululogisticshub.com.');
        });
    });
  });
})();
