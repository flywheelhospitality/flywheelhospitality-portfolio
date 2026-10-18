/**
 * Flywheel Hospitality - enquiry form
 * Sends the "Partner With Us" form to FormSubmit (https://formsubmit.co) via AJAX,
 * which emails each enquiry to the address in the form's action URL.
 * Works on static hosting such as GitHub Pages (no PHP needed).
 */
(function () {
  "use strict";

  const form = document.getElementById("enquiry-form");
  if (!form) return;

  const loading = form.querySelector(".loading");
  const errorBox = form.querySelector(".error-message");
  const sentBox = form.querySelector(".sent-message");
  const button = form.querySelector('button[type="submit"]');

  function show(el, on) { if (el) el.style.display = on ? "block" : "none"; }

  form.addEventListener("submit", async function (e) {
    e.preventDefault();
    if (!form.checkValidity()) { form.reportValidity(); return; }

    show(loading, true); show(errorBox, false); show(sentBox, false);
    button.disabled = true;

    const data = Object.fromEntries(new FormData(form).entries());
    if (data.email) data._replyto = data.email;

    try {
      const res = await fetch(form.action, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Accept": "application/json" },
        body: JSON.stringify(data)
      });
      const json = await res.json().catch(() => ({}));
      show(loading, false);

      if (res.ok && String(json.success) === "true") {
        show(sentBox, true);
        form.reset();
      } else {
        errorBox.textContent = json.message || "Sorry, something went wrong. Please call or WhatsApp us on +91 86100 46992.";
        show(errorBox, true);
      }
    } catch (err) {
      show(loading, false);
      errorBox.textContent = "Network error. Please try again, or call / WhatsApp us on +91 86100 46992.";
      show(errorBox, true);
    } finally {
      button.disabled = false;
    }
  });
})();
