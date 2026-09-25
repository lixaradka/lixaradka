(function () {
  if (document.getElementById('callbackModal')) return;

  var modal = document.createElement('div');
  modal.className = 'callback-modal';
  modal.id = 'callbackModal';
  modal.setAttribute('role', 'dialog');
  modal.setAttribute('aria-modal', 'true');
  modal.setAttribute('aria-labelledby', 'callbackTitle');
  modal.setAttribute('aria-hidden', 'true');
  modal.innerHTML = [
    '<div class="callback-backdrop" data-callback-close></div>',
    '<div class="callback-dialog">',
    '<button class="callback-close" type="button" data-callback-close aria-label="Zamknij formularz">×</button>',
    '<div class="callback-kicker">Szybki kontakt</div>',
    '<div class="callback-title" id="callbackTitle">ZOSTAW NUMER.<br><span class="red">ODDZWONIMY.</span></div>',
    '<p class="callback-text">Jeśli planujesz wesele, urodziny albo event, zostaw telefon. Oddzwonimy możliwie szybko i powiemy, czy mamy wolny termin.</p>',
    '<form class="callback-form" id="callbackForm" action="https://barowo-telegram-relay.vanatarasuk20.workers.dev/lead" method="POST">',
    '<label for="callbackPhone"><span>Telefon *</span><input type="tel" id="callbackPhone" name="phone" placeholder="+48 123 456 789" autocomplete="tel" required></label>',
    '<label class="callback-consent" for="callbackConsent"><input type="checkbox" id="callbackConsent" name="privacy_consent" required><span>Wyrażam zgodę na kontakt telefoniczny i przetwarzanie danych zgodnie z <a href="/polityka-prywatnosci/">Polityką prywatności</a>.</span></label>',
    '<input type="hidden" name="name" value="Prośba o telefon ze strony">',
    '<input type="hidden" name="source" value="website_callback_popup">',
    '<input type="hidden" name="message" value="Użytkownik był na stronie ponad minutę i poprosił o szybki telefon zwrotny.">',
    '<input type="hidden" name="return_url" value="https://barowo.com/#contact">',
    '<input type="hidden" name="page_url" value="">',
    '<input type="hidden" name="referrer" value="">',
    '<input type="hidden" name="utm_source" value="">',
    '<input type="hidden" name="utm_medium" value="">',
    '<input type="hidden" name="utm_campaign" value="">',
    '<input type="hidden" name="utm_content" value="">',
    '<input type="hidden" name="utm_term" value="">',
    '<button class="btn btn-primary callback-submit" type="submit">Oddzwońcie do mnie</button>',
    '<div class="callback-status" aria-live="polite"></div>',
    '</form>',
    '</div>'
  ].join('');

  document.body.appendChild(modal);

  var form = document.getElementById('callbackForm');
  var phone = document.getElementById('callbackPhone');
  var status = form.querySelector('.callback-status');
  var submit = form.querySelector('.callback-submit');
  var submitLabel = submit ? submit.textContent : '';
  var urlParams = new URLSearchParams(window.location.search);
  var delayMs = urlParams.has('callback_test') ? 900 : 60000;
  var dismissKey = 'barowo_callback_popup_dismissed_session';
  var submitStorageKey = 'barowo_callback_popup_submitted_at';
  var submitTtl = 30 * 24 * 60 * 60 * 1000;

  function readSubmittedAt() {
    try {
      return Number(localStorage.getItem(submitStorageKey) || 0);
    } catch (error) {
      return 0;
    }
  }

  function markDismissedForSession() {
    try {
      sessionStorage.setItem(dismissKey, '1');
    } catch (error) {
      // Storage may be unavailable in private contexts.
    }
  }

  function markSubmitted() {
    try {
      localStorage.setItem(submitStorageKey, String(Date.now()));
      sessionStorage.removeItem(dismissKey);
    } catch (error) {
      // Storage may be unavailable in private contexts.
    }
  }

  function shouldShow() {
    if (urlParams.has('callback_test')) return true;

    try {
      if (sessionStorage.getItem(dismissKey) === '1') return false;
    } catch (error) {
      // Ignore storage errors and keep the popup available.
    }

    var submittedAt = readSubmittedAt();
    if (!submittedAt) return true;
    return Date.now() - submittedAt > submitTtl;
  }

  function fillMeta() {
    var pageUrlField = form.querySelector('input[name="page_url"]');
    var referrerField = form.querySelector('input[name="referrer"]');
    if (pageUrlField) pageUrlField.value = window.location.href;
    if (referrerField) referrerField.value = document.referrer || '';
    ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'].forEach(function (fieldName) {
      var field = form.querySelector('input[name="' + fieldName + '"]');
      if (field) field.value = urlParams.get(fieldName) || '';
    });
  }

  function setStatus(type, message) {
    if (!status) return;
    status.className = 'callback-status';
    if (type) status.classList.add('is-' + type);
    status.textContent = message || '';
  }

  function openModal() {
    if (!shouldShow()) return;
    fillMeta();
    modal.classList.add('is-visible');
    modal.setAttribute('aria-hidden', 'false');
    document.body.classList.add('callback-open');
    if (phone) phone.focus({ preventScroll: true });
  }

  function closeModal(reason) {
    modal.classList.remove('is-visible');
    modal.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('callback-open');
    if (reason !== 'submitted') markDismissedForSession();
  }

  window.setTimeout(openModal, delayMs);

  modal.querySelectorAll('[data-callback-close]').forEach(function (button) {
    button.addEventListener('click', function () { closeModal('dismissed'); });
  });

  document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape' && modal.classList.contains('is-visible')) {
      closeModal('dismissed');
    }
  });

  form.addEventListener('submit', async function (event) {
    event.preventDefault();
    if (typeof form.reportValidity === 'function' && !form.reportValidity()) return;

    fillMeta();
    setStatus('', '');
    if (submit) {
      submit.disabled = true;
      submit.textContent = 'Wysyłamy…';
    }

    try {
      var formData = new FormData(form);
      var body = new URLSearchParams();
      var submitUrl = new URL(form.action);
      submitUrl.searchParams.set('format', 'json');
      formData.forEach(function (value, key) { body.append(key, value); });

      var response = await fetch(submitUrl.toString(), {
        method: 'POST',
        headers: { 'Accept': 'application/json' },
        body: body
      });
      var payload = await response.json().catch(function () { return null; });
      if (!response.ok || !payload || payload.ok !== true) {
        throw new Error((payload && payload.error) || 'callback_submit_failed');
      }

      form.reset();
      markSubmitted();
      setStatus('success', 'Dziękujemy. Oddzwonimy możliwie szybko.');
      window.setTimeout(function () { closeModal('submitted'); }, 1800);
    } catch (error) {
      setStatus('error', 'Nie udało się wysłać numeru. Zadzwoń do nas: +48 889 168 003.');
    } finally {
      if (submit) {
        submit.disabled = false;
        submit.textContent = submitLabel;
      }
    }
  });
})();
