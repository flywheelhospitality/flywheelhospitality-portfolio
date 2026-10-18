/**
 * Flywheel Hospitality - enquiry form (v4)
 * - Field validation: mobile (10 digits), email format, location (letters only), rooms (numbers only)
 * - Sends to FormSubmit (https://formsubmit.co) via AJAX - works on GitHub Pages
 * - Duplicate protection (this browser): same email OR same mobile cannot submit again
 *   within DUPLICATE_WINDOW_DAYS
 */
(function () {
  "use strict";

  const DUPLICATE_WINDOW_DAYS = 30;            // 0 = block forever
  const STORAGE_KEY = "fw_enquiries_sent";
  const CONTACT_LINE = "call or WhatsApp us on +91 86100 46992";

  const form = document.getElementById("enquiry-form");
  if (!form) return;

  const $ = (sel) => form.querySelector(sel);
  const loading = $(".loading"), errorBox = $(".error-message"), sentBox = $(".sent-message");
  const button = $('button[type="submit"]');
  const f = {
    name: $("#f-name"), mobile: $("#f-mobile"), email: $("#f-email"),
    property: $("#f-property"), location: $("#f-location"), rooms: $("#f-rooms"),
    challenge: $("#f-challenge")
  };
  let submitting = false;

  function show(el, on) { if (el) el.style.display = on ? "block" : "none"; }
  function showError(msg) { errorBox.textContent = msg; show(errorBox, true); }

  /* ---------- Input filters: block wrong characters while typing / pasting ---------- */
  f.mobile.addEventListener("input", () => {           // digits only, max 10
    f.mobile.value = f.mobile.value.replace(/\D/g, "").slice(0, 10);
  });
  f.rooms.addEventListener("input", () => {            // digits only
    f.rooms.value = f.rooms.value.replace(/\D/g, "").slice(0, 4);
  });
  f.location.addEventListener("input", () => {         // letters, spaces , . - only
    f.location.value = f.location.value.replace(/[^A-Za-z\s,.\-]/g, "");
  });

  /* ---------- Validation rules ---------- */
  const rules = {
    name:      v => v.trim().length >= 2 || "Please enter your name.",
    mobile:    v => /^[0-9]{10}$/.test(v) || "Enter a valid 10-digit mobile number.",
    email:     v => v.trim() === "" || /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(v.trim()) || "Enter a valid email address.",
    property:  v => v.trim().length >= 2 || "Please enter your property name.",
    location:  v => /^[A-Za-z][A-Za-z\s,.\-]{1,59}$/.test(v.trim()) || "Location should contain letters only (e.g. Madurai).",
    rooms:     v => (/^[0-9]+$/.test(v) && parseInt(v, 10) > 0) || "Enter the number of rooms (numbers only).",
    challenge: v => v !== "" || "Please select your main challenge."
  };

  function setFieldError(input, msg) {
    const box = document.getElementById("err-" + input.id.replace("f-", ""));
    if (msg) { input.classList.add("is-invalid"); if (box) box.textContent = msg; }
    else { input.classList.remove("is-invalid"); if (box) box.textContent = ""; }
  }
  function validateField(key) {
    const input = f[key]; if (!input) return true;
    const r = rules[key](input.value || "");
    setFieldError(input, r === true ? "" : r);
    return r === true;
  }
  Object.keys(rules).forEach(k => {
    if (!f[k]) return;
    f[k].addEventListener("blur", () => validateField(k));
    f[k].addEventListener("input", () => { if (f[k].classList.contains("is-invalid")) validateField(k); });
    f[k].addEventListener("change", () => validateField(k));
  });
  function validateAll() {
    let firstBad = null;
    Object.keys(rules).forEach(k => { if (!validateField(k) && !firstBad) firstBad = f[k]; });
    if (firstBad) firstBad.focus();
    return !firstBad;
  }

  /* ---------- Duplicate protection ---------- */
  const emailKey = v => { v = (v || "").trim().toLowerCase(); return v ? "e:" + v : null; };
  const mobileKey = v => { v = (v || "").replace(/\D/g, ""); return v.length === 10 ? "m:" + v : null; };
  function loadSent() { try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {}; } catch (e) { return {}; } }
  function saveSent(keys) {
    try {
      const sent = loadSent(), now = Date.now();
      keys.forEach(k => { if (k) sent[k] = now; });
      localStorage.setItem(STORAGE_KEY, JSON.stringify(sent));
    } catch (e) {}
  }
  function duplicateOf(keys) {
    const sent = loadSent(), windowMs = DUPLICATE_WINDOW_DAYS * 864e5;
    return keys.find(k => k && sent[k] && (DUPLICATE_WINDOW_DAYS === 0 || Date.now() - sent[k] < windowMs)) || null;
  }

  /* ---------- Submit ---------- */
  form.addEventListener("submit", async function (e) {
    e.preventDefault();
    if (submitting) return;
    show(errorBox, false); show(sentBox, false);
    if (!validateAll()) return;

    const data = Object.fromEntries(new FormData(form).entries());
    data.email = (data.email || "").trim().toLowerCase();
    data.location = (data.location || "").trim();

    const dup = duplicateOf([emailKey(data.email), mobileKey(data.mobile)]);
    if (dup) {
      const what = dup.startsWith("e:") ? "email address" : "mobile number";
      if (dup.startsWith("e:")) setFieldError(f.email, "An enquiry from this email was already received.");
      else setFieldError(f.mobile, "An enquiry from this mobile number was already received.");
      showError("We’ve already received an enquiry from this " + what + ". Our team will contact you shortly — for anything urgent, " + CONTACT_LINE + ".");
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
        saveSent([emailKey(data.email), mobileKey(data.mobile)]);
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
