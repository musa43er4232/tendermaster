/* TenderMaster landing — interactions (no dependencies) */
(function () {
  'use strict';

  /* Current year in footer */
  var yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  /* Mobile nav toggle */
  var toggle = document.getElementById('navToggle');
  var links = document.getElementById('navLinks');
  if (toggle && links) {
    toggle.addEventListener('click', function () {
      var open = links.classList.toggle('open');
      toggle.classList.toggle('open', open);
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
    /* Close menu after tapping a link */
    links.addEventListener('click', function (e) {
      if (e.target.closest('a')) {
        links.classList.remove('open');
        toggle.classList.remove('open');
        toggle.setAttribute('aria-expanded', 'false');
      }
    });
  }

  /* Scroll reveal */
  var revealEls = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window && revealEls.length) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('in');
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
    revealEls.forEach(function (el) { io.observe(el); });
  } else {
    revealEls.forEach(function (el) { el.classList.add('in'); });
  }

  /* FAQ — keep one open at a time (optional, feels tidy) */
  var faqItems = document.querySelectorAll('.faq-item');
  faqItems.forEach(function (item) {
    item.addEventListener('toggle', function () {
      if (item.open) {
        faqItems.forEach(function (other) {
          if (other !== item) other.removeAttribute('open');
        });
      }
    });
  });

  /* Waitlist form — front-end only (Phase 1). Wire to a real endpoint in Phase 2. */
  var form = document.getElementById('waitlistForm');
  var msg = document.getElementById('formMsg');
  if (form && msg) {
    var emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var company = form.company.value.trim();
      var email = form.email.value.trim();

      if (!company) { setMsg('Please enter your company name.', 'err'); form.company.focus(); return; }
      if (!emailRe.test(email)) { setMsg('Please enter a valid work email.', 'err'); form.email.focus(); return; }

      /* Persist locally so nothing is lost before the backend exists */
      try {
        var list = JSON.parse(localStorage.getItem('tm_waitlist') || '[]');
        list.push({ company: company, email: email, at: new Date().toISOString() });
        localStorage.setItem('tm_waitlist', JSON.stringify(list));
      } catch (err) { /* ignore storage errors */ }

      form.reset();
      setMsg("You're on the list, " + company + ". We'll be in touch soon. ✓", 'ok');
    });
  }

  function setMsg(text, kind) {
    msg.textContent = text;
    msg.className = 'form-msg ' + kind;
  }
})();
