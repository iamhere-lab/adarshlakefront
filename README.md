# Adarsh Lakefront landing page

Static site (HTML, CSS, JS). No build step. Deploys on Vercel as-is.

- `index.html`: landing page
- `thank-you.html`: shown after an enquiry (served at `/thank-you`)
- `assets/js/config.js`: everything to set before going live

## Before going live

Edit `assets/js/config.js`:

1. `leadEndpoint`: URL that receives the lead as JSON (Apps Script, Pabbly, Leadrat proxy).
2. `testMode`: set to `false` once the endpoint works. While `true`, forms go to the thank-you page without saving the lead.
3. `phoneDisplay` / `phoneE164`: replace the placeholder 99999 99999.
4. Optional: `whatsappNumber`, `gtmId`, `videos`, `agentRera`, `privacyUrl`, `siteUrl`.
