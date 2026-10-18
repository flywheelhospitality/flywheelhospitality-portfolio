/**
 * Flywheel Hospitality - enquiry form
 * Sends the "Partner With Us" form to FormSubmit (https://formsubmit.co) via AJAX.
 * Works on static hosting such as GitHub Pages (no PHP needed).
 *
 * Duplicate protection (in this browser):
 *  - the button is locked while a submission is in progress (no double clicks)
 *  - an email or mobile number that has already submitted cannot submit again
 *    until DUPLICATE_WINDOW_DAYS have passed
 */
(function () {
  "use strict";

  const DUPLICATE_WINDOW_DAYS = 30;            // set to 0 to block forever
  const STORAGE_KEY = "fw_enquiries_sent";
  const CONTACT_LINE = "call or WhatsApp us on +91 86100 46992";

  const form = document.getElementById("enquiry-form");
  if (!form) return;

  const loading = form.querySelector(".loading");
  const errorBox = form.querySelector(".error-message");
  const sentBox = form.querySelector(".sent-message");
  const button = form.querySelector('button[type="submit"]');
  let submitting = false;

  function show(el, on) { if (el) el.style.display = on ? "block" : "none"; }
  function showError(msg) { errorBox.textContent = msg; show(errorBox, true); }

  // Normalise so "A@Gmail.com " and "a@gmail.com" count as the same, and
  // "+91 86100-46992" and "8610046992" count as the same number.
  function emailKey(v) { v = (v || "").trim().toLowerCase(); return v ? "e:" + v : null; }
  function mobileKey(v) { v = (v || "").replace(/\D/g, "").slice(-10); return v.length >= 10 ? "m:" + v : null; }

  function loadSent() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {}; } catch (e) { return {}; }
  }
  function saveSent(keys) {
    try {
      const sent = loadSent(); const now = Date.now();
      keys.forEach(k => { if (k) sent[k] = now; });
      localStorage.setItem(STORAGE_KEY, JSON.stringify(sent));
    } catch (e) { /* storage unavailable - skip */ }
  }
  function alreadySent(keys) {
    const sent = loadSent();
    const windowMs = DUPLICATE_WINDOW_DAYS * 24 * 60 * 60 * 1000;
    return keys.some(k => k && sent[k] && (DUPLICATE_WINDOW_DAYS === 0 || Date.now() - sent[k] < windowMs));
  }

  form.addEventListener("submit", async function (e) {
    e.preventDefault();
    if (submitting) return;                                   // ignore double clicks
    if (!form.checkValidity()) { form.reportValidity(); return; }

    show(errorBox, false); show(sentBox, false);

    const data = Object.fromEntries(new FormData(form).entries());
    const keys = [emailKey(data.email), mobileKey(data.mobile)];

    if (alreadySent(keys)) {
      showError("We’ve already received an enquiry from this email / mobile number. Our team will contact you shortly — for anything urgent, " + CONTACT_LINE + ".");
      return;
    }

    if (data.email) data._replyto = data.email;
    submitting = true; button.disabled = true; show(loading, true);

    try {
      const res = await fetch(form.action, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Accept": "application/json" },
        body: JSON.stringify(data)
      });
      const json = await res.json().catch(() => ({}));
      show(loading, false);

      if (res.ok && String(json.success) === "true") {
        saveSent(keys);
        show(sentBox, true);
        form.reset();
      } else {
        showError(json.message || "Sorry, something went wrong. Please " + CONTACT_LINE + ".");
      }
    } catch (err) {
      show(loading, false);
      showError("Network error. Please try again, or " + CONTACT_LINE + ".");
    } finally {
      submitting = false; button.disabled = false;
    }
  });
})();
