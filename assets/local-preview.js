(function () {
  if (window.location.protocol !== 'file:') return;

  var decodedPath = decodeURI(window.location.pathname);
  var marker = '/barowoweb/';
  var markerIndex = decodedPath.lastIndexOf(marker);

  if (markerIndex === -1) return;

  var siteRoot = 'file://' + decodedPath.slice(0, markerIndex + marker.length);

  function stripQuery(url) {
    return (url || '').split('#')[0].split('?')[0];
  }

  function mapLocalUrl(url) {
    if (!url) return url;
    if (/^(https?:|mailto:|tel:|javascript:|#)/i.test(url)) return url;

    var bareUrl = stripQuery(url);
    var suffix = url.slice(bareUrl.length);

    if (bareUrl === '/') return siteRoot + 'index.html' + suffix;
    if (bareUrl.indexOf('/#') === 0) return siteRoot + 'index.html' + bareUrl.slice(1) + suffix;
    if (bareUrl === '/favicon.ico') return siteRoot + 'favicon.ico' + suffix;
    if (bareUrl === '/logo.svg') return siteRoot + 'logo.svg' + suffix;
    if (bareUrl === '/site.webmanifest') return siteRoot + 'site.webmanifest' + suffix;
    if (bareUrl === '/admin' || bareUrl === '/admin/') return siteRoot + 'admin/index.html' + suffix;
    if (bareUrl.indexOf('/assets/') === 0) return siteRoot + bareUrl.slice(1) + suffix;
    if (bareUrl === '/aktualnosci' || bareUrl === '/aktualnosci/') return siteRoot + 'aktualnosci/index.html' + suffix;
    if (bareUrl === '/polityka-prywatnosci' || bareUrl === '/polityka-prywatnosci/') return siteRoot + 'polityka-prywatnosci/index.html' + suffix;
    if (bareUrl.indexOf('/aktualnosci/') === 0) {
      return siteRoot + bareUrl.slice(1) + (bareUrl.endsWith('/') ? 'index.html' : '/index.html') + suffix;
    }

    return url;
  }

  function rewriteAttr(selector, attr) {
    document.querySelectorAll(selector).forEach(function (node) {
      var current = node.getAttribute(attr);
      var mapped = mapLocalUrl(current);
      if (mapped !== current) {
        node.setAttribute(attr, mapped);
        if (node.tagName === 'VIDEO') node.load();
      }
    });
  }

  function applyLocalPreviewFixes() {
    rewriteAttr('[href^="/"]', 'href');
    rewriteAttr('[src^="/"]', 'src');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', applyLocalPreviewFixes);
  } else {
    applyLocalPreviewFixes();
  }
})();
