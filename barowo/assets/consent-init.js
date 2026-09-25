(function () {
  var config = {
    version: '20260331',
    bannerEnabled: false,
    preferencesModalEnabled: false,
    consentModeEnabled: false,
    categories: {
      necessary: true,
      analytics: false,
      marketing: false,
      preferences: false
    },
    integrations: {
      googleAnalyticsId: null,
      googleAdsId: null,
      googleTagManagerId: null,
      metaPixelId: null,
      tiktokPixelId: null,
      hotjarId: null,
      recaptchaSiteKey: null
    }
  };

  window.BAROWO_CONSENT = config;
  window.BAROWO_openConsentPreferences = function () {
    return false;
  };
  window.BAROWO_applyConsent = function () {
    return false;
  };

  function ensureRoot() {
    if (document.getElementById('cookie-consent-root')) return;
    var root = document.createElement('div');
    root.id = 'cookie-consent-root';
    root.hidden = true;
    root.setAttribute('aria-hidden', 'true');
    document.body.appendChild(root);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', ensureRoot);
  } else {
    ensureRoot();
  }
})();
