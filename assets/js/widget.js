/* Віджет «Конструктор набору каменів» (ЛР №11).
   Чистий Vanilla JS. Код ізольований в IIFE: у глобальній області нічого не з’являється.
   Віджет не залежить від id: усі елементи шукаються всередині кореня [data-widget="stone-builder"],
   тому на сторінці можна розмістити кілька екземплярів.

   Захист (Defensive Programming):
   1) HTML5: type="number", min="1", max="20", step="1", required;
   2) JavaScript: усі значення перевіряються перед розрахунком (порожньо, NaN, Infinity,
      нуль, від’ємні, завеликі, дробові, невідомі значення select);
   3) безпечне виведення: лише textContent, innerHTML не використовується. */
(function () {
  'use strict';

  var QTY_MIN = 1;
  var QTY_MAX = 20;
  var DISCOUNT_FROM = 5;     /* від цієї кількості діє знижка */
  var DISCOUNT = 0.1;        /* 10% */
  var GIFT_PRICE = 50;
  var DELIVERY_PRICE = 80;
  var EMPTY = '—';

  function money(value) {
    return String(Math.round(value)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + ' ₴';
  }

  /* Ціна з data-price вибраного <option>; null, якщо значення невідоме або «підроблене» */
  function optionPrice(select, allowed) {
    var option = select.options[select.selectedIndex];
    if (!option || allowed.indexOf(option.value) === -1) return null;
    var price = Number(option.getAttribute('data-price'));
    return (isFinite(price) && price >= 0) ? price : null;
  }

  /* Кількість: повертає { value, note } або { error } */
  function readQty(input) {
    var raw = String(input.value).trim();
    if (input.validity && input.validity.badInput) {
      return { error: 'Введіть кількість цифрами — від ' + QTY_MIN + ' до ' + QTY_MAX + '.' };
    }
    if (raw === '') {
      return { error: 'Введіть кількість від ' + QTY_MIN + ' до ' + QTY_MAX + '.' };
    }
    var n = Number(raw);
    if (!isFinite(n)) {
      return { error: 'Введіть кількість цифрами — від ' + QTY_MIN + ' до ' + QTY_MAX + '.' };
    }
    if (n < QTY_MIN || n > QTY_MAX) {
      return { error: 'Кількість має бути від ' + QTY_MIN + ' до ' + QTY_MAX + '.' };
    }
    if (Math.floor(n) !== n) {
      var rounded = Math.round(n);
      return { value: rounded, note: 'Кількість має бути цілою — округлено до ' + rounded + '.' };
    }
    return { value: n };
  }

  function init(root) {
    var form = root;
    var qtyEl = form.querySelector('[name="qty"]');
    var stoneEl = form.querySelector('[name="stone"]');
    var mountEl = form.querySelector('[name="mount"]');
    var giftEl = form.querySelector('[name="gift"]');
    var deliveryEl = form.querySelector('[name="delivery"]');
    var totalEl = form.querySelector('output');
    var breakdownEl = form.querySelector('.widget__breakdown');
    var noteEl = form.querySelector('.widget__note');

    /* Якщо потрібного елемента немає — тихо виходимо, сторінка не ламається */
    if (!qtyEl || !stoneEl || !mountEl || !giftEl || !deliveryEl || !totalEl || !breakdownEl || !noteEl) return;

    var stoneAllowed = Array.prototype.map.call(stoneEl.options, function (o) { return o.value; });
    var mountAllowed = Array.prototype.map.call(mountEl.options, function (o) { return o.value; });

    function errorBox(el) {
      var id = el.getAttribute('aria-describedby') || '';
      var ids = id.split(/\s+/);
      for (var i = 0; i < ids.length; i++) {
        var box = ids[i] && document.getElementById(ids[i]);
        if (box && box.classList.contains('field__error')) return box;
      }
      return null;
    }

    function setError(el, message) {
      var box = errorBox(el);
      if (message) {
        el.setAttribute('aria-invalid', 'true');
        if (box) { box.textContent = message; box.hidden = false; }
      } else {
        el.removeAttribute('aria-invalid');
        if (box) { box.textContent = ''; box.hidden = true; }
      }
    }

    function showInvalid() {
      form.classList.add('is-invalid');
      totalEl.textContent = EMPTY;
      breakdownEl.textContent = 'Виправте виділені поля, і вартість з’явиться тут.';
      noteEl.hidden = true;
      noteEl.textContent = '';
    }

    function recalc() {
      var qty = readQty(qtyEl);
      var stonePrice = optionPrice(stoneEl, stoneAllowed);
      var mountPrice = optionPrice(mountEl, mountAllowed);

      setError(qtyEl, qty.error || '');
      setError(stoneEl, stonePrice === null ? 'Оберіть камінь зі списку.' : '');
      setError(mountEl, mountPrice === null ? 'Оберіть оформлення зі списку.' : '');

      if (qty.error || stonePrice === null || mountPrice === null) {
        showInvalid();
        return;
      }

      var unit = stonePrice + mountPrice;
      var sum = unit * qty.value;
      var parts = [qty.value + ' × ' + money(unit)];
      if (qty.value >= DISCOUNT_FROM) {
        sum = sum * (1 - DISCOUNT);
        parts.push('знижка 10%');
      }
      if (giftEl.checked) { sum += GIFT_PRICE; parts.push('упаковка +' + money(GIFT_PRICE)); }
      if (deliveryEl.checked) { sum += DELIVERY_PRICE; parts.push('доставка +' + money(DELIVERY_PRICE)); }

      /* Останній рубіж: підсумок має бути скінченним і додатним */
      if (!isFinite(sum) || sum <= 0) {
        setError(qtyEl, 'Не вдалося розрахувати вартість. Перевірте кількість.');
        showInvalid();
        return;
      }

      form.classList.remove('is-invalid');
      totalEl.textContent = money(sum);
      breakdownEl.textContent = parts.join(' · ');
      noteEl.textContent = qty.note || '';
      noteEl.hidden = !qty.note;
    }

    /* Після завершення введення (change) нормалізуємо дробове значення в самому полі */
    function normalizeQty() {
      var qty = readQty(qtyEl);
      if (qty.note) qtyEl.value = String(qty.value);
    }

    form.addEventListener('input', recalc);
    form.addEventListener('change', function () { normalizeQty(); recalc(); });
    form.addEventListener('submit', function (event) { event.preventDefault(); });
    recalc();
  }

  function start() {
    var roots = document.querySelectorAll('[data-widget="stone-builder"]');
    for (var i = 0; i < roots.length; i++) init(roots[i]);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
})();
