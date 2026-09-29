/* Cozmo Station theme — interactions
   Vanilla JS, no dependencies. Progressive enhancement: every form still
   works without JS (posts to /cart/add, /cart/change, /search, etc.). */
(function () {
  'use strict';

  var cz = window.cz || {};
  var strings = cz.strings || {};
  var routes = cz.routes || { root: '/', cart: '/cart', cartAdd: '/cart/add', cartChange: '/cart/change' };

  /* ---------------- Utilities ---------------- */

  function $(sel, ctx) { return (ctx || document).querySelector(sel); }
  function $$(sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); }

  function formatMoney(cents, format) {
    if (typeof cents === 'string') cents = cents.replace('.', '');
    cents = parseInt(cents, 10) || 0;
    format = format || cz.moneyFormat || '{{amount}}';
    function withDelimiters(number, precision, thousands, decimal) {
      thousands = thousands || ',';
      decimal = decimal || '.';
      var fixed = (number / 100).toFixed(precision);
      var parts = fixed.split('.');
      var dollars = parts[0].replace(/(\d)(?=(\d\d\d)+(?!\d))/g, '$1' + thousands);
      var decimals = parts[1] ? decimal + parts[1] : '';
      return dollars + decimals;
    }
    var match = format.match(/\{\{\s*(\w+)\s*\}\}/);
    var value = '';
    switch (match ? match[1] : 'amount') {
      case 'amount': value = withDelimiters(cents, 2); break;
      case 'amount_no_decimals': value = withDelimiters(cents, 0); break;
      case 'amount_with_comma_separator': value = withDelimiters(cents, 2, '.', ','); break;
      case 'amount_no_decimals_with_comma_separator': value = withDelimiters(cents, 0, '.', ','); break;
      case 'amount_with_apostrophe_separator': value = withDelimiters(cents, 2, "'", '.'); break;
      case 'amount_no_decimals_with_space_separator': value = withDelimiters(cents, 0, ' '); break;
      default: value = withDelimiters(cents, 2);
    }
    // Drop trailing .00 to keep prices short (e.g. 620 instead of 620.00)
    value = value.replace(/[.,]00$/, '');
    return format.replace(/\{\{\s*\w+\s*\}\}/, value);
  }
  cz.formatMoney = formatMoney;

  var toastTimer;
  function toast(message) {
    var el = $('[data-cz-toast]');
    if (!el || !message) return;
    el.textContent = message;
    el.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { el.hidden = true; }, 2600);
  }
  cz.toast = toast;

  function setLoading(btn, state) {
    if (!btn) return;
    btn.classList.toggle('is-loading', !!state);
    btn.setAttribute('aria-busy', state ? 'true' : 'false');
  }

  /* ---------------- Body scroll lock ---------------- */

  var lockCount = 0;
  function lockScroll() { lockCount++; document.documentElement.style.overflow = 'hidden'; }
  function unlockScroll() { lockCount = Math.max(0, lockCount - 1); if (!lockCount) document.documentElement.style.overflow = ''; }

  /* ---------------- Cart API ---------------- */

  var SECTIONS = ['cart-drawer'];

  function postJSON(url, body) {
    return fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(body)
    }).then(function (res) {
      return res.json().then(function (data) {
        if (!res.ok || data.status) {
          var err = new Error(data.description || data.message || strings.error);
          err.data = data;
          throw err;
        }
        return data;
      });
    });
  }

  function renderSections(sections) {
    if (!sections) return;
    var html = sections['cart-drawer'];
    if (!html) return;
    var doc = new DOMParser().parseFromString(html, 'text/html');
    var fresh = doc.querySelector('[data-cz-cart-content]');
    var current = $('[data-cz-cart-content]');
    if (fresh && current) current.innerHTML = fresh.innerHTML;
    var root = doc.querySelector('[data-cz-cart-state]');
    if (root) {
      updateCartState(parseInt(root.getAttribute('data-count'), 10) || 0, parseInt(root.getAttribute('data-total'), 10) || 0);
    }
  }

  function updateCartState(count, total) {
    cz.cartCount = count;
    cz.cartTotal = total;
    $$('[data-cz-cart-count]').forEach(function (el) {
      el.textContent = count;
      el.hidden = count === 0;
    });
    document.dispatchEvent(new CustomEvent('cz:cart-updated', { detail: { count: count, total: total } }));
  }

  function refreshCart() {
    return fetch(routes.root + '?sections=' + SECTIONS.join(','))
      .then(function (r) { return r.json(); })
      .then(renderSections)
      .catch(function () {});
  }

  function addItems(items, opts) {
    opts = opts || {};
    return postJSON(routes.cartAdd + '.js', {
      items: items,
      sections: SECTIONS,
      sections_url: window.location.pathname
    }).then(function (data) {
      if (opts.checkout) {
        window.location.href = '/checkout';
        return data;
      }
      if (cz.cartType !== 'drawer' || !$('[data-cz-cart-drawer]')) {
        window.location.href = routes.cart;
        return data;
      }
      if (data.sections) renderSections(data.sections); else refreshCart();
      openCart();
      return data;
    });
  }
  cz.addItems = addItems;

  function changeLine(key, quantity) {
    var content = $('[data-cz-cart-content]');
    if (content) content.setAttribute('aria-busy', 'true');
    return postJSON(routes.cartChange + '.js', {
      id: key,
      quantity: quantity,
      sections: SECTIONS,
      sections_url: window.location.pathname
    }).then(function (data) {
      renderSections(data.sections);
    }).catch(function (err) {
      toast(err.message || strings.error);
      refreshCart();
    }).then(function () {
      if (content) content.removeAttribute('aria-busy');
    });
  }

  /* ---------------- Cart drawer ---------------- */

  var lastFocus = null;

  function openCart() {
    var drawer = $('[data-cz-cart-drawer]');
    if (!drawer) { window.location.href = routes.cart; return; }
    if (drawer.classList.contains('is-open')) return;
    lastFocus = document.activeElement;
    drawer.classList.add('is-open');
    drawer.setAttribute('aria-hidden', 'false');
    lockScroll();
    var close = $('[data-cz-cart-close]', drawer);
    if (close) setTimeout(function () { close.focus(); }, 50);
  }

  function closeCart() {
    var drawer = $('[data-cz-cart-drawer]');
    if (!drawer || !drawer.classList.contains('is-open')) return;
    drawer.classList.remove('is-open');
    drawer.setAttribute('aria-hidden', 'true');
    unlockScroll();
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }
  cz.openCart = openCart;

  document.addEventListener('click', function (e) {
    var opener = e.target.closest('[data-cz-cart-open]');
    if (opener && cz.cartType === 'drawer' && $('[data-cz-cart-drawer]')) {
      e.preventDefault();
      openCart();
      return;
    }
    if (e.target.closest('[data-cz-cart-close]')) {
      e.preventDefault();
      closeCart();
      return;
    }

    // Quantity steppers inside the cart (drawer and page)
    var step = e.target.closest('[data-cz-qty-step]');
    if (step) {
      e.preventDefault();
      var wrap = step.closest('[data-cz-line]');
      if (!wrap) return;
      var input = $('input', wrap.querySelector('.qty'));
      var next = Math.max(0, (parseInt(input.value, 10) || 0) + parseInt(step.getAttribute('data-cz-qty-step'), 10));
      input.value = next;
      changeLine(wrap.getAttribute('data-cz-line'), next);
      return;
    }
    var remove = e.target.closest('[data-cz-remove]');
    if (remove) {
      e.preventDefault();
      var line = remove.closest('[data-cz-line]');
      if (line) changeLine(line.getAttribute('data-cz-line'), 0);
      return;
    }

    // Single-variant "add" buttons (upsell, complete-your-routine, quick add)
    var addBtn = e.target.closest('[data-cz-add-variant]');
    if (addBtn) {
      e.preventDefault();
      var id = parseInt(addBtn.getAttribute('data-cz-add-variant'), 10);
      if (!id) return;
      setLoading(addBtn, true);
      addItems([{ id: id, quantity: 1 }]).then(function () {
        toast(strings.added);
      }).catch(function (err) {
        toast(err.message || strings.error);
      }).then(function () { setLoading(addBtn, false); });
    }
  });

  document.addEventListener('change', function (e) {
    var input = e.target.closest('[data-cz-line] .qty input');
    if (input) {
      var wrap = input.closest('[data-cz-line]');
      changeLine(wrap.getAttribute('data-cz-line'), Math.max(0, parseInt(input.value, 10) || 0));
    }
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      closeCart();
      closePanels();
    }
  });

  /* ---------------- Simple panels (menu drawer, filters) ---------------- */

  function openPanel(id, trigger) {
    var panel = document.getElementById(id);
    if (!panel) return;
    panel.hidden = false;
    panel._trigger = trigger;
    if (trigger) trigger.setAttribute('aria-expanded', 'true');
    lockScroll();
    var focusable = panel.querySelector('button, a, input, select');
    if (focusable) setTimeout(function () { focusable.focus(); }, 30);
  }
  function closePanel(panel) {
    if (!panel || panel.hidden) return;
    panel.hidden = true;
    if (panel._trigger) {
      panel._trigger.setAttribute('aria-expanded', 'false');
      panel._trigger.focus();
    }
    unlockScroll();
  }
  function closePanels() { $$('[data-cz-panel]').forEach(closePanel); }

  document.addEventListener('click', function (e) {
    var t = e.target.closest('[data-cz-panel-open]');
    if (t) { e.preventDefault(); openPanel(t.getAttribute('data-cz-panel-open'), t); return; }
    var c = e.target.closest('[data-cz-panel-close]');
    if (c) { e.preventDefault(); closePanel(c.closest('[data-cz-panel]')); }
  });

  /* ---------------- Quick add forms on product cards ---------------- */

  document.addEventListener('submit', function (e) {
    var form = e.target.closest('[data-cz-quick-add]');
    if (!form) return;
    e.preventDefault();
    var btn = form.querySelector('[type="submit"]');
    var id = parseInt(form.querySelector('[name="id"]').value, 10);
    setLoading(btn, true);
    addItems([{ id: id, quantity: 1 }]).then(function () {
      toast(strings.added);
    }).catch(function (err) {
      toast(err.message || strings.error);
    }).then(function () { setLoading(btn, false); });
  });

  /* ---------------- Sort select auto-submit ---------------- */

  document.addEventListener('change', function (e) {
    var sel = e.target.closest('[data-cz-autosubmit]');
    if (sel && sel.form) sel.form.submit();
  });

  /* ---------------- Product page ---------------- */

  function initProduct(root) {
    var jsonEl = $('[data-cz-product-json]', root);
    if (!jsonEl) return;
    var product;
    try { product = JSON.parse(jsonEl.textContent); } catch (err) { return; }

    var form = $('[data-cz-product-form]', root);
    var idInput = $('input[name="id"]', form);
    var discountPct = parseFloat(root.getAttribute('data-two-discount')) || 0;
    var currentVariant = product.variants.find(function (v) { return String(v.id) === String(idInput.value); }) || product.variants[0];

    var shipBar = $('[data-cz-ship-bar]', root);
    var sticky = $('[data-cz-sticky]');
    var mainButtons = $('[data-cz-main-buttons]', root);

    function selectedOffer() {
      var checked = $('input[name="cz-offer"]:checked', root);
      return checked ? checked.value : 'single';
    }

    function offerTotal(offer) {
      var price = currentVariant ? currentVariant.price : 0;
      if (offer === 'double') return Math.round(price * 2 * (1 - discountPct / 100));
      if (offer === 'bundle') {
        var b = $('[data-offer="bundle"]', root);
        return b ? parseInt(b.getAttribute('data-price'), 10) || 0 : 0;
      }
      return price;
    }

    function offerLabel(offer) {
      var el = $('[data-offer="' + offer + '"] [data-offer-name]', root);
      return el ? el.textContent.trim() : '';
    }

    function updateShipBar() {
      if (!shipBar) return;
      var threshold = parseInt(shipBar.getAttribute('data-threshold'), 10) || 0;
      if (!threshold) return;
      var base = typeof cz.cartTotal === 'number' ? cz.cartTotal : parseInt(shipBar.getAttribute('data-cart-total'), 10) || 0;
      var sum = base + offerTotal(selectedOffer());
      var remaining = Math.max(0, threshold - sum);
      var pct = Math.min(100, Math.round((sum / threshold) * 100));
      var text = $('[data-ship-text]', shipBar);
      var fill = $('[data-ship-fill]', shipBar);
      if (fill) fill.style.width = pct + '%';
      shipBar.classList.toggle('is-complete', remaining === 0);
      if (text) {
        text.innerHTML = remaining === 0
          ? strings.unlocked
          : strings.remaining.replace('[amount]', '<strong>' + formatMoney(remaining) + '</strong>');
      }
    }

    function updateOffers() {
      $$('.offer', root).forEach(function (o) {
        var input = $('input', o);
        o.classList.toggle('is-selected', !!(input && input.checked));
      });
      var single = $('[data-offer="single"]', root);
      var dbl = $('[data-offer="double"]', root);
      if (currentVariant) {
        if (single) {
          $('[data-offer-price]', single).textContent = formatMoney(currentVariant.price);
          var sc = $('[data-offer-compare]', single);
          if (sc) {
            var hasCompare = currentVariant.compare_at_price && currentVariant.compare_at_price > currentVariant.price;
            sc.textContent = hasCompare ? formatMoney(currentVariant.compare_at_price) : '';
            sc.hidden = !hasCompare;
          }
        }
        if (dbl) {
          $('[data-offer-price]', dbl).textContent = formatMoney(offerTotal('double'));
          var dc = $('[data-offer-compare]', dbl);
          if (dc) dc.textContent = formatMoney(currentVariant.price * 2);
        }
      }
      var offer = selectedOffer();
      $$('[data-cz-sticky-price]').forEach(function (el) { el.textContent = formatMoney(offerTotal(offer)); });
      $$('[data-cz-sticky-label]').forEach(function (el) { el.textContent = offerLabel(offer); });
      updateShipBar();
    }

    function updateVariant(variant) {
      currentVariant = variant;
      if (!variant) {
        $$('[data-cz-buy]', root).concat($$('[data-cz-buy]', sticky || document.createElement('div'))).forEach(function (b) { b.setAttribute('aria-disabled', 'true'); });
        return;
      }
      idInput.value = variant.id;
      $$('[data-cz-price]', root).forEach(function (el) { el.textContent = formatMoney(variant.price); });
      $$('[data-cz-compare]', root).forEach(function (el) {
        var show = variant.compare_at_price && variant.compare_at_price > variant.price;
        el.textContent = show ? formatMoney(variant.compare_at_price) : '';
        el.hidden = !show;
      });
      var buttons = $$('[data-cz-buy]', root);
      if (sticky) buttons = buttons.concat($$('[data-cz-buy]', sticky));
      buttons.forEach(function (b) {
        if (variant.available) {
          b.removeAttribute('aria-disabled');
          b.removeAttribute('disabled');
          if (b.hasAttribute('data-label')) b.textContent = b.getAttribute('data-label');
        } else {
          b.setAttribute('aria-disabled', 'true');
          b.textContent = strings.soldOut;
        }
      });
      // Jump gallery to variant image
      if (variant.featured_media) {
        var slide = $('[data-media-id="' + variant.featured_media.id + '"]', root);
        if (slide) scrollToSlide(slide);
      }
      if (window.history && window.history.replaceState) {
        var url = new URL(window.location.href);
        url.searchParams.set('variant', variant.id);
        window.history.replaceState({}, '', url.toString());
      }
      updateOffers();
    }

    // Variant picker (one fieldset per option)
    root.addEventListener('change', function (e) {
      if (e.target.closest('[data-cz-option]')) {
        var selected = $$('[data-cz-option]', root).map(function (fs) {
          var c = $('input:checked', fs);
          return c ? c.value : null;
        });
        var match = product.variants.find(function (v) {
          return v.options.every(function (opt, i) { return opt === selected[i]; });
        });
        updateVariant(match || null);
      }
      if (e.target.name === 'cz-offer') updateOffers();
    });

    // Add / buy now
    function submit(checkout, btn) {
      if (!currentVariant || !currentVariant.available) return;
      var offer = selectedOffer();
      var items;
      if (offer === 'bundle') {
        var b = $('[data-offer="bundle"]', root);
        items = [{ id: parseInt(b.getAttribute('data-variant'), 10), quantity: 1 }];
      } else {
        items = [{ id: currentVariant.id, quantity: offer === 'double' ? 2 : 1 }];
      }
      setLoading(btn, true);
      addItems(items, { checkout: checkout }).then(function () {
        if (!checkout) toast(strings.added);
      }).catch(function (err) {
        toast(err.message || strings.error);
      }).then(function () { setLoading(btn, false); });
    }

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var btn = e.submitter || $('[data-cz-buy="add"]', form);
      submit(btn && btn.getAttribute('data-cz-buy') === 'checkout', btn);
    });
    if (sticky) {
      $$('[data-cz-buy]', sticky).forEach(function (b) {
        b.addEventListener('click', function (e) {
          e.preventDefault();
          submit(b.getAttribute('data-cz-buy') === 'checkout', b);
        });
      });
    }

    // Sticky bar visibility
    if (sticky && mainButtons && 'IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          var below = entry.boundingClientRect.top < 0;
          sticky.classList.toggle('is-visible', !entry.isIntersecting && below);
        });
      });
      io.observe(mainButtons);
    }

    document.addEventListener('cz:cart-updated', updateShipBar);
    updateOffers();
  }

  /* ---------------- Gallery (dots + thumbs) ---------------- */

  // Works in both RTL and LTR (scrollLeft is negative in RTL in modern browsers)
  function scrollToSlide(slide) {
    var track = slide.parentElement;
    if (!track) return;
    var delta = slide.getBoundingClientRect().left - track.getBoundingClientRect().left;
    track.scrollBy({ left: delta, behavior: 'smooth' });
  }

  function initGallery(gallery) {
    var track = $('[data-cz-gallery-track]', gallery);
    if (!track) return;
    var slides = $$('.gallery__slide', track);
    var dots = $$('.gallery__dot', gallery);
    var thumbs = $$('[data-cz-thumb]', gallery);
    var ticking = false;

    function activeIndex() {
      var w = track.clientWidth || 1;
      return Math.round(Math.abs(track.scrollLeft) / w);
    }
    function paint() {
      var i = activeIndex();
      dots.forEach(function (d, n) { d.classList.toggle('is-active', n === i); d.setAttribute('aria-current', n === i ? 'true' : 'false'); });
      thumbs.forEach(function (t, n) { t.classList.toggle('is-active', n === i); });
      ticking = false;
    }
    function go(i) {
      if (slides[i]) scrollToSlide(slides[i]);
    }
    track.addEventListener('scroll', function () {
      if (!ticking) { ticking = true; window.requestAnimationFrame(paint); }
    }, { passive: true });
    dots.forEach(function (d, i) { d.addEventListener('click', function () { go(i); }); });
    thumbs.forEach(function (t, i) { t.addEventListener('click', function () { go(i); }); });
  }

  /* ---------------- Boot ---------------- */

  function boot() {
    var state = $('[data-cz-cart-state]');
    if (state) {
      cz.cartTotal = parseInt(state.getAttribute('data-total'), 10) || 0;
      cz.cartCount = parseInt(state.getAttribute('data-count'), 10) || 0;
    }
    $$('[data-cz-product]').forEach(initProduct);
    $$('[data-cz-gallery]').forEach(initGallery);

    // Reload drawer contents when coming back via browser cache (bfcache)
    window.addEventListener('pageshow', function (e) { if (e.persisted) refreshCart(); });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
