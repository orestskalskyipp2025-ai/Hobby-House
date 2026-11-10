# Project Guidance

## Project Overview

- This is a static, Ukrainian-language storefront for hobby and craft supplies.
- The site has nine standalone pages: `index.html`, `catalog.html`, `product.html`, `cart.html`, `checkout.html`, `confirmation.html`, `about.html`, `contacts.html`, and `account.html`.
- There is no framework, package manifest, build step, or configured test suite. Do not introduce dependencies or a build system for routine changes.
- Store behavior is a front-end demonstration. Cart and order data use browser storage; no data is sent to a server.

## Structure and Conventions

- Keep page content in its existing HTML file. The shared header and footer are duplicated across pages, so update matching markup consistently when changing shared navigation or footer behavior.
- `styles.css` owns global styles, responsive layout, and design tokens. `pages.css` is loaded after it and owns styles for inner pages; reuse the existing CSS variables and component conventions.
- `assets/js/site.js` is the shared vanilla JavaScript entry point. It handles the mobile menu, catalog, cart, checkout, and confirmation flows. Keep page-specific initialization compatible with the existing `data-page` attributes and absent elements on other pages.
- `assets/img/` contains the site's image assets. See `assets/img/README.md` for the expected filenames and replacement guidance.
- Preserve the document language (`uk`), existing semantic HTML, accessible labels and states, and keyboard-visible focus styles. Keep visible copy in Ukrainian.

## Making and Checking Changes

- Keep edits focused and follow the existing HTML, CSS, and ES5-style JavaScript patterns.
- Preserve links, image paths, and shared behavior across all pages when changing common components or data.
- No automated checks are configured. For behavior or markup changes, verify the affected page in a browser and check relevant mobile and desktop layouts; for shared behavior, check each affected flow/page.