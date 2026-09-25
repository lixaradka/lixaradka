(function () {
  function setupSubpageNav() {
    var nav = document.getElementById('navLinks');
    var burger = document.getElementById('hamburger');
    if (!nav || !burger || burger.dataset.navBound === 'true') return;

    burger.dataset.navBound = 'true';

    function syncState(open) {
      nav.classList.toggle('open', open);
      burger.classList.toggle('open', open);
      burger.setAttribute('aria-expanded', open ? 'true' : 'false');
      document.body.classList.toggle('menu-open', open);
    }

    burger.addEventListener('click', function () {
      syncState(!nav.classList.contains('open'));
    });

    nav.querySelectorAll('a').forEach(function (link) {
      link.addEventListener('click', function () {
        syncState(false);
      });
    });

    document.addEventListener('click', function (event) {
      if (!nav.classList.contains('open')) return;
      if (nav.contains(event.target) || burger.contains(event.target)) return;
      syncState(false);
    });

    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape') syncState(false);
    });

    window.addEventListener('resize', function () {
      if (window.innerWidth > 980) syncState(false);
    });

    syncState(false);
  }

  window.setupSubpageNav = setupSubpageNav;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setupSubpageNav);
  } else {
    setupSubpageNav();
  }
})();
