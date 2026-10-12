/*
 * Adarsh Lakefront landing page: deployment configuration.
 * Everything that differs between preview and production lives here.
 * Nothing secret belongs in this file: it is shipped to the browser.
 */
window.AL_CONFIG = {
  /* Lead delivery. POST target that accepts JSON and returns 2xx on success
   * (Vercel function, Google Apps Script web app, Pabbly webhook, Leadrat proxy).
   * Leave empty until a real endpoint exists: the form then refuses to submit
   * and offers the phone number instead of showing a fake success message. */
  leadEndpoint: "",

  /* Send as text/plain to avoid a CORS preflight (needed for Google Apps Script). */
  leadEndpointSimpleRequest: false,

  /* Optional: redirect here after a confirmed submission (thank-you page).
   * Leave empty to show the inline success message instead. */
  thankYouUrl: "/thank-you",

  /* TEST MODE. While true and leadEndpoint is empty, a valid form submit goes to the thank-you page
   * WITHOUT sending or saving the lead (the thank-you page shows a "test mode" notice).
   * Set to false before going live so a missing endpoint can never lose leads silently. */
  testMode: true,

  /* Google Tag Manager container, e.g. "GTM-XXXXXXX". Loaded only when set. */
  gtmId: "",

  /* Phone shown on the page. Placeholder default number.
   * Replace with your own sales number before running ads. */
  phoneDisplay: "99999 99999",
  phoneE164: "+919999999999",

  /* WhatsApp number, digits only with country code, e.g. "919999999999".
   * All WhatsApp buttons stay hidden until this is set. Confirm the number is on WhatsApp. */
  whatsappNumber: "",
  whatsappMessage: "Hi, I'm interested in Adarsh Lakefront, Bellandur. Please share the price and floor plans.",

  /* Auto-open the enquiry popup this many seconds after every page load
   * (skipped once a lead is submitted or while the visitor is typing in a form).
   * 0 disables auto-open; the popup still opens from every Enquire button. */
  popupDelaySeconds: 5,

  /* Optional public brochure URL. If set, a download link is shown after a successful
   * "Download Brochure" enquiry. Leave empty and the sales team sends it instead. */
  brochureUrl: "",

  /* Walkthrough videos (YouTube IDs). The Walkthrough section and its menu link stay
   * hidden while this list is empty. First entry is the large player; up to three more sit beside it.
   * Example: { id: "XXXXXXXXXXX", title: "Project Walkthrough", note: "Lake-facing homes on Outer Ring Road" } */
  videos: [],

  /* Channel-partner / agent RERA number, shown in the footer when set. */
  agentRera: "",

  /* Named in the consent line: who will contact the enquirer. Confirm before launch. */
  consentEntity: "the Adarsh Lakefront sales team and authorised channel partners",

  /* Final site URL for the canonical tag, e.g. "https://www.example.com/". Empty = use the live URL. */
  siteUrl: "",

  /* Full privacy policy URL. The footer link only renders when this is set. */
  privacyUrl: ""
};
