# Weekend Planner ☀️

**Plan your Saturday and Sunday in 2 minutes** in Hyderabad, Bengaluru, Mumbai, Delhi NCR and Pune.

🔗 **Live site:** https://abhinandankainth.github.io/Weekend-Planner/

Weekend Planner is a fast, free, no-login static site. Pick your city and who's coming, then take a ready-made weekend plan or build your own. Share it on WhatsApp or add it to your calendar.

## Features

| | |
|---|---|
| 🗺️ **5 cities** | About 150 hand-picked places and 25 ready-made weekend plans |
| 👯 **Who's coming?** | Friends, Solo, Couple, Family + kids, With parents. Plans and places adapt to your group |
| 💸 **Budget first** | Free, under ₹300, and under ₹1,000 filters. Every place shows an approximate cost per person, and the planner adds up a total for your group |
| 🗓️ **My weekend builder** | Add places to Sat or Sun, edit times, move items between days, and undo mistakes. It warns you about overlaps and overpacked days |
| 📤 **Share & export** | WhatsApp, native share, copy a link (it carries the dates, so your friend sees the same weekend and can save the plan), calendar (.ics) export, and print |
| 🌧️ **Weather-proof** | "Indoor only" filter for rain, heat or smog days. Seasonal places are flagged automatically |
| 👵 **Inclusive** | English and हिंदी UI, 3 text sizes, low-walking/elder-friendly filter, accessibility notes, and tap-to-call emergency helplines |
| ⚡ **Light & offline** | No frameworks, no web fonts, works offline as a PWA, and runs well on budget Android phones |
| 🌙 **Power-user friendly** | Dark mode and keyboard shortcuts (`/` search, `1` `2` `3` tabs, `s` surprise, `d` dark, `?` help) |
| 🔒 **Private** | No login, no ads, no trackers, no cookies. Plans stay in your browser's localStorage |

## Who it's built for

The design was reviewed against the user personas from the AI-Persona-Maker product team:

- **Ananya (18, student, Pune):** free and budget filters, a budget friends plan in every city (about ₹500–₹1,100 per person for the whole weekend, travel extra), a WhatsApp-first share option, and a small download on patchy Wi-Fi.
- **Karthik (25, engineer, Bengaluru):** dark mode, keyboard shortcuts, calendar export, and a solo plan with breweries and treks. No sign-up and no dark patterns.
- **Neha (34, manager, Mumbai):** couple date-weekend plans, a "With parents" plan for hosting in-laws, and a shareable link so she can plan the weekend with her spouse.
- **Rajesh (40, parent, Noida):** family and elder plans, a low-walking filter, large text, Hindi buttons and place names (descriptions are still in English, and the app says so), clear per-person and group totals, emergency numbers, and a "we never ask for payment" promise.

## Project layout

```
index.html               App shell
assets/app.js            All app logic (routing, filters, builder, share, .ics, shortcuts)
assets/i18n.js           English + Hindi UI strings
assets/styles.css        Mobile-first styles, light/dark, text sizes, print
data/cities.js           City registry (loaded first, tiny)
data/<city>.js           Per-city data, lazy-loaded when the city is opened
sw.js                    Service worker (offline support)
scripts/validate-data.js Data validator (runs in CI)
.github/workflows/       Validate + deploy to GitHub Pages on every push to main
```

## Run locally

```bash
python3 -m http.server 8000
# open http://localhost:8000
node scripts/validate-data.js   # check all city data
```

## Add or edit places

Each city file calls `WP.registerCity({...})` with `activities` and `itineraries`. Copy an existing entry and keep the same fields: `cost` is an approximate per-person cost in ₹ (use 0 for free), `goodFor` uses `friends|solo|couple|family|elders`, and `months` is optional and only for seasonal places. Then run `node scripts/validate-data.js`. CI blocks a deploy if the data is invalid or if a persona name (Ananya, Karthik, Neha, Rajesh) leaks into user-visible text. The validator also warns when a curated stop starts before the previous one ends.

To add a new city, add it to `data/cities.js`, create `data/<id>.js`, and add the file to the `SHELL` list in `sw.js`.

## Disclaimer

Prices, timings and closures are approximate. They were checked in October 2026 and can change. Always confirm on official sites before you go. Found a mistake? [Open an issue](https://github.com/AbhinandanKainth/Weekend-Planner/issues/new).
