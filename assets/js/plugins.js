/* Ініціалізація сторонніх бібліотек головної сторінки (Typed.js, Swiper, Fancybox, AOS).
   Бібліотеки підключені через CDN у index.html; якщо якась не завантажилась,
   сторінка залишається працездатною — відповідний блок просто показується без ефекту. */
document.addEventListener('DOMContentLoaded', function () {
  'use strict';

  /* Користувачі, які просили менше анімації, отримують статичний вміст */
  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- 1. Typed.js — ефект друку в Hero ---------- */
  var typedTarget = document.getElementById('typed-text');
  if (typedTarget && typeof Typed !== 'undefined' && !reduceMotion) {
    typedTarget.textContent = '';
    new Typed('#typed-text', {
      strings: [
        'Фарби для ваших ідей.',
        'Пензлі для найтонших деталей.',
        'Бісер і нитки для рукоділля.',
        'Мох та декор для діорам.'
      ],
      typeSpeed: 50,     /* швидкість друку, мс на символ */
      backSpeed: 30,     /* швидкість стирання */
      backDelay: 1600,   /* пауза перед стиранням */
      startDelay: 300,
      smartBackspace: true,
      loop: true
    });
  }

  /* ---------- 2. Swiper.js — слайдер відгуків (5 слайдів) ---------- */
  /* Слайди відгуків будуються з data.json (site.js), тому Swiper запускається після завантаження даних */
  function initReviewsSlider() {
    var reviews = document.querySelector('.reviews-swiper');
    if (reviews && typeof Swiper !== 'undefined') {
      reviews.classList.add('is-ready');
      new Swiper('.reviews-swiper', {
        loop: true,
        spaceBetween: 24,
        grabCursor: true,
        autoplay: reduceMotion ? false : {
          delay: 3500,
          disableOnInteraction: false,
          pauseOnMouseEnter: true     /* зупинка, поки курсор над слайдером */
        },
        pagination: { el: '.reviews-swiper .swiper-pagination', clickable: true },
        navigation: {
          prevEl: '.reviews-swiper__btn--prev',
          nextEl: '.reviews-swiper__btn--next'
        },
        breakpoints: {              /* адаптивність: 1 / 2 / 3 слайди */
          320: { slidesPerView: 1 },
          768: { slidesPerView: 2 },
          1024: { slidesPerView: 3 }
        },
        a11y: {
          prevSlideMessage: 'Попередній відгук',
          nextSlideMessage: 'Наступний відгук',
          firstSlideMessage: 'Це перший відгук',
          lastSlideMessage: 'Це останній відгук',
          paginationBulletMessage: 'Перейти до відгуку {{index}}',
          slideLabelMessage: 'Відгук {{index}} з {{slidesLength}}'
        }
      });
    }
  }
  var dataReady = (window.HHData && window.HHData.ready) ? window.HHData.ready : Promise.resolve();
  dataReady.then(initReviewsSlider, initReviewsSlider);

  /* ---------- 3. Fancybox v5 — галерея (альбом через data-fancybox) ---------- */
  if (typeof Fancybox !== 'undefined') {
    Fancybox.bind('[data-fancybox="materials"]', {
      Carousel: { transition: 'fade' },          /* ефект переходу між фото */
      Images: { Panzoom: { maxScale: 3 } },      /* зум до 3× */
      l10n: {
        CLOSE: 'Закрити',
        NEXT: 'Наступне фото',
        PREV: 'Попереднє фото',
        MODAL: 'Закрити вікно можна клавішею Esc',
        ERROR: 'Не вдалося завантажити. Спробуйте пізніше.',
        IMAGE_ERROR: 'Зображення не знайдено',
        TOGGLE_ZOOM: 'Змінити масштаб',
        TOGGLE_THUMBS: 'Мініатюри',
        TOGGLE_SLIDESHOW: 'Слайдшоу',
        TOGGLE_FULLSCREEN: 'На весь екран',
        DOWNLOAD: 'Завантажити'
      }
    });
  }

  /* ---------- 4. AOS — поява блоків при скролі ---------- */
  if (typeof AOS !== 'undefined' && !reduceMotion) {
    AOS.init({ duration: 700, easing: 'ease-out-cubic', offset: 80, once: true });
  } else {
    /* Без бібліотеки (або при reduce-motion) елементи мають бути видимими одразу */
    Array.prototype.forEach.call(document.querySelectorAll('[data-aos]'), function (el) {
      el.removeAttribute('data-aos');
      el.removeAttribute('data-aos-delay');
    });
  }
});
