# Telco Jargons

A minimal, distraction-free lookup for telecom abbreviations. Type an abbreviation (or part of its full form) and pick a suggestion to see what it stands for.

```
FOC  → Free of Cost
ECM  → Ericsson Catalog Management
EOC  → Ericsson Order Care
DOB  → Direct Operator Billing
DCB  → Direct Carrier Billing
BSS  → Business Support System
EDW  → Enterprise Data Warehouse
```

It's a static site: one `index.html` page, a little JavaScript, and a `jargon.json` data file. GitHub Actions tests it and deploys it to GitHub Pages.

## Using the site

- The search box has focus as soon as the page loads, so you can start typing right away.
- Suggestions update as you type. The search waits until you pause (200 ms debounce), so it doesn't run on every keystroke.
- Matching ignores case and ranks results as: exact abbreviation, then abbreviation prefix, then abbreviation substring, then a match in the full form. For example, `carrier` finds **DCB**.
- Click a suggestion, or use the keyboard, to see the full form and a short description.

| Key | Action |
| --- | --- |
| `↑` / `↓` | Move through suggestions |
| `Enter` | Select the highlighted suggestion (or the top one) |
| `Esc` | Close the suggestion list |
| `/` | Jump back to the search box from anywhere on the page |

## Project structure

```
index.html                    The single page (Tailwind CSS via the browser CDN build)
app.js                        Search, debounce, suggestions, keyboard handling
jargon.json                   The jargon data — edit this to add terms
assets/gp-logo.webp           Grameenphone logo shown above the title (add it yourself, see below)
assets/fonts/Telenor.ttf      Telenor brand font (add it yourself, see below)
scripts/serve.mjs             Tiny static server for local preview and tests
tests/search.spec.js          Playwright end-to-end tests
playwright.config.js          Playwright configuration
.github/workflows/deploy.yml  CI: run tests, then deploy to GitHub Pages
```

## Brand assets

The logo and font files aren't in the repo. Add the official files at these paths:

- `assets/gp-logo.webp`: the Grameenphone logo. If the file is missing, the logo is hidden.
- `assets/fonts/Telenor.ttf`: the Telenor font. If the file is missing, the page uses Telenor when it's installed locally, and otherwise a system sans-serif font.

## Running locally

You need Node.js 20 or newer.

```bash
npm install
npm start            # serves the site at http://localhost:4173
```

Open the page through the server, not as a `file://` path, because the browser blocks `fetch('jargon.json')` from local files.

### Tests

```bash
npx playwright install chromium   # first time only
npm test
```

The tests type each example abbreviation one character at a time, check that the right suggestion appears, select it by mouse and by keyboard, and check that the correct full form is shown. They also cover debouncing, searching by full form, the "no match" state, closing the list with `Esc`, and validation of `jargon.json` (required fields, no duplicate abbreviations).

## Deployment

Every push to `main` runs [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml):

1. **test**: installs dependencies and runs the Playwright suite.
2. **deploy**: if the tests pass, publishes `index.html`, `app.js` and `jargon.json` to GitHub Pages.

Pull requests run only the test job.

**One-time setup:** in the repository, go to **Settings → Pages → Build and deployment** and set **Source** to **GitHub Actions**.

## Contributing

Contributions are welcome, especially new jargon.

### Requesting a jargon

If a search finds nothing, the page shows a **Missing? Request …** link. It opens a new GitHub issue with the abbreviation already filled in. Add the full form if you know it, and a maintainer or another contributor will add it to `jargon.json`.

### Adding or fixing a jargon

1. Fork the repo and create a branch, e.g. `add-volte`.
2. Add an entry to [`jargon.json`](jargon.json):

   ```json
   { "abbr": "VoLTE", "full": "Voice over LTE", "description": "Voice calls carried over the 4G LTE data network." }
   ```

   - `abbr` (required): the abbreviation as it's usually written.
   - `full` (required): the expanded form.
   - `description` (optional): one short sentence of context.
   - Abbreviations must be unique (case-insensitive). The tests enforce this.
   - Keep the file valid JSON: no trailing commas, double quotes only.
3. Run `npm test` to make sure everything passes.
4. Open a pull request. CI runs the tests on it automatically.

### Changing code or UI

- Keep the UI minimal: one search box and the result, nothing more.
- Styling uses Tailwind utility classes directly in the markup. Behavior is plain JavaScript in `app.js`, with no frameworks or build step.
- If you change behavior, add or update a test in `tests/search.spec.js`.
