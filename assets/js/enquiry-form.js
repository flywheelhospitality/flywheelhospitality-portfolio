/**
 * Flywheel Hospitality - enquiry form (v5)
 * - Field validation: mobile (10 digits), email format, location (letters only),
 *   rooms (numbers only), at least one "Current Challenge" checkbox
 * - Sends to FormSubmit (https://formsubmit.co) via AJAX - works on GitHub Pages
 * - Duplicate protection (this browser): same email OR same mobile cannot submit again
 *   within DUPLICATE_WINDOW_DAYS
 * - Safety net: blocks ANY other script from posting to FormSubmit, so a duplicate
 *   can never be sent by a stray handler (logged in the browser console)
 */
(function () {
  "use strict";

  const DUPLICATE_WINDOW_DAYS = 30;            // 0 = block forever
  const STORAGE_KEY = "fw_enquiries_sent";
  const CONTACT_LINE = "call or WhatsApp us on +91 86100 46992";
  const ENDPOINT_HOST = "formsubmit.co";

  const form = document.getElementById("enquiry-form");
  if (!form) return;

  const $ = (sel) => form.querySelector(sel);
  const loading = $(".loading"), errorBox = $(".error-message"), sentBox = $(".sent-message");
  const button = $('button[type="submit"]');
  const f = {
    name: $("#f-name"), mobile: $("#f-mobile"), email: $("#f-email"),
    property: $("#f-property"), location: $("#f-location"), rooms: $("#f-rooms")
  };
  const challengeBoxes = Array.from(form.querySelectorAll('input[name="challenge[]"]'));
  let submitting = false;

  function show(el, on) { if (el) el.style.display = on ? "block" : "none"; }
  function showError(msg) { errorBox.textContent = msg; show(errorBox, true); }

  /* ---------- Safety net: only this script may post to FormSubmit ---------- */
  let allowSend = false;
  const isEndpoint = (url) => String(url || "").indexOf(ENDPOINT_HOST) !== -1;
  const realFetch = window.fetch.bind(window);
  window.fetch = function (input, init) {
    const url = typeof input === "string" ? input : (input && input.url);
    if (isEndpoint(url) && !allowSend) {
      console.warn("[enquiry-form] Blocked an extra form submission sent by another script:", new Error().stack);
      return Promise.reject(new Error("Blocked duplicate submission"));
    }
    return realFetch(input, init);
  };
  const realOpen = XMLHttpRequest.prototype.open, realSend = XMLHttpRequest.prototype.send;
  XMLHttpRequest.prototype.open = function (m, url) { this._fwUrl = url; return realOpen.apply(this, arguments); };
  XMLHttpRequest.prototype.send = function () {
    if (isEndpoint(this._fwUrl) && !allowSend) {
      console.warn("[enquiry-form] Blocked an extra XHR form submission sent by another script:", new Error().stack);
      return;
    }
    return realSend.apply(this, arguments);
  };

  /* ---------- Input filters: block wrong characters while typing / pasting ---------- */
  if (f.mobile) f.mobile.addEventListener("input", () => {
    f.mobile.value = f.mobile.value.replace(/\D/g, "").slice(0, 10);
  });
  if (f.rooms) {
    if (f.rooms.type === "number") f.rooms.addEventListener("keydown", (e) => {
      if (["e", "E", "+", "-", ".", ","].includes(e.key)) e.preventDefault();
    });
    else f.rooms.addEventListener("input", () => { f.rooms.value = f.rooms.value.replace(/\D/g, "").slice(0, 4); });
  }
  if (f.location) f.location.addEventListener("input", () => {
    f.location.value = f.location.value.replace(/[^A-Za-z\s,.\-]/g, "");
  });

  /* ---------- Error boxes (created automatically if missing in the HTML) ---------- */
  function errBoxFor(id, afterEl) {
    let box = document.getElementById(id);
    if (!box && afterEl) {
      box = document.createElement("div"); box.className = "field-error"; box.id = id;
      afterEl.insertAdjacentElement("afterend", box);
    }
    return box;
  }
  Object.keys(f).forEach(k => { if (f[k]) errBoxFor("err-" + k, f[k]); });
  const challengeGroup = challengeBoxes.length ? challengeBoxes[0].closest(".border") || challengeBoxes[0].parentElement : null;
  const challengeErr = challengeGroup ? errBoxFor("err-challenge", challengeGroup) : null;

  /* ---------- Validation rules ---------- */
  const rules = {
    name:     v => v.trim().length >= 2 || "Please enter your name.",
    mobile:   v => /^[0-9]{10}$/.test(v) || "Enter a valid 10-digit mobile number.",
    email:    v => v.trim() === "" || /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(v.trim()) || "Enter a valid email address.",
    property: v => v.trim().length >= 2 || "Please enter your property name.",
    location: v => /^[A-Za-z][A-Za-z\s,.\-]{1,59}$/.test(v.trim()) || "Location should contain letters only (e.g. Madurai).",
    rooms:    v => (/^[0-9]+$/.test(v) && parseInt(v, 10) > 0) || "Enter the number of rooms (numbers only)."
  };

  function setFieldError(input, msg) {
    const box = document.getElementById("err-" + input.id.replace("f-", ""));
    if (msg) { input.classList.add("is-invalid"); if (box) { box.textContent = msg; box.style.display = "block"; } }
    else { input.classList.remove("is-invalid"); if (box) { box.textContent = ""; box.style.display = "none"; } }
  }
  function validateField(key) {
    const input = f[key]; if (!input) return true;
    const r = rules[key](input.value || "");
    setFieldError(input, r === true ? "" : r);
    return r === true;
  }
  function validateChallenges() {
    if (!challengeBoxes.length) return true;
    const ok = challengeBoxes.some(c => c.checked);
    if (challengeErr) { challengeErr.textContent = ok ? "" : "Please select at least one challenge."; challengeErr.style.display = ok ? "none" : "block"; }
    if (challengeGroup) challengeGroup.style.borderColor = ok ? "" : "#c0392b";
    return ok;
  }
  Object.keys(rules).forEach(k => {
    if (!f[k]) return;
    f[k].addEventListener("blur", () => validateField(k));
    f[k].addEventListener("input", () => { if (f[k].classList.contains("is-invalid")) validateField(k); });
  });
  challengeBoxes.forEach(c => c.addEventListener("change", validateChallenges));

  function validateAll() {
    let firstBad = null;
    Object.keys(rules).forEach(k => { if (!validateField(k) && !firstBad) firstBad = f[k]; });
    if (!validateChallenges() && !firstBad) firstBad = challengeBoxes[0];
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

  /* ---------- Collect form data (keeps ALL ticked challenges) ---------- */
  function collect() {
    const fd = new FormData(form), data = {};
    for (const [k, v] of fd.entries()) {
      if (k === "challenge[]") continue;
      data[k] = typeof v === "string" ? v.trim() : v;
    }
    data.challenge = challengeBoxes.filter(c => c.checked).map(c => c.value).join(", ");
    data.email = (data.email || "").toLowerCase();
    return data;
  }

  /* ---------- Submit (capture phase: runs before any other submit handler) ---------- */
  document.addEventListener("submit", async function (e) {
    if (e.target !== form) return;
    e.preventDefault();
    e.stopImmediatePropagation();          // no other script gets this submit event
    if (submitting) return;
    show(errorBox, false); show(sentBox, false);
    if (!validateAll()) return;

    const data = collect();
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
      allowSend = true;
      const req = fetch(form.action, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Accept": "application/json" },
        body: JSON.stringify(data)
      });
      allowSend = false;
      const res = await req;
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
      allowSend = false;
      show(loading, false);
      showError("Network error. Please try again, or " + CONTACT_LINE + ".");
    } finally {
      submitting = false; button.disabled = false;
    }
  }, true);
})();
