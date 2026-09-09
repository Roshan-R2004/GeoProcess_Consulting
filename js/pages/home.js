/* Home page-specific behavior.
   Email dropdown behavior remains centralized in js/main.js.
*/

/* ---------------------------------------------------------
   Home hero image slider
   --------------------------------------------------------- */
document.addEventListener("DOMContentLoaded", function () {
  const slider = document.querySelector(".home-hero-bg");
  if (!slider) return;

  const slides = Array.from(
    slider.querySelectorAll(".hero-slide")
  );

  const dots = Array.from(
    slider.querySelectorAll(".hero-dot")
  );

  if (slides.length < 2) return;

  let current = 0;
  let timer = null;
  const intervalMs = 5000;

  function showSlide(nextIndex) {
    current =
      (nextIndex + slides.length) %
      slides.length;

    slides.forEach(function (slide, index) {
      slide.classList.toggle(
        "is-active",
        index === current
      );
    });

    dots.forEach(function (dot, index) {
      const active = index === current;

      dot.classList.toggle(
        "is-active",
        active
      );

      dot.setAttribute(
        "aria-selected",
        String(active)
      );
    });
  }

  function stopAutoplay() {
    if (timer !== null) {
      window.clearInterval(timer);
      timer = null;
    }
  }

  function startAutoplay() {
    stopAutoplay();

    timer = window.setInterval(
      function () {
        showSlide(current + 1);
      },
      intervalMs
    );
  }

  dots.forEach(function (dot, index) {
    dot.addEventListener(
      "click",
      function () {
        showSlide(index);
        startAutoplay();
      }
    );
  });

  slider.addEventListener(
    "mouseenter",
    stopAutoplay
  );

  slider.addEventListener(
    "mouseleave",
    startAutoplay
  );

  slider.addEventListener(
    "focusin",
    stopAutoplay
  );

  slider.addEventListener(
    "focusout",
    function () {
      if (!slider.contains(document.activeElement)) {
        startAutoplay();
      }
    }
  );

  document.addEventListener(
    "visibilitychange",
    function () {
      if (document.hidden) {
        stopAutoplay();
      } else {
        startAutoplay();
      }
    }
  );

  showSlide(0);
  startAutoplay();
});
