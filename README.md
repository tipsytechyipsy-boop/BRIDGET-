# BRIDGET — IRL Gaming & Entertainment (front-end demo)

> Connecting the Unconnected. Everything is connected. Can you find the connection?

A clickable front-end demo of the BRIDGET platform. There's no backend:
accounts, applications, approvals and payments are simulated and saved in the browser's `localStorage`.

## Run it

```powershell
python -m http.server 5173
```

Then open http://localhost:5173.

## What's in it

| Page | Route |
|---|---|
| Home (concept, how it works, upcoming, announcements, media, vision) | `#/` |
| Experiences + dossier pages | `#/experiences`, `#/experience/:id` |
| Sign up / log in | `#/join`, `#/login` |
| Game application form | `#/apply/:id` |
| Player dashboard (status tracker, updates, field pass) | `#/dashboard` |
| Checkout (mock Razorpay) | `#/pay/:applicationId` |
| Announcements | `#/announcements` |
| Media (YouTube) | `#/media` |
| Organiser console (select / waitlist / decline, post announcements) | `#/console` |

**Demo journey:** Join → apply for *The Monsoon Cipher* → open the organiser console (footer link) → **Select** yourself → back in the dashboard, **Pay & confirm** → field pass.

There are also 3 hidden glowing nodes on the home page.

## Adding content

All experiences, announcements and media live in [js/data.js](js/data.js). Add an object to add a new game.
Set `youtubeId` on a media item to embed the real video. Text in `[[double brackets]]` is shown as a redaction bar.

## Files

- `index.html`: page shell, nav, footer
- `css/styles.css`: visual design (tokens at the top)
- `js/data.js`: content
- `js/app.js`: router, pages, simulated backend, constellation background

## Next step: the real platform

Next.js + Postgres (Supabase), real auth, Razorpay payments with webhook verification, email/WhatsApp notifications,
and a role-protected organiser console. The page structure and data shapes here map directly onto that build.
