# Salman Coffee (Node.js + React)

Menu site with an admin page. Same stack as the Mizan ERP front end: Express on Node.js for the server, React 18 with Vite for the site.

## Run it

    npm install
    ADMIN_PIN=choose-a-pin npm start        # opens on http://localhost:8080 (PORT=... to change)

- Menu: /
- Admin: /admin (PIN from ADMIN_PIN)

ADMIN_PIN defaults to a PLACEHOLDER (0000). Set your own PIN before the site is shared. Do not put the real PIN in a file that is committed or zipped; see .env.example.

## Change the site

- Items, prices, categories, shop details and colours: /admin. Save writes data.json on the server, so every visitor sees the change on their next load.
- Colour presets are in the admin (dark is first and is the default).
- Photos are in images/ (free licences; credits in images/CREDITS.txt).

## Rebuild the front end

    npm run build      # writes public/ from client/src

## Files

- server/index.js: API (GET/PUT /api/data, POST /api/login) and static serving.
- client/src/: React app (Site.jsx menu and scroll hero, Admin.jsx, styles.css with the colour variables at the top, art.js illustrations).
- data.json: the menu content (no secrets).
