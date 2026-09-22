/**
 * slideshow.js — progressive enhancement for the {{< slideshow >}} shortcode.
 *
 * Markup contract (see layouts/shortcodes/slideshow.html):
 *
 *   <div class="slideshow">
 *     <figure class="slideshow__slide">...</figure>
 *     <figure class="slideshow__slide">...</figure>
 *   </div>
 *
 * Everything else — arrows, dot indicators, the "2 / 8" counter — is built
 * here from whatever slides are actually present. That means the controls can
 * never disagree with the content: add or remove a {{< slide >}} and the dots
 * and the counter follow automatically.
 *
 * Nothing is exported to the global scope and no inline onclick= is needed.
 */
(function () {
  "use strict";

  function initSlideshow(root) {
    var slides = Array.prototype.slice.call(
      root.querySelectorAll(":scope > .slideshow__slide")
    );
    if (slides.length === 0) return;

    var index = 0;

    // --- Build the controls -------------------------------------------------

    var counter = document.createElement("div");
    counter.className = "slideshow__counter";
    // Announce slide changes to screen readers, but politely.
    counter.setAttribute("aria-live", "polite");

    var prev = document.createElement("button");
    prev.type = "button";
    prev.className = "slideshow__nav slideshow__nav--prev";
    prev.innerHTML = "&#10094;"; // ❮
    prev.setAttribute("aria-label", "Previous image");

    var next = document.createElement("button");
    next.type = "button";
    next.className = "slideshow__nav slideshow__nav--next";
    next.innerHTML = "&#10095;"; // ❯
    next.setAttribute("aria-label", "Next image");

    var dots = document.createElement("div");
    dots.className = "slideshow__dots";

    var dotButtons = slides.map(function (slide, i) {
      var dot = document.createElement("button");
      dot.type = "button";
      dot.className = "slideshow__dot";
      dot.setAttribute("aria-label", "Go to image " + (i + 1));
      dot.addEventListener("click", function () {
        show(i);
      });
      dots.appendChild(dot);
      return dot;
    });

    root.appendChild(counter);
    root.appendChild(prev);
    root.appendChild(next);
    root.appendChild(dots);

    // Hand visibility over to the [hidden] attribute. Until this is set, CSS
    // hides every slide after the first so the page does not flash a stack of
    // images while this script loads; that rule is scoped to
    // .slideshow:not([data-ready]), so it must be switched off here or it keeps
    // hiding slides the script has un-hidden and the gallery renders blank.
    root.setAttribute("data-ready", "true");

    // --- State --------------------------------------------------------------

    function show(n) {
      // Wrap around in both directions.
      index = ((n % slides.length) + slides.length) % slides.length;

      slides.forEach(function (slide, i) {
        var active = i === index;
        slide.hidden = !active;
        // Only the visible slide's image should be eagerly loaded; the rest
        // stay lazy so a 14-image gallery doesn't stall first paint.
        if (active) {
          var img = slide.querySelector("img[loading='lazy']");
          if (img) img.loading = "eager";
        }
      });

      dotButtons.forEach(function (dot, i) {
        dot.setAttribute("aria-current", i === index ? "true" : "false");
      });

      counter.textContent = index + 1 + " / " + slides.length;
    }

    prev.addEventListener("click", function () {
      show(index - 1);
    });
    next.addEventListener("click", function () {
      show(index + 1);
    });

    // Arrow keys work once any control in this slideshow has focus.
    root.addEventListener("keydown", function (event) {
      if (event.key === "ArrowLeft") {
        show(index - 1);
        event.preventDefault();
      } else if (event.key === "ArrowRight") {
        show(index + 1);
        event.preventDefault();
      }
    });

    // A single slide needs no navigation.
    if (slides.length === 1) {
      prev.hidden = true;
      next.hidden = true;
      dots.hidden = true;
      counter.hidden = true;
    }

    /**
     * Reserve as much room as the longest caption needs.
     *
     * CSS letterboxes the images so every slide's picture is the same height,
     * but captions are as tall as their text: one that wraps to a second line
     * on a narrow screen makes its slide taller than the rest, and the gallery
     * still shifts as you click past it.
     *
     * Wrapping depends on the viewport, so this cannot be decided in CSS or at
     * build time -- it has to be measured, and re-measured when the window
     * changes. All the slides are un-hidden together, read in one pass, and
     * re-hidden before returning, so the browser never paints the intermediate
     * state.
     */
    function reserveCaptionSpace() {
      var captions = slides
        .map(function (s) { return s.querySelector("figcaption"); })
        .filter(Boolean);
      if (captions.length < 2) return;

      var hiddenBefore = slides.map(function (s) { return s.hidden; });
      captions.forEach(function (c) { c.style.minHeight = ""; });
      slides.forEach(function (s) { s.hidden = false; });

      var tallest = captions.reduce(function (max, c) {
        return Math.max(max, c.getBoundingClientRect().height);
      }, 0);

      slides.forEach(function (s, i) { s.hidden = hiddenBefore[i]; });
      if (tallest > 0) {
        captions.forEach(function (c) { c.style.minHeight = tallest + "px"; });
      }
    }

    reserveCaptionSpace();
    show(0);

    // Re-measure when the line count can change: on resize, and once webfonts
    // have swapped in, since text measured in a fallback face wraps differently.
    var resizeTimer;
    window.addEventListener("resize", function () {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(reserveCaptionSpace, 150);
    });
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(reserveCaptionSpace);
    }
  }

  function initAll() {
    document.querySelectorAll(".slideshow").forEach(initSlideshow);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initAll);
  } else {
    initAll();
  }
})();
