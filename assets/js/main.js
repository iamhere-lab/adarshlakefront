/* Adarsh Lakefront landing page: behaviour.
 * Lead forms, enquiry popup (auto + on click, intent-aware), gated floor plans,
 * hero slider, lightbox, WhatsApp, mobile action bar, dataLayer events (no PII).
 */
(function () {
  "use strict";

  var CFG = window.AL_CONFIG || {};
  var dl = (window.dataLayer = window.dataLayer || []);
  function track(event, params) {
    var payload = { event: event };
    for (var k in params) if (Object.prototype.hasOwnProperty.call(params, k)) payload[k] = params[k];
    dl.push(payload);
  }
  function ss(key, val) {
    try {
      if (val === undefined) return sessionStorage.getItem(key);
      sessionStorage.setItem(key, val);
    } catch (e) { return null; }
  }

  /* ---------- config-driven content ---------- */
  if (CFG.phoneE164) document.querySelectorAll(".js-phone").forEach(function (a) { a.href = "tel:" + CFG.phoneE164; });
  if (CFG.phoneDisplay) {
    var phoneNb = String(CFG.phoneDisplay).replace(/ /g, "\u00a0");
    document.querySelectorAll(".js-phone-text").forEach(function (s) { s.textContent = phoneNb; });
    document.querySelectorAll(".icon-btn.js-phone").forEach(function (a) { a.setAttribute("aria-label", "Call sales on " + CFG.phoneDisplay); });
  }
  if (CFG.privacyUrl) {
    document.querySelectorAll(".js-privacy-link").forEach(function (s) {
      var a = document.createElement("a"); a.href = CFG.privacyUrl; a.textContent = "Read the privacy policy."; a.rel = "noopener"; s.appendChild(a);
    });
  }
  if (CFG.agentRera) document.querySelectorAll(".js-agent-rera").forEach(function (s) { s.textContent = " · Agent RERA: " + CFG.agentRera; });
  if (CFG.whatsappNumber) {
    var waHref = "https://wa.me/" + String(CFG.whatsappNumber).replace(/\D/g, "") + "?text=" + encodeURIComponent(CFG.whatsappMessage || "");
    document.querySelectorAll(".js-whatsapp").forEach(function (a) { a.href = waHref; a.hidden = false; });
  }
  // Canonical URL: set AL_CONFIG.siteUrl once the domain is final; otherwise use the live URL without query/hash.
  if (!document.querySelector('link[rel="canonical"]') && /^https?:$/.test(location.protocol)) {
    var can = document.createElement("link"); can.rel = "canonical";
    can.href = CFG.siteUrl || (location.origin + location.pathname);
    document.head.appendChild(can);
  }

  if (/[?&]review=1\b/.test(location.search)) document.documentElement.classList.add("review-mode");

  /* ---------- attribution (UTMs + click IDs), kept for the session ---------- */
  var ATTR_KEYS = ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content", "gclid", "gbraid", "wbraid", "fbclid", "msclkid"];
  var attribution = {};
  try { attribution = JSON.parse(ss("ss_attr") || "{}") || {}; } catch (e) { attribution = {}; }
  var qs = new URLSearchParams(location.search);
  var fresh = false;
  ATTR_KEYS.forEach(function (k) { var v = qs.get(k); if (v) { attribution[k] = v.slice(0, 200); fresh = true; } });
  if (fresh || !attribution.landing_page) {
    attribution.landing_page = attribution.landing_page || location.href.split("#")[0];
    attribution.referrer = attribution.referrer || document.referrer || "";
    ss("ss_attr", JSON.stringify(attribution));
  }

  /* ---------- state ---------- */
  var pageLoadedAt = Date.now();
  var submitted = ss("ss_lead") === "1"; // one lead per session
  var anyFormStarted = false;
  var modalIntent = "general";

  var INTENTS = {
    general:    { title: "Get price & floor plans", button: "Get Price & Floor Plans" },
    price:      { title: "Get the price sheet",      button: "Get Price Sheet" },
    brochure:   { title: "Download the brochure",    button: "Get Brochure" },
    floor_plan: { title: "Download floor plans",     button: "Get Floor Plans" },
    site_visit: { title: "Book a site visit",        button: "Book a Site Visit" }
  };

  function unlockPlans() {
    document.querySelectorAll(".fp-grid").forEach(function (g) { g.classList.add("is-unlocked"); });
    document.querySelectorAll(".fp-lock").forEach(function (l) { l.remove(); });
  }
  if (submitted) unlockPlans();

  /* ---------- lead forms ---------- */
  var tpl = document.getElementById("lead-form-tpl");

  function phoneValid(cc, digits) {
    if (cc === "+91") return /^[6-9]\d{9}$/.test(digits);
    return /^\d{6,14}$/.test(digits);
  }
  function setError(form, name, msg) {
    var input = form.querySelector('[name="' + name + '"]');
    var err = form.querySelector('[data-err="' + name + '"]');
    if (input) input.setAttribute("aria-invalid", msg ? "true" : "false");
    if (err) err.textContent = msg || "";
  }
  function validate(form) {
    var ok = true, first = null;
    var name = form.elements.name.value.trim();
    var cc = form.elements.cc.value;
    var digits = form.elements.phone.value.replace(/\D/g, "");
    if (cc === "+91" && digits.length === 12 && digits.indexOf("91") === 0) digits = digits.slice(2);
    if (cc === "+91" && digits.length === 11 && digits.charAt(0) === "0") digits = digits.slice(1);
    if (name.length < 2 || !/[A-Za-zऀ-ൿ]/.test(name)) { setError(form, "name", "Please enter your name."); ok = false; first = first || form.elements.name; }
    else setError(form, "name", "");
    if (!phoneValid(cc, digits)) { setError(form, "phone", cc === "+91" ? "Please enter a 10-digit mobile number." : "Please enter a valid mobile number."); ok = false; first = first || form.elements.phone; }
    else setError(form, "phone", "");
    if (!form.elements.consent.checked) { setError(form, "consent", "Please tick the box so the sales team can contact you."); ok = false; first = first || form.elements.consent; }
    else setError(form, "consent", "");
    return { ok: ok, first: first, name: name, cc: cc, digits: digits };
  }

  function buildForm(slot) {
    var formId = slot.getAttribute("data-form-id");
    var frag = tpl.content.cloneNode(true);
    frag.querySelectorAll("[id]").forEach(function (el) { el.id = el.id.replace("tpl", "lf-" + formId); });
    frag.querySelectorAll("label[for]").forEach(function (el) { el.htmlFor = el.htmlFor.replace("tpl", "lf-" + formId); });
    frag.querySelectorAll(".err").forEach(function (el) {
      var field = el.id.replace("lf-" + formId + "-", "").replace("-err", "");
      el.setAttribute("data-err", field);
      var input = frag.querySelector('[name="' + field + '"]');
      if (input) input.setAttribute("aria-describedby", el.id);
    });
    frag.querySelectorAll(".js-consent-entity").forEach(function (s) { s.textContent = CFG.consentEntity || "the developer and its authorised sales partners"; });
    var form = frag.querySelector("form");
    form.setAttribute("data-form-id", formId);
    var label = slot.getAttribute("data-submit-label");
    if (label) form.querySelector('button[type="submit"]').textContent = label;
    slot.appendChild(frag);

    var started = false;
    form.addEventListener("focusin", function () {
      anyFormStarted = true;
      if (started) return; started = true;
      track("form_start", { form_id: formId });
    });
    form.elements.phone.addEventListener("input", function (e) {
      var v = e.target.value.replace(/[^\d\s]/g, ""); if (v !== e.target.value) e.target.value = v;
    });
    form.addEventListener("submit", function (e) { e.preventDefault(); handleSubmit(form, formId); });
    return form;
  }

  function intentFor(formId) {
    if (formId === "modal") return modalIntent;
    if (formId === "hero" || formId === "hero-m") return "site_visit";
    return "general";
  }

  function handleSubmit(form, formId) {
    var btn = form.querySelector('button[type="submit"]');
    var status = form.querySelector(".form-status");
    if (btn.disabled) return;
    status.textContent = ""; status.className = "form-status";

    var v = validate(form);
    if (!v.ok) { track("form_error", { form_id: formId }); if (v.first) v.first.focus(); return; }

    if (form.elements.company.value || Date.now() - pageLoadedAt < 2500) {
      track("form_blocked", { form_id: formId });
      showError(form, "We couldn't send that. Please try again in a moment, or call ");
      return;
    }

    var intent = intentFor(formId);
    var config = (form.querySelector('input[name="configuration"]:checked') || {}).value || "3 BHK";
    track("form_submit", { form_id: formId, intent: intent, configuration: config || "not_specified" });

    if (submitted) { showSuccess(form, v.name, true, intent); return; }

    if (!CFG.leadEndpoint) {
      console.warn("[Adarsh Lakefront] AL_CONFIG.leadEndpoint is empty, so the lead was NOT sent. Configure it in assets/js/config.js.");
      track("lead_submit_error", { form_id: formId, reason: "no_endpoint" });
      if (CFG.testMode && CFG.thankYouUrl) {
        // Test mode: nothing is sent or saved. Shows the thank-you flow so it can be reviewed before the endpoint exists.
        ss("al_test", "1"); ss("al_name", v.name.split(/\s+/)[0]);
        location.assign(CFG.thankYouUrl);
        return;
      }
      showError(form, "Online enquiries aren't connected on this page yet. Please call ");
      return;
    }

    var payload = {
      project: "Adarsh Lakefront",
      name: v.name,
      phone: v.cc + v.digits,
      country_code: v.cc,
      configuration: config,
      intent: intent,
      consent: true,
      consent_text: form.querySelector(".consent-text").textContent.trim(),
      consent_at: new Date().toISOString(),
      form_id: formId,
      page_url: location.href.split("#")[0],
      submitted_at: new Date().toISOString()
    };
    ATTR_KEYS.concat(["landing_page", "referrer"]).forEach(function (k) { if (attribution[k]) payload[k] = attribution[k]; });

    btn.disabled = true;
    var label = btn.textContent;
    btn.textContent = "Sending…";
    var controller = "AbortController" in window ? new AbortController() : null;
    var timer = setTimeout(function () { if (controller) controller.abort(); }, 15000);

    fetch(CFG.leadEndpoint, {
      method: "POST",
      headers: { "Content-Type": CFG.leadEndpointSimpleRequest ? "text/plain;charset=utf-8" : "application/json" },
      body: JSON.stringify(payload),
      signal: controller ? controller.signal : undefined
    }).then(function (res) {
      clearTimeout(timer);
      if (!res.ok) throw new Error("HTTP " + res.status);
      submitted = true; ss("ss_lead", "1"); unlockPlans();
      track("lead_submit_success", { form_id: formId, intent: intent, configuration: config || "not_specified" });
      ss("al_test", "0"); ss("al_name", v.name.split(/\s+/)[0]);
      if (CFG.thankYouUrl) location.assign(CFG.thankYouUrl);
      else showSuccess(form, v.name, false, intent);
    }).catch(function (err) {
      clearTimeout(timer);
      console.error("[Adarsh Lakefront] lead submit failed", err);
      track("lead_submit_error", { form_id: formId, reason: "network_or_server" });
      btn.disabled = false; btn.textContent = label;
      showError(form, "Something went wrong sending your details. Please try again, or call ");
    });
  }

  function showError(form, lead) {
    var status = form.querySelector(".form-status");
    status.className = "form-status is-error";
    status.textContent = lead;
    var a = document.createElement("a");
    a.href = "tel:" + (CFG.phoneE164 || "+919999999999");
    a.textContent = CFG.phoneDisplay || "99999 99999";
    a.setAttribute("data-cta", "form_error_call");
    status.appendChild(a);
    status.appendChild(document.createTextNode("."));
  }

  function showSuccess(form, name, repeat, intent) {
    var first = name.split(/\s+/)[0];
    var box = document.createElement("div");
    box.className = "form-success"; box.setAttribute("role", "status"); box.setAttribute("tabindex", "-1");
    var tick = document.createElement("div"); tick.className = "tick";
    tick.innerHTML = '<svg aria-hidden="true" viewBox="0 0 24 24" width="22" height="22"><path fill="none" stroke="currentColor" stroke-width="2.4" d="M5 12.5l4.5 4.5L19 7.5"/></svg>';
    var h = document.createElement("h4"); h.textContent = "Thank you, " + first + ".";
    var p = document.createElement("p");
    p.textContent = repeat
      ? "We already have your details from this visit. The Adarsh Lakefront sales team will be in touch."
      : "We've received your details. The Adarsh Lakefront sales team will contact you shortly.";
    box.appendChild(tick); box.appendChild(h); box.appendChild(p);
    if (intent === "floor_plan") {
      var b = document.createElement("button"); b.type = "button"; b.className = "btn btn-dark"; b.textContent = "View floor plans";
      b.addEventListener("click", function () { if (modal.open) modal.close(); if (plans.length) lbOpen(plans, plans[0]); });
      box.appendChild(b);
    }
    if (intent === "brochure" && CFG.brochureUrl) {
      var d = document.createElement("a"); d.className = "btn btn-dark"; d.href = CFG.brochureUrl; d.target = "_blank"; d.rel = "noopener"; d.textContent = "Download brochure";
      d.addEventListener("click", function () { track("brochure_download", {}); });
      box.appendChild(d);
    }
    form.replaceWith(box);
    box.focus();
  }

  document.querySelectorAll(".js-form-slot").forEach(buildForm);

  /* ---------- enquiry popup ---------- */
  var modal = document.getElementById("enquiry-modal");
  var modalTitle = modal.querySelector(".js-modal-title");

  function openEnquiry(intent, config, source) {
    modalIntent = INTENTS[intent] ? intent : "general";
    modalTitle.textContent = INTENTS[modalIntent].title;
    var form = modal.querySelector("form");
    if (form) {
      form.querySelector('button[type="submit"]').textContent = INTENTS[modalIntent].button;
      if (config) { var r = form.querySelector('input[name="configuration"][value="' + config + '"]'); if (r) r.checked = true; }
    }
    if (typeof modal.showModal !== "function") { document.getElementById("contact").scrollIntoView(); return; }
    if (!modal.open) modal.showModal();
    track("popup_open", { intent: modalIntent, source: source || "click" });
    var firstInput = modal.querySelector("input[name=name]");
    if (firstInput && source !== "auto") setTimeout(function () { firstInput.focus(); }, 30);
  }
  modal.addEventListener("click", function (e) {
    if (e.target === modal || e.target.hasAttribute("data-close")) modal.close();
  });
  var popupClosed = false;
  modal.addEventListener("close", function () { popupClosed = true; });

  // Auto-open once per session, only if the visitor hasn't already engaged with a form.
  var delay = Number(CFG.popupDelaySeconds);
  if (delay > 0 && !submitted) {
    setTimeout(function () {
      if (submitted || popupClosed || (document.activeElement && document.activeElement.closest && document.activeElement.closest(".lead-form"))) return;
      if (document.documentElement.classList.contains("ss-editing")) return;
      if (document.querySelector("dialog[open]")) return;
      openEnquiry("general", null, "auto");
    }, delay * 1000);
  }

  /* ---------- CTA tracking + openers (delegated) ---------- */
  document.addEventListener("click", function (e) {
    var el = e.target.closest("[data-cta], .js-open-enquiry, a[href^='tel:'], a[href^='mailto:'], a[href*='wa.me']");
    if (!el) return;
    if (el.classList.contains("js-plan")) return; // tracked by the plan handler
    var cta = el.getAttribute("data-cta") || "";
    var href = el.getAttribute("href") || "";
    if (href.indexOf("tel:") === 0) track("phone_click", { cta_location: cta || "inline" });
    else if (href.indexOf("mailto:") === 0) track("email_click", { cta_location: cta || "inline" });
    else if (href.indexOf("wa.me") > -1) track("whatsapp_click", { cta_location: cta || "inline" });
    else if (cta) track("cta_click", { cta_location: cta, cta_label: (el.textContent || "").trim().slice(0, 60) });
    if (el.classList.contains("js-open-enquiry")) {
      e.preventDefault();
      openEnquiry(el.getAttribute("data-intent") || "general", el.getAttribute("data-config"), "click");
    }
  });

  /* ---------- lightbox ---------- */
  var lb = document.getElementById("lightbox");
  var lbImg = lb.querySelector("img");
  var lbCap = lb.querySelector("figcaption");
  var lbItems = [], lbIndex = 0;
  function lbShow(i) {
    lbIndex = (i + lbItems.length) % lbItems.length;
    var el = lbItems[lbIndex];
    lbImg.src = el.getAttribute("data-full");
    var cap = el.getAttribute("data-caption") || "";
    lbImg.alt = cap; lbCap.textContent = cap;
  }
  function lbOpen(items, el) {
    lbItems = items; lbShow(items.indexOf(el));
    track("image_view", { image: el.getAttribute("data-caption") || "" });
    if (typeof lb.showModal === "function") lb.showModal(); else window.open(el.getAttribute("data-full"), "_blank");
  }
  document.querySelectorAll(".js-lightbox").forEach(function (el) {
    el.addEventListener("click", function () { lbOpen(Array.prototype.slice.call(document.querySelectorAll(".js-lightbox")), el); });
  });
  lb.querySelector(".lb-prev").addEventListener("click", function () { lbShow(lbIndex - 1); });
  lb.querySelector(".lb-next").addEventListener("click", function () { lbShow(lbIndex + 1); });
  lb.addEventListener("click", function (e) { if (e.target === lb || e.target.hasAttribute("data-close")) lb.close(); });
  lb.addEventListener("keydown", function (e) {
    if (e.key === "ArrowRight") lbShow(lbIndex + 1);
    if (e.key === "ArrowLeft") lbShow(lbIndex - 1);
  });

  /* ---------- gated floor plans ---------- */
  var plans = Array.prototype.slice.call(document.querySelectorAll(".js-plan"));
  function onPlan(thumb) {
    track("cta_click", { cta_location: thumb.getAttribute("data-cta") || "plan", cta_label: "View Plan" });
    if (submitted) lbOpen(plans, thumb);
    else openEnquiry("floor_plan", null, "plan");
  }
  plans.forEach(function (thumb) {
    thumb.addEventListener("click", function () { onPlan(thumb); });
    var link = thumb.parentElement.querySelector(".js-plan-link");
    if (link) link.addEventListener("click", function () { onPlan(thumb); });
  });

  /* ---------- hero slider ---------- */
  var slides = Array.prototype.slice.call(document.querySelectorAll(".hero-slides .slide"));
  var dots = Array.prototype.slice.call(document.querySelectorAll(".slide-dots button"));
  var cur = 0, timerId = null;
  var reduced = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  function hydrate(s) {
    s.querySelectorAll("[data-srcset]").forEach(function (x) { x.srcset = x.getAttribute("data-srcset"); x.removeAttribute("data-srcset"); });
    s.querySelectorAll("[data-src]").forEach(function (x) { x.src = x.getAttribute("data-src"); x.removeAttribute("data-src"); });
  }
  function go(i) {
    cur = (i + slides.length) % slides.length;
    hydrate(slides[cur]); hydrate(slides[(cur + 1) % slides.length]);
    slides.forEach(function (s, j) { s.classList.toggle("is-active", j === cur); });
    dots.forEach(function (d, j) { d.setAttribute("aria-pressed", j === cur ? "true" : "false"); });
  }
  function start() { if (!reduced && slides.length > 1) timerId = setInterval(function () { go(cur + 1); }, 5500); }
  dots.forEach(function (d, j) { d.addEventListener("click", function () { clearInterval(timerId); go(j); start(); }); });
  window.addEventListener("load", function () { if (slides[1]) hydrate(slides[1]); start(); });

  /* ---------- walkthrough section: built from AL_CONFIG.videos, hidden while that list is empty ---------- */
  (function () {
    var sec = document.getElementById("walkthrough");
    var vids = (CFG.videos || []).filter(function (v) { return v && v.id; }).slice(0, 4);
    if (!sec) return;
    if (!vids.length) { document.querySelectorAll('a[href="#walkthrough"]').forEach(function (a) { a.remove(); }); return; }
    var thumbs = ["assets/img/facade-1000.webp", "assets/img/living-640.webp", "assets/img/bedroom-640.webp", "assets/img/pool-640.webp"];
    function card(v, i) {
      var art = document.createElement("article"); art.className = "video-card" + (i === 0 ? " video-main" : "");
      var b = document.createElement("button"); b.type = "button"; b.className = "video-thumb js-video";
      b.setAttribute("data-yt", v.id); b.setAttribute("data-title", v.title || "Video"); b.setAttribute("aria-label", "Play: " + (v.title || "video"));
      var img = document.createElement("img"); img.src = thumbs[i]; img.alt = ""; img.loading = "lazy";
      var play = document.createElement("span"); play.className = "play";
      play.innerHTML = '<svg aria-hidden="true" width="' + (i ? 22 : 30) + '" height="' + (i ? 22 : 30) + '"><use href="#i-play"/></svg>';
      b.appendChild(img); b.appendChild(play); art.appendChild(b);
      var h = document.createElement("h3"); h.textContent = v.title || "Walkthrough"; art.appendChild(h);
      if (v.note && i === 0) { var p = document.createElement("p"); p.textContent = v.note; art.appendChild(p); }
      return art;
    }
    var grid = sec.querySelector(".walk-grid");
    grid.appendChild(card(vids[0], 0));
    if (vids.length > 1) {
      var side = document.createElement("div"); side.className = "video-side";
      vids.slice(1).forEach(function (v, k) { side.appendChild(card(v, k + 1)); });
      grid.appendChild(side);
    }
    sec.hidden = false;
  })();

  /* ---------- walkthrough videos (click-to-play, no YouTube load until clicked) ---------- */
  document.querySelectorAll(".js-video").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var id = btn.getAttribute("data-yt");
      if (!id) return;
      track("video_play", { video: btn.getAttribute("data-title") || id });
      // The Claude preview blocks embedded frames, so open YouTube there instead.
      if (window.claude && typeof window.claude.use === "function") {
        window.open("https://www.youtube.com/watch?v=" + id, "_blank", "noopener");
        return;
      }
      var f = document.createElement("iframe");
      f.src = "https://www.youtube-nocookie.com/embed/" + id + "?autoplay=1&rel=0&modestbranding=1";
      f.title = btn.getAttribute("aria-label") || "Adarsh Lakefront video";
      f.allow = "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture";
      f.allowFullscreen = true;
      btn.innerHTML = "";
      btn.appendChild(f);
      btn.classList.add("is-playing");
      btn.removeAttribute("aria-label");
    }, { once: false });
  });

  /* ---------- mobile menu ---------- */
  var menuBtn = document.querySelector(".menu-btn");
  var nav = document.getElementById("site-nav");
  if (menuBtn && nav) {
    var setMenu = function (open) {
      menuBtn.setAttribute("aria-expanded", open ? "true" : "false");
      menuBtn.setAttribute("aria-label", open ? "Close menu" : "Open menu");
      document.documentElement.classList.toggle("menu-open", open);
    };
    menuBtn.addEventListener("click", function () { setMenu(menuBtn.getAttribute("aria-expanded") !== "true"); });
    nav.addEventListener("click", function (e) { if (e.target.closest("a")) setMenu(false); });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape" && menuBtn.getAttribute("aria-expanded") === "true") { setMenu(false); menuBtn.focus(); } });
    document.addEventListener("click", function (e) { if (!e.target.closest(".site-header")) setMenu(false); });
    window.addEventListener("resize", function () { if (window.innerWidth >= 1100) setMenu(false); });
  }

  /* ---------- swipe rows ---------- */
  document.querySelectorAll(".js-prev, .js-next").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var row = document.getElementById(btn.getAttribute("data-target"));
      if (!row) return;
      var item = row.firstElementChild;
      var step = item ? item.getBoundingClientRect().width + 16 : row.clientWidth * 0.8;
      row.scrollBy({ left: btn.classList.contains("js-next") ? step : -step, behavior: "smooth" });
    });
  });

  /* ---------- action bar: show after the hero ---------- */
  var bar = document.querySelector(".action-bar");
  var hero = document.querySelector(".hero");
  if (bar && hero && "IntersectionObserver" in window) {
    new IntersectionObserver(function (entries) { bar.classList.toggle("is-visible", !entries[0].isIntersecting); }, { threshold: 0.05 }).observe(hero);
  } else if (bar) bar.classList.add("is-visible");
})();
