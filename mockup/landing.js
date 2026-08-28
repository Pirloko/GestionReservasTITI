(() => {
  const cfg = window.TITI_CONFIG || {};
  const phone = (cfg.whatsapp || "").replace(/\D/g, "");
  const waUrl = (msg) => {
    const text = encodeURIComponent(msg || cfg.whatsappMessage || "Hola! Quiero cotizar un evento");
    return phone ? `https://wa.me/${phone}?text=${text}` : "#";
  };

  document.getElementById("year").textContent = new Date().getFullYear();

  const igLinks = [document.getElementById("contact-ig"), document.getElementById("gallery-ig"), document.getElementById("footer-ig")];
  igLinks.forEach((el) => {
    if (el && cfg.instagram) el.href = cfg.instagram;
  });

  function wireWaLink(el, msg) {
    if (!el) return;
    el.href = waUrl(msg);
    el.target = "_blank";
    el.rel = "noopener";
  }

  document.querySelectorAll(".wa-link").forEach((el) => {
    const card = el.closest(".cat-card");
    let msg = cfg.whatsappMessage;
    if (card) {
      const title = card.dataset.waItem || card.querySelector("h3")?.textContent?.trim();
      if (title) msg = `Hola Titi Mundo Diversión! Me interesa cotizar: ${title} 🎉`;
    }
    wireWaLink(el, msg);
  });

  wireWaLink(document.getElementById("hero-wa"), cfg.whatsappMessage);
  wireWaLink(document.getElementById("contact-wa"), cfg.whatsappMessage);
  wireWaLink(document.getElementById("fab-wa"), cfg.whatsappMessage);

  const nav = document.getElementById("site-nav");
  const toggle = document.getElementById("nav-toggle");
  const navLinks = document.getElementById("nav-links");

  toggle?.addEventListener("click", () => {
    const open = navLinks.classList.toggle("open");
    toggle.setAttribute("aria-expanded", open ? "true" : "false");
    toggle.setAttribute("aria-label", open ? "Cerrar menú" : "Abrir menú");
  });

  navLinks?.querySelectorAll("a").forEach((a) => {
    a.addEventListener("click", () => {
      navLinks.classList.remove("open");
      toggle?.setAttribute("aria-expanded", "false");
      toggle?.setAttribute("aria-label", "Abrir menú");
    });
  });

  window.addEventListener("scroll", () => {
    nav?.classList.toggle("scrolled", window.scrollY > 24);
  }, { passive: true });

  const revealEls = document.querySelectorAll(".reveal");
  if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("visible");
            io.unobserve(e.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -40px 0px" }
    );
    revealEls.forEach((el) => io.observe(el));
  } else {
    revealEls.forEach((el) => el.classList.add("visible"));
  }

  const carousel = document.getElementById("hero-carousel");
  if (carousel) {
    const track = document.getElementById("hero-track");
    const slideWraps = [...carousel.querySelectorAll("[data-hero-slide]")];
    const dotsWrap = carousel.querySelector(".hero-dots");
    const prevBtn = document.getElementById("hero-prev");
    const nextBtn = document.getElementById("hero-next");
    let active = 0;
    let timer = null;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const interval = reducedMotion ? 8000 : 5500;

    slideWraps.forEach((_, i) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = `destacadas-dot${i === 0 ? " is-active" : ""}`;
      btn.setAttribute("role", "tab");
      btn.setAttribute("aria-label", `Ir a destacada ${i + 1}`);
      btn.setAttribute("aria-selected", i === 0 ? "true" : "false");
      btn.addEventListener("click", () => {
        slideWraps[i]?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
        restart();
      });
      dotsWrap.appendChild(btn);
    });

    const dots = [...dotsWrap.querySelectorAll(".destacadas-dot")];

    function setActive(i) {
      active = i;
      slideWraps.forEach((wrap, n) => wrap.classList.toggle("is-active", n === i));
      dots.forEach((d, n) => {
        d.classList.toggle("is-active", n === i);
        d.setAttribute("aria-selected", n === i ? "true" : "false");
      });
      if (prevBtn) prevBtn.disabled = i <= 0 && track.scrollLeft <= 8;
      if (nextBtn) {
        const maxScroll = track.scrollWidth - track.clientWidth;
        nextBtn.disabled = i >= slideWraps.length - 1 && track.scrollLeft >= maxScroll - 8;
      }
    }

    function updateScrollState() {
      const maxScroll = track.scrollWidth - track.clientWidth;
      if (prevBtn) prevBtn.disabled = track.scrollLeft <= 8;
      if (nextBtn) nextBtn.disabled = track.scrollLeft >= maxScroll - 8;

      const center = track.scrollLeft + track.clientWidth / 2;
      let best = 0;
      let bestDist = Infinity;
      slideWraps.forEach((slide, i) => {
        const mid = slide.offsetLeft + slide.offsetWidth / 2;
        const dist = Math.abs(mid - center);
        if (dist < bestDist) {
          bestDist = dist;
          best = i;
        }
      });
      setActive(best);
    }

    function scrollBySlide(dir) {
      const slide = slideWraps[0];
      const amount = slide ? slide.offsetWidth + 14 : track.clientWidth * 0.82;
      track.scrollBy({ left: dir * amount, behavior: reducedMotion ? "auto" : "smooth" });
    }

    function start() {
      if (slideWraps.length < 2) return;
      timer = setInterval(() => {
        const maxScroll = track.scrollWidth - track.clientWidth;
        if (track.scrollLeft >= maxScroll - 8) {
          track.scrollTo({ left: 0, behavior: reducedMotion ? "auto" : "smooth" });
        } else {
          scrollBySlide(1);
        }
      }, interval);
    }

    function stop() {
      if (timer) clearInterval(timer);
      timer = null;
    }

    function restart() {
      stop();
      start();
    }

    prevBtn?.addEventListener("click", () => {
      scrollBySlide(-1);
      restart();
    });
    nextBtn?.addEventListener("click", () => {
      scrollBySlide(1);
      restart();
    });

    track.addEventListener("scroll", updateScrollState, { passive: true });
    window.addEventListener("resize", updateScrollState);
    carousel.addEventListener("mouseenter", stop);
    carousel.addEventListener("mouseleave", start);
    carousel.addEventListener("focusin", stop);
    carousel.addEventListener("focusout", start);

    updateScrollState();
    start();
  }
})();
