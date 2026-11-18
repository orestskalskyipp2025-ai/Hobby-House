/* Форма зворотного зв’язку: клієнтська валідація, UI-стани та модальне вікно.
   Реальної відправки на сервер немає — це імітація успішного надсилання. */
(function () {
  'use strict';

  /* ---------- Налаштування правил ---------- */

  var MIN_NAME = 2;
  var MIN_MESSAGE = 10;

  /* RegEx №1 — email: «щось@домен.зона», зона від 2 символів, без пробілів.
       ^            початок рядка
       [^\s@]+      один чи більше символів, що не є пробілом або @
       @            літерально «@»
       [^\s@]+      домен
       \.           літерально «.» (крапка екранована, інакше . означала б «будь-який символ»)
       [^\s@]{2,}   зона (ua, com…) — щонайменше 2 символи
       $            кінець рядка */
  var REGEX_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

  /* RegEx №2 — телефон: рівно «+380» і 9 цифр, без пробілів, дужок і дефісів.
       ^        початок рядка (без нього пройшов би «abc+380501234567»)
       \+       літерально «+» (екранований, бо + — квантифікатор)
       380      код України
       \d{9}    рівно 9 цифр
       $        кінець рядка (без нього пройшов би номер з «хвостом») */
  var REGEX_PHONE = /^\+380\d{9}$/;

  /* Тільки UX-підказка (не правило RegEx): «0501234567» → «+380501234567» */
  var REGEX_LOCAL_PHONE = /^0\d{9}$/;

  /* ---------- Функції валідації (повертають '' або текст помилки) ---------- */

  function validateName(value) {
    return String(value).trim().length >= MIN_NAME ? '' : 'Ім’я має містити щонайменше 2 символи.';
  }

  function validateEmail(value) {
    return REGEX_EMAIL.test(String(value).trim()) ? '' : 'Вкажіть коректну адресу, наприклад user@gmail.com.';
  }

  function validatePhone(value) {
    return REGEX_PHONE.test(String(value)) ? '' : 'Телефон: +380 і ще 9 цифр без пробілів, наприклад +380501234567.';
  }

  function validateMessage(value) {
    return String(value).trim().length >= MIN_MESSAGE ? '' : 'Повідомлення має містити щонайменше 10 символів.';
  }

  function validateAgreement(checked) {
    return checked ? '' : 'Підтвердьте згоду з політикою конфіденційності.';
  }

  function normalizeLocalPhone(value) {
    var v = String(value).trim();
    return REGEX_LOCAL_PHONE.test(v) ? '+38' + v : v;
  }

  /* Для перевірки в Node (тести) */
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
      validateName: validateName, validateEmail: validateEmail, validatePhone: validatePhone,
      validateMessage: validateMessage, validateAgreement: validateAgreement,
      normalizeLocalPhone: normalizeLocalPhone, REGEX_EMAIL: REGEX_EMAIL, REGEX_PHONE: REGEX_PHONE
    };
  }

  if (typeof document === 'undefined') return;

  /* ---------- UI-стани поля: normal · error · success (focus — через Tailwind) ---------- */

  var BASE = ['border-[var(--color-control-border)]'];
  var ERROR = ['border-red-500', 'bg-red-50'];
  var SUCCESS = ['border-green-600'];

  function swap(control, remove, add) {
    remove.forEach(function (c) { control.classList.remove(c); });
    add.forEach(function (c) { control.classList.add(c); });
  }

  function showError(control, errorEl, message) {
    swap(control, BASE.concat(SUCCESS), ERROR);
    control.setAttribute('aria-invalid', 'true');
    errorEl.textContent = message;          /* textContent — без ризику HTML-ін’єкції */
    errorEl.hidden = false;
  }

  function showSuccess(control, errorEl) {
    swap(control, BASE.concat(ERROR), SUCCESS);
    control.setAttribute('aria-invalid', 'false');
    errorEl.textContent = '';
    errorEl.hidden = true;
  }

  function clearError(control, errorEl) {
    swap(control, ERROR.concat(SUCCESS), BASE);
    control.setAttribute('aria-invalid', 'false');
    errorEl.textContent = '';
    errorEl.hidden = true;
  }

  /* ---------- Ініціалізація ---------- */

  function init() {
    var form = document.getElementById('feedbackForm');
    if (!form) return;

    var live = document.getElementById('live-status');
    var counter = document.getElementById('messageCount');
    var submitBtn = form.querySelector('button[type="submit"]');

    var defs = [
      { id: 'username', check: validateName },
      { id: 'email', check: validateEmail },
      { id: 'phone', check: validatePhone },
      { id: 'message', check: validateMessage },
      { id: 'agreement', check: validateAgreement }
    ];
    defs.forEach(function (d) {
      d.control = document.getElementById(d.id);
      d.error = document.getElementById(d.id + 'Error');
      d.touched = false;
    });

    function valueOf(d) { return d.id === 'agreement' ? d.control.checked : d.control.value; }

    function validate(d) {
      var message = d.check(valueOf(d));
      if (message) showError(d.control, d.error, message); else showSuccess(d.control, d.error);
      return message;
    }

    /* Динамічна валідація: помилок немає, поки користувач не взаємодіяв з полем.
       blur — фінальна перевірка поля; input — оновлення стану після початку введення. */
    defs.forEach(function (d) {
      if (d.id === 'agreement') {
        d.control.addEventListener('change', function () { d.touched = true; validate(d); });
        return;
      }
      d.control.addEventListener('blur', function () {
        d.touched = true;
        if (d.id === 'phone') {
          var fixed = normalizeLocalPhone(d.control.value);
          if (fixed !== d.control.value) {
            d.control.value = fixed;
            if (live) live.textContent = 'Номер приведено до формату ' + fixed + '.';
          }
        }
        validate(d);
      });
      d.control.addEventListener('input', function () {
        if (d.id === 'message' && counter) counter.textContent = String(d.control.value.trim().length);
        if (d.touched) validate(d);
      });
    });

    function resetStates() {
      defs.forEach(function (d) { d.touched = false; clearError(d.control, d.error); });
      if (counter) counter.textContent = '0';
    }

    /* ---------- Модальне вікно ---------- */

    var overlay = document.getElementById('successModal');
    var dialog = document.getElementById('successDialog');
    var closeBtn = document.getElementById('modalClose');
    var lastFocus = null;

    function isOpen() { return !overlay.classList.contains('hidden'); }

    function openModal() {
      lastFocus = document.activeElement;
      overlay.classList.remove('hidden');
      overlay.classList.add('flex');
      document.body.style.overflow = 'hidden';      /* фон не прокручується */
      closeBtn.focus();
    }

    function closeModal() {
      overlay.classList.add('hidden');
      overlay.classList.remove('flex');
      document.body.style.overflow = '';
      if (lastFocus && lastFocus.focus) lastFocus.focus();   /* фокус не губиться */
    }

    closeBtn.addEventListener('click', closeModal);

    /* Клік по затемненому фону закриває вікно; клік усередині картки — ні */
    overlay.addEventListener('click', function (event) {
      if (event.target === overlay) closeModal();
    });

    document.addEventListener('keydown', function (event) {
      if (!isOpen()) return;
      if (event.key === 'Escape') { closeModal(); return; }
      if (event.key === 'Tab') {                    /* фокус-пастка всередині діалогу */
        var items = dialog.querySelectorAll('button, [href], input, [tabindex]:not([tabindex="-1"])');
        if (!items.length) return;
        var first = items[0];
        var last = items[items.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
      }
    });

    /* ---------- Надсилання (імітація) ---------- */

    form.addEventListener('submit', function (event) {
      event.preventDefault();                       /* без перезавантаження сторінки */
      if (isOpen()) return;                         /* швидкі повторні натискання */

      var firstInvalid = null;
      defs.forEach(function (d) {
        d.touched = true;
        if (validate(d) && !firstInvalid) firstInvalid = d;
      });

      if (firstInvalid) {
        firstInvalid.control.focus();
        if (live) live.textContent = 'Форму не надіслано. Перевірте позначені поля.';
        return;
      }

      form.reset();                                 /* очищаємо поля до показу вікна */
      resetStates();
      if (submitBtn) submitBtn.blur();
      openModal();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
