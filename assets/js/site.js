/* ==========================================================
   Хобі Хатка — скрипти сайту
   1. мобільне меню          4. фільтри каталогу
   2. кошик (localStorage)   5. оформлення замовлення
   3. «Додати в кошик»       6. сторінка підтвердження
   Усе демонстраційне: нічого не надсилається на сервер.
   ========================================================== */
(function () {
  'use strict';

  var CART_KEY = 'hh_cart';
  var ORDER_KEY = 'hh_last_order';
  var SEQ_KEY = 'hh_order_seq';
  var DELIVERY_PRICE = 80;
  var MAX_QTY = 99;

  var CATEGORIES = {
    all: 'Усі матеріали',
    decor: 'Декор для діорам',
    paints: 'Фарби',
    brushes: 'Пензлі',
    easels: 'Мольберти',
    beads: 'Бісер',
    threads: 'Нитки',
    other: 'Інші матеріали'
  };

  var PRODUCTS = {
    'acrylic-12': {
      id: 'acrylic-12', category: 'paints', popularity: 1, inStock: true, price: 420,
      title: 'Набір акрилових фарб, 12 кольорів',
      desc: '12 × 12 мл · для дерева, паперу й полотна',
      img: 'assets/img/product-paints.png'
    },
    'brushes-5': {
      id: 'brushes-5', category: 'brushes', popularity: 2, inStock: true, price: 185,
      title: 'Пензлі для деталей, 5 шт.',
      desc: 'Тонкий синтетичний ворс · дерев’яні ручки',
      img: 'assets/img/product-brushes.png'
    },
    'moss-forest': {
      id: 'moss-forest', category: 'decor', popularity: 3, inStock: true, price: 145,
      title: 'Декор для діорам — лісовий мох',
      desc: 'Декоративна фактура для мініатюрних сцен',
      img: 'assets/img/product-moss.png'
    },
    'beads-50': {
      id: 'beads-50', category: 'beads', popularity: 4, inStock: true, price: 85,
      title: 'Бісер скляний, 50 г',
      desc: 'Мікс природних відтінків · для прикрас',
      img: 'assets/img/product-beads.png'
    }
  };

  /* ---------- Допоміжні функції ---------- */

  function $(selector, root) {
    return (root || document).querySelector(selector);
  }

  function $all(selector, root) {
    return Array.prototype.slice.call((root || document).querySelectorAll(selector));
  }

  function has(object, key) {
    return Object.prototype.hasOwnProperty.call(object, key);
  }

  function money(value) {
    var n = Math.round(Number(value)) || 0;
    return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + ' ₴';
  }

  function plural(n, one, few, many) {
    var m10 = n % 10;
    var m100 = n % 100;
    if (m10 === 1 && m100 !== 11) return one;
    if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return few;
    return many;
  }

  function esc(value) {
    var map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
    return String(value).replace(/[&<>"']/g, function (c) { return map[c]; });
  }

  var liveRegion = null;

  /* Повідомлення для скрінрідерів (aria-live) */
  function announce(message) {
    liveRegion = liveRegion || $('#live-status');
    if (!liveRegion) return;
    liveRegion.textContent = '';
    window.setTimeout(function () { liveRegion.textContent = message; }, 60);
  }

  /* ---------- Сховище (з запасним варіантом у пам’яті) ---------- */

  var memory = { cart: [], order: null };

  function readJSON(key, fallback) {
    try {
      var raw = window.localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (e) {
      return fallback;
    }
  }

  function writeJSON(key, value) {
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch (e) { /* сховище недоступне — працюємо в пам’яті */ }
  }

  /* ---------- Кошик ---------- */

  function getCart() {
    var data = readJSON(CART_KEY, null);
    if (!Array.isArray(data)) data = memory.cart;
    var clean = [];
    data.forEach(function (item) {
      var qty = parseInt(item && item.qty, 10);
      if (item && typeof item.id === 'string' && has(PRODUCTS, item.id) && qty > 0) {
        clean.push({ id: item.id, qty: Math.min(qty, MAX_QTY) });
      }
    });
    return clean;
  }

  function saveCart(items) {
    memory.cart = items;
    writeJSON(CART_KEY, items);
    updateBadges();
  }

  function addToCart(id, qty) {
    var cart = getCart();
    var found = cart.filter(function (item) { return item.id === id; })[0];
    if (found) {
      found.qty = Math.min(found.qty + qty, MAX_QTY);
    } else {
      cart.push({ id: id, qty: qty });
    }
    saveCart(cart);
  }

  function setQty(id, qty) {
    var cart = getCart().map(function (item) {
      return item.id === id ? { id: id, qty: Math.max(1, Math.min(qty, MAX_QTY)) } : item;
    });
    saveCart(cart);
  }

  function removeItem(id) {
    saveCart(getCart().filter(function (item) { return item.id !== id; }));
  }

  function cartLines() {
    return getCart().map(function (item) {
      var product = PRODUCTS[item.id];
      return { id: item.id, product: product, qty: item.qty, total: product.price * item.qty };
    });
  }

  function cartTotals(lines) {
    var units = 0;
    var subtotal = 0;
    lines.forEach(function (line) {
      units += line.qty;
      subtotal += line.total;
    });
    var delivery = lines.length ? DELIVERY_PRICE : 0;
    return { units: units, subtotal: subtotal, delivery: delivery, total: subtotal + delivery };
  }

  /* Лічильник біля піктограми кошика у шапці */
  function updateBadges() {
    var units = cartTotals(cartLines()).units;
    $all('[data-cart-count]').forEach(function (el) {
      el.textContent = units > 99 ? '99+' : String(units);
      el.hidden = units === 0;
    });
    $all('[data-cart-link]').forEach(function (el) {
      el.setAttribute('aria-label', units ? 'Кошик, товарів: ' + units : 'Кошик');
    });
  }

  /* Підсумок замовлення: використовується в кошику, оформленні й підтвердженні */
  function summaryHtml(rows, subtotal, delivery, total) {
    var items = rows.map(function (row) {
      return '<div class="summary__row"><dt>' + esc(row.title) + '</dt><dd>' +
        (Number(row.qty) || 0) + ' × ' + money(row.price) + '</dd></div>';
    }).join('');
    return '<dl class="summary__rows">' + items +
      '<div class="summary__row"><dt>Сума товарів</dt><dd>' + money(subtotal) + '</dd></div>' +
      '<div class="summary__row"><dt>Доставка · демотариф</dt><dd>' + money(delivery) + '</dd></div>' +
      '<div class="summary__row summary__row--total"><dt>Разом</dt><dd>' + money(total) + '</dd></div>' +
      '</dl>';
  }

  function linesToRows(lines) {
    return lines.map(function (line) {
      return { title: line.product.title, qty: line.qty, price: line.product.price };
    });
  }

  /* ---------- 1. Мобільне меню ---------- */

  function initMenu() {
    var panel = $('#mobile-menu');
    var menuBtn = $('#menu-toggle');
    var searchBtn = $('#search-toggle');
    var closeBtn = $('#menu-close');
    var searchInput = $('#search-mobile');
    var desktop = window.matchMedia('(min-width: 1024px)');
    var opener = null;

    if (!panel || !menuBtn || !searchBtn || !closeBtn) return;

    function setExpanded(value) {
      menuBtn.setAttribute('aria-expanded', value);
      searchBtn.setAttribute('aria-expanded', value);
      menuBtn.setAttribute('aria-label', value === 'true' ? 'Закрити меню' : 'Відкрити меню');
    }

    function open(trigger, focusSearch) {
      opener = trigger;
      panel.hidden = false;
      document.body.classList.add('is-menu-open');
      setExpanded('true');
      if (focusSearch && searchInput) searchInput.focus();
    }

    function close(returnFocus) {
      panel.hidden = true;
      document.body.classList.remove('is-menu-open');
      setExpanded('false');
      if (returnFocus && opener) opener.focus();
    }

    menuBtn.addEventListener('click', function () {
      if (panel.hidden) { open(menuBtn, false); } else { close(true); }
    });

    searchBtn.addEventListener('click', function () {
      if (panel.hidden) { open(searchBtn, true); } else { close(true); }
    });

    closeBtn.addEventListener('click', function () { close(true); });

    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape' && !panel.hidden) close(true);
    });

    desktop.addEventListener('change', function (event) {
      if (event.matches && !panel.hidden) close(false);
    });
  }

  /* Пошук у шапці на комп’ютері: панель під шапкою */
  function initSearchPanel() {
    var button = $('#search-toggle-desktop');
    var panel = $('#search-panel');
    var input = $('#search-desktop');
    if (!button || !panel) return;

    function setOpen(open, returnFocus) {
      panel.hidden = !open;
      button.setAttribute('aria-expanded', open ? 'true' : 'false');
      if (open && input) input.focus();
      if (!open && returnFocus) button.focus();
    }

    button.addEventListener('click', function () { setOpen(panel.hidden, !panel.hidden); });
    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape' && !panel.hidden) setOpen(false, true);
    });
  }

  /* ---------- 3. «Додати в кошик» (головна й каталог) ---------- */

  function initAddToCart() {
    document.addEventListener('click', function (event) {
      var button = event.target.closest('[data-add-to-cart]');
      if (!button) return;

      var id = button.getAttribute('data-add-to-cart');
      if (!has(PRODUCTS, id)) return;

      addToCart(id, 1);
      var units = cartTotals(cartLines()).units;
      announce('Додано в кошик: ' + PRODUCTS[id].title + '. Усього товарів у кошику: ' + units + '.');

      if (!button.hasAttribute('data-label')) {
        button.setAttribute('data-label', button.textContent);
      }
      button.textContent = 'Додано ✓';
      button.classList.add('is-added');
      window.clearTimeout(button._resetTimer);
      button._resetTimer = window.setTimeout(function () {
        button.textContent = button.getAttribute('data-label');
        button.classList.remove('is-added');
      }, 1800);
    });
  }

  /* ---------- 4. Каталог: фільтри, сортування, пошук ---------- */

  function initCatalog() {
    var form = $('#filters');
    if (!form) return;

    var list = $('#product-list');
    var items = $all('[data-product]', list);
    var countEl = $('#results-count');
    var chipsEl = $('#chips');
    var emptyEl = $('#empty-state');
    var sortEl = $('#sort');
    var minEl = $('#price-min');
    var maxEl = $('#price-max');
    var stockEl = $('#in-stock');
    var query = '';

    var params = new URLSearchParams(window.location.search);
    var urlCategory = params.get('category');
    if (urlCategory && has(CATEGORIES, urlCategory)) {
      var radio = $('input[name="category"][value="' + urlCategory + '"]', form);
      if (radio) radio.checked = true;
    }
    query = (params.get('q') || '').trim();
    $all('input[type="search"]').forEach(function (input) { input.value = query; });

    function readState() {
      var checked = $('input[name="category"]:checked', form);
      var min = parseInt(minEl.value, 10);
      var max = parseInt(maxEl.value, 10);
      return {
        category: checked ? checked.value : 'all',
        min: isNaN(min) ? null : min,
        max: isNaN(max) ? null : max,
        stock: stockEl.checked,
        sort: sortEl.value,
        q: query
      };
    }

    function matches(product, state) {
      if (state.category !== 'all' && product.category !== state.category) return false;
      if (state.min !== null && product.price < state.min) return false;
      if (state.max !== null && product.price > state.max) return false;
      if (state.stock && !product.inStock) return false;
      if (state.q) {
        var haystack = (product.title + ' ' + product.desc + ' ' + CATEGORIES[product.category]).toLowerCase();
        if (haystack.indexOf(state.q.toLowerCase()) === -1) return false;
      }
      return true;
    }

    function productOf(li) {
      return PRODUCTS[li.getAttribute('data-product')];
    }

    function compare(mode) {
      return function (a, b) {
        var pa = productOf(a);
        var pb = productOf(b);
        if (mode === 'price-asc') return pa.price - pb.price;
        if (mode === 'price-desc') return pb.price - pa.price;
        if (mode === 'name') return pa.title.localeCompare(pb.title, 'uk');
        return pa.popularity - pb.popularity;
      };
    }

    function chipHtml(key, label) {
      return '<li><button class="chip" type="button" data-chip="' + key +
        '" aria-label="Прибрати фільтр: ' + esc(label) + '">' + esc(label) +
        ' <span aria-hidden="true">×</span></button></li>';
    }

    function apply() {
      var state = readState();
      var shown = items.filter(function (li) { return matches(productOf(li), state); });
      shown.sort(compare(state.sort));

      items.forEach(function (li) { li.hidden = true; });
      shown.forEach(function (li) {
        li.hidden = false;
        list.appendChild(li);
      });

      list.hidden = shown.length === 0;
      emptyEl.hidden = shown.length !== 0;
      countEl.textContent = shown.length
        ? shown.length + ' ' + plural(shown.length, 'товар', 'товари', 'товарів') + ' · демокаталог'
        : 'Нічого не знайдено';

      var chips = [];
      if (state.category !== 'all') chips.push(chipHtml('category', CATEGORIES[state.category]));
      if (state.min !== null || state.max !== null) {
        chips.push(chipHtml('price',
          (state.min !== null ? state.min : 0) + '–' + (state.max !== null ? state.max : '∞') + ' ₴'));
      }
      if (state.stock) chips.push(chipHtml('stock', 'У наявності'));
      if (state.q) chips.push(chipHtml('q', 'Пошук: «' + state.q + '»'));
      chipsEl.innerHTML = chips.join('');
      chipsEl.hidden = chips.length === 0;
    }

    function clearQuery() {
      query = '';
      $all('input[type="search"]').forEach(function (input) { input.value = ''; });
      if (window.history.replaceState) window.history.replaceState(null, '', 'catalog.html');
    }

    function reset() {
      form.reset();
      sortEl.value = 'popular';
      clearQuery();
      apply();
      countEl.focus();
    }

    form.addEventListener('submit', function (event) {
      event.preventDefault();
      apply();
    });
    form.addEventListener('change', apply);
    sortEl.addEventListener('change', apply);

    $all('[data-reset-filters]').forEach(function (button) {
      button.addEventListener('click', reset);
    });

    chipsEl.addEventListener('click', function (event) {
      var chip = event.target.closest('[data-chip]');
      if (!chip) return;
      var key = chip.getAttribute('data-chip');
      if (key === 'category') $('input[name="category"][value="all"]', form).checked = true;
      if (key === 'price') { minEl.value = ''; maxEl.value = ''; }
      if (key === 'stock') stockEl.checked = false;
      if (key === 'q') clearQuery();
      apply();
      countEl.focus();
    });

    apply();
  }

  /* ---------- 2. Сторінка кошика ---------- */

  function cartItemHtml(line) {
    var p = line.product;
    var id = esc(line.id);
    var title = esc(p.title);
    return '<li class="cart-item">' +
      '<img class="cart-item__photo" src="' + esc(p.img) + '" alt="" width="136" height="136">' +
      '<div class="cart-item__body">' +
        '<p class="cart-item__meta">' + esc(CATEGORIES[p.category]) + ' · демотовар</p>' +
        '<h2 class="cart-item__title">' + title + '</h2>' +
        '<p class="cart-item__desc">' + esc(p.desc) + '</p>' +
        '<div class="cart-item__actions">' +
          '<div class="qty" role="group" aria-label="Кількість: ' + title + '">' +
            '<button class="qty__btn" type="button" data-action="dec" data-id="' + id + '"' +
              ' aria-label="Зменшити кількість: ' + title + '"' + (line.qty <= 1 ? ' disabled' : '') + '>−</button>' +
            '<span class="qty__value">' + line.qty + '</span>' +
            '<button class="qty__btn" type="button" data-action="inc" data-id="' + id + '"' +
              ' aria-label="Збільшити кількість: ' + title + '"' + (line.qty >= MAX_QTY ? ' disabled' : '') + '>+</button>' +
          '</div>' +
          '<button class="link-button" type="button" data-action="remove" data-id="' + id + '"' +
            ' aria-label="Видалити з кошика: ' + title + '">' +
            '<svg class="icon icon--xs" aria-hidden="true" focusable="false"><use href="#i-trash-2"/></svg>' +
            '<span>Видалити</span></button>' +
        '</div>' +
      '</div>' +
      '<p class="cart-item__price">' + money(line.total) + '</p>' +
    '</li>';
  }

  function initCart() {
    var layout = $('#cart-layout');
    if (!layout) return;

    var emptyEl = $('#cart-empty');
    var emptyTitle = $('#cart-empty-title');
    var listEl = $('#cart-list');
    var leadEl = $('#cart-lead');
    var rowsEl = $('#cart-summary-rows');

    function render() {
      var lines = cartLines();
      var totals = cartTotals(lines);

      layout.hidden = lines.length === 0;
      emptyEl.hidden = lines.length !== 0;

      leadEl.textContent = lines.length
        ? totals.units + ' ' + plural(totals.units, 'товар', 'товари', 'товарів') +
          ' · демонстраційний кошик. Перевірте матеріали перед оформленням.'
        : 'Тут з’являться товари, які ви додасте з каталогу.';

      listEl.innerHTML = lines.map(cartItemHtml).join('');
      rowsEl.innerHTML = summaryHtml(linesToRows(lines), totals.subtotal, totals.delivery, totals.total);
    }

    listEl.addEventListener('click', function (event) {
      var button = event.target.closest('[data-action]');
      if (!button) return;

      var id = button.getAttribute('data-id');
      var action = button.getAttribute('data-action');
      if (!has(PRODUCTS, id)) return;

      var product = PRODUCTS[id];
      var before = cartLines();
      var index = 0;
      var current = 1;
      before.forEach(function (line, i) {
        if (line.id === id) { index = i; current = line.qty; }
      });

      if (action === 'remove') {
        removeItem(id);
        render();
        announce('Видалено з кошика: ' + product.title + '.');
        var left = cartLines();
        if (left.length) {
          var next = left[Math.min(index, left.length - 1)];
          var nextButton = $('[data-action="remove"][data-id="' + next.id + '"]', listEl);
          if (nextButton) nextButton.focus();
        } else if (emptyTitle) {
          emptyTitle.focus();
        }
        return;
      }

      var qty = action === 'inc' ? current + 1 : current - 1;
      setQty(id, qty);
      render();
      announce(product.title + ': кількість ' + Math.max(1, Math.min(qty, MAX_QTY)) + '.');

      var target = $('[data-action="' + action + '"][data-id="' + id + '"]', listEl);
      if (!target || target.disabled) target = $('[data-action="inc"][data-id="' + id + '"]', listEl);
      if (target) target.focus();
    });

    render();
  }

  /* ---------- 5. Оформлення замовлення ---------- */

  function nextOrderNumber() {
    var seq = readJSON(SEQ_KEY, 0);
    seq = (typeof seq === 'number' && seq > 0 ? seq : 0) + 1;
    writeJSON(SEQ_KEY, seq);
    return 'ХХ-' + ('0000' + seq).slice(-4);
  }

  function initCheckout() {
    var form = $('#checkout-form');
    if (!form) return;

    var layout = $('#checkout-layout');
    var emptyEl = $('#checkout-empty');
    var lines = cartLines();

    if (!lines.length) {
      layout.hidden = true;
      emptyEl.hidden = false;
      return;
    }

    var totals = cartTotals(lines);
    $('#co-summary-rows').innerHTML =
      summaryHtml(linesToRows(lines), totals.subtotal, totals.delivery, totals.total);
    layout.hidden = false;

    var city = $('#city');
    var branch = $('#branch');
    var summaryBox = $('#error-summary');
    var summaryList = $('#error-list');

    var fields = [
      { id: 'name', label: 'Ім’я отримувача', check: function (el) {
        return el.value.trim().length >= 2 ? '' : 'Вкажіть ім’я отримувача.';
      } },
      { id: 'phone', label: 'Телефон', check: function (el) {
        var digits = el.value.replace(/\D/g, '');
        return /^380\d{9}$/.test(digits) || /^0\d{9}$/.test(digits) ? '' : 'Додайте 9 цифр після +380.';
      } },
      { id: 'email', label: 'Електронна пошта', check: function (el) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(el.value.trim()) ? '' : 'Вкажіть повну адресу: ім’я@домен.';
      } },
      { id: 'city', label: 'Місто', check: function (el) {
        return el.value ? '' : 'Оберіть місто доставки.';
      } },
      { id: 'branch', label: 'Відділення', check: function (el) {
        if (el.disabled) return '';
        return el.value ? '' : 'Оберіть відділення для доставки.';
      } },
      { id: 'consent', label: 'Згода з умовами', check: function (el) {
        return el.checked ? '' : 'Підтвердьте згоду з демонстраційними умовами.';
      } }
    ];

    function setError(field, message) {
      var control = $('#' + field.id);
      var error = $('#' + field.id + '-error');
      if (message) {
        control.setAttribute('aria-invalid', 'true');
        error.textContent = message;
        error.hidden = false;
      } else {
        control.removeAttribute('aria-invalid');
        error.textContent = '';
        error.hidden = true;
      }
    }

    function validateField(field) {
      var message = field.check($('#' + field.id));
      setError(field, message);
      return message;
    }

    /* Відділення залежить від міста */
    city.addEventListener('change', function () {
      var chosen = !!city.value;
      var options = chosen
        ? '<option value="">Оберіть відділення</option>'
        : '<option value="">Спершу оберіть місто</option>';
      if (chosen) {
        for (var n = 1; n <= 5; n += 1) {
          options += '<option value="Відділення №' + n + '">Відділення №' + n + ' · демо</option>';
        }
      }
      branch.innerHTML = options;
      branch.disabled = !chosen;
      setError(fields[4], '');
    });

    fields.forEach(function (field) {
      var control = $('#' + field.id);
      var eventName = control.tagName === 'SELECT' || control.type === 'checkbox' ? 'change' : 'blur';
      control.addEventListener(eventName, function () { validateField(field); });
      control.addEventListener('input', function () {
        if (control.getAttribute('aria-invalid') === 'true') validateField(field);
      });
    });

    form.addEventListener('submit', function (event) {
      event.preventDefault();

      var problems = [];
      fields.forEach(function (field) {
        var message = validateField(field);
        if (message) problems.push({ field: field, message: message });
      });

      if (problems.length) {
        summaryList.innerHTML = problems.map(function (problem) {
          return '<li><a href="#' + problem.field.id + '">' + esc(problem.field.label) + ': ' +
            esc(problem.message) + '</a></li>';
        }).join('');
        summaryBox.hidden = false;
        summaryBox.focus();
        return;
      }

      summaryBox.hidden = true;

      var current = cartLines();
      var sums = cartTotals(current);
      var order = {
        number: nextOrderNumber(),
        rows: linesToRows(current),
        subtotal: sums.subtotal,
        delivery: sums.delivery,
        total: sums.total,
        name: $('#name').value.trim(),
        city: city.value,
        branch: branch.value,
        comment: $('#comment').value.trim()
      };

      memory.order = order;
      writeJSON(ORDER_KEY, order);
      saveCart([]);
      window.location.href = 'confirmation.html';
    });
  }

  /* ---------- 6. Підтвердження замовлення ---------- */

  function initConfirmation() {
    var content = $('#confirm-content');
    if (!content) return;

    var order = readJSON(ORDER_KEY, null) || memory.order;
    if (!order || !Array.isArray(order.rows)) {
      $('#confirm-empty').hidden = false;
      return;
    }

    content.hidden = false;
    $('#order-number').textContent = String(order.number);
    $('#order-rows').innerHTML = summaryHtml(order.rows, order.subtotal, order.delivery, order.total);

    var details = 'Отримувач: ' + order.name + '. Доставка: до відділення — ' + order.city + ', ' +
      order.branch + ' (демотариф ' + money(order.delivery) + '). Оплата: при отриманні, демонстраційний спосіб.';
    if (order.comment) details += ' Коментар: ' + order.comment;
    $('#order-details').textContent = details;

    document.title = 'Замовлення ' + order.number + ' — Хобі Хатка';
    $('#confirm-title').focus();
  }

  /* ---------- 7. Сторінка товару та кнопка «Назад» ---------- */

  var DETAILS = {
    'acrylic-12': {
      alt: 'Дерев’яна коробка з різнокольоровими баночками акрилових фарб',
      lead: 'Дванадцять базових відтінків для малювання на дереві, папері й полотні. Добре змішуються між собою.',
      specs: ['Обсяг: 12 × 12 мл', 'Основа: акрил, водорозчинний', 'Поверхні: дерево, папір, полотно', 'Упаковка: дерев’яна коробка']
    },
    'brushes-5': {
      alt: 'П’ять тонких пензлів із дерев’яними ручками на аркуші паперу',
      lead: 'Набір тонких пензлів для дрібних деталей: контури, очі, прожилки, написи.',
      specs: ['У наборі: 5 пензлів', 'Ворс: синтетичний, тонкий', 'Ручка: дерево', 'Для акрилу, гуашу, акварелі']
    },
    'moss-forest': {
      alt: 'Декоративний лісовий мох у паперовій коробці',
      lead: 'Декоративна фактура для мініатюрних сцен, діорам і макетів.',
      specs: ['Тип: декоративний мох', 'Призначення: діорами, макети, декор', 'Упаковка: паперова коробка']
    },
    'beads-50': {
      alt: 'Скляний бісер природних відтінків у невеликих мисках',
      lead: 'Мікс природних відтінків скляного бісеру для прикрас, вишивки й гердану.',
      specs: ['Вага: 50 г', 'Матеріал: скло', 'Колір: мікс природних відтінків']
    }
  };

  function initProduct() {
    var id = new URLSearchParams(window.location.search).get('id');
    var view = $('#product-view');
    var missing = $('#product-missing');
    if (!has(PRODUCTS, id)) {
      missing.hidden = false;
      document.title = 'Товар не знайдено — Хобі Хатка';
      return;
    }
    var p = PRODUCTS[id];
    var d = DETAILS[id];
    document.title = p.title + ' — Хобі Хатка';
    $('#crumb-product').textContent = p.title;
    var photo = $('#product-photo');
    photo.src = p.img;
    photo.alt = d.alt;
    $('#product-meta').textContent = CATEGORIES[p.category] + ' · демотовар';
    $('#product-title').textContent = p.title;
    $('#product-lead').textContent = d.lead + ' ' + p.desc + '.';
    var price = $('#product-price');
    price.value = String(p.price);
    price.textContent = money(p.price);
    $('#product-add').setAttribute('data-add-to-cart', id);
    $('#product-add').setAttribute('aria-label', 'Додати в кошик: ' + p.title);
    $('#product-specs').innerHTML = d.specs.map(function (t) { return '<li>' + esc(t) + '</li>'; }).join('');
    view.hidden = false;
  }

  /* «Назад»: на попередню сторінку цього сайту, а якщо її немає — за посиланням у href */
  function initBack() {
    $all('[data-back]').forEach(function (link) {
      link.addEventListener('click', function (event) {
        var sameSite = false;
        try { sameSite = document.referrer && new URL(document.referrer).origin === window.location.origin; } catch (e) {}
        if (sameSite && window.history.length > 1) {
          event.preventDefault();
          window.history.back();
        }
      });
    });
  }

  /* ---------- 8. Акаунт (демо: без сервера, пароль не зберігається) ---------- */

  var USER_KEY = 'hh_user';
  var SESSION_KEY = 'hh_session';

  function initAccount() {
    var authView = $('#auth-view');
    var profile = $('#profile-view');
    if (!authView || !profile) return;
    var emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

    function setError(input, message) {
      var box = $('#' + input.id + '-error');
      box.textContent = message;
      box.hidden = !message;
      if (message) input.setAttribute('aria-invalid', 'true'); else input.removeAttribute('aria-invalid');
    }

    function check(form, rules) {
      var firstBad = null;
      rules.forEach(function (rule) {
        var input = $(rule[0], form);
        var message = rule[1](input.value.trim());
        setError(input, message);
        if (message && !firstBad) firstBad = input;
      });
      if (firstBad) firstBad.focus();
      return !firstBad;
    }

    var needName = function (v) { return v ? '' : 'Вкажіть ім’я.'; };
    var needEmail = function (v) { return emailRe.test(v) ? '' : 'Вкажіть повну адресу: ім’я@домен.'; };
    var needPass = function (v) { return v.length >= 6 ? '' : 'Пароль має містити щонайменше 6 символів.'; };

    /* «Запам’ятати мене»: так — сеанс у localStorage, ні — лише до закриття вкладки */
    function isLogged() {
      var inSession = false;
      try { inSession = window.sessionStorage.getItem(SESSION_KEY) === '1'; } catch (e) {}
      return inSession || readJSON(SESSION_KEY, false) === true;
    }

    function setLogged(on, remember) {
      try { window.sessionStorage.removeItem(SESSION_KEY); } catch (e) {}
      writeJSON(SESSION_KEY, false);
      if (!on) return;
      if (remember) { writeJSON(SESSION_KEY, true); return; }
      try { window.sessionStorage.setItem(SESSION_KEY, '1'); } catch (e) { writeJSON(SESSION_KEY, true); }
    }

    function render() {
      var user = readJSON(USER_KEY, null);
      var logged = isLogged() && user && user.email;
      authView.hidden = !!logged;
      profile.hidden = !logged;
      if (!logged) return;
      $('#profile-title').textContent = 'Вітаємо, ' + user.name + '!';
      $('#profile-email').textContent = 'Електронна пошта: ' + user.email;
      var order = readJSON(ORDER_KEY, null);
      $('#profile-order').textContent = order && order.number
        ? 'Останнє демозамовлення: ' + order.number + ', на суму ' + money(order.total) + '.'
        : 'Замовлень поки немає.';
    }

    $('#register-form').addEventListener('submit', function (event) {
      event.preventDefault();
      var form = event.currentTarget;
      if (!check(form, [['#reg-name', needName], ['#reg-email', needEmail], ['#reg-password', needPass]])) return;
      writeJSON(USER_KEY, { name: $('#reg-name').value.trim(), email: $('#reg-email').value.trim().toLowerCase() });
      setLogged(true, true);
      render();
      announce('Акаунт створено. Ви увійшли.');
      $('#profile-title').focus();
    });

    $('#login-form').addEventListener('submit', function (event) {
      event.preventDefault();
      var form = event.currentTarget;
      if (!check(form, [['#login-email', needEmail], ['#login-password', needPass]])) return;
      var user = readJSON(USER_KEY, null);
      if (!user || user.email !== $('#login-email').value.trim().toLowerCase()) {
        var input = $('#login-email');
        setError(input, 'Акаунт із такою поштою не знайдено. Спершу створіть обліковий запис.');
        input.focus();
        return;
      }
      setLogged(true, $('#remember').checked);
      render();
      announce('Ви увійшли.');
      $('#profile-title').focus();
    });

    $('#logout').addEventListener('click', function () {
      setLogged(false);
      $('#register-form').hidden = true;
      $('#login-form').hidden = false;
      render();
      announce('Ви вийшли з акаунта.');
      $('#login-email').focus();
    });

    function showForm(registering) {
      $('#login-form').hidden = registering;
      $('#register-form').hidden = !registering;
      $(registering ? '#reg-name' : '#login-email').focus();
    }
    $('#show-register').addEventListener('click', function () { showForm(true); });
    $('#show-login').addEventListener('click', function () { showForm(false); });
    $('#forgot').addEventListener('click', function () {
      $('#forgot-note').hidden = false;
      announce('У демонстраційній версії відновлення пароля недоступне.');
    });

    render();
  }

  /* ---------- Запуск ---------- */

  initMenu();
  initSearchPanel();
  initAddToCart();
  initBack();
  updateBadges();

  var page = document.body.getAttribute('data-page');
  if (page === 'catalog') initCatalog();
  if (page === 'account') initAccount();
  if (page === 'product') initProduct();
  if (page === 'cart') initCart();
  if (page === 'checkout') initCheckout();
  if (page === 'confirmation') initConfirmation();

  /* Кошик змінили в іншій вкладці або повернулися кнопкою «Назад» */
  window.addEventListener('storage', function (event) {
    if (event.key === CART_KEY) updateBadges();
  });

  window.addEventListener('pageshow', function (event) {
    if (event.persisted) window.location.reload();
  });
})();
