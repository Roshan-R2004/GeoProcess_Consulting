# GeoProcess Consulting — Organized + Futuristic Website

This version keeps the supplied website content and assets while separating the shared design system from page-specific CSS and JavaScript.

## Structure

- `index.html`, `about.html`, `services.html`, `projects.html`, `videos.html`, `study.html`, `contact.html`, `booking.html` — public pages
- `css/style.css` — base/shared layout styles
- `css/theme.css` — **shared futuristic visual system**: typography, navigation, logo treatment, email dropdown, cards, motion, forms, footer and responsive behavior
- `css/pages/` — page-only styles
- `js/main.js` — shared navigation, universal email dropdown, scroll reveal, back-to-top and year handling
- `js/pages/` — page-specific JavaScript and the Study Hub application
- `js/legacy/booking-api.js` — supplied legacy booking API kept for reference
- `assets/images/` — supplied project imagery
- `assets/videos/` — supplied demonstration videos
- `assets/brand/logo-mark.png` — compact mark derived from the supplied master logo for future favicon/brand use
- `archive/study-reference-legacy.html` — preserved legacy Study/Source Library artifact

## Design rules

- The supplied `Cover.png` master logo is used consistently in the global header on every page.
- Every page uses the same global navigation and the same Email dropdown structure.
- FAQs are linked consistently to `index.html#faqs` from the site shell and footer.
- The Study Hub keeps its original large study content and adds a separate topic rail beneath the shared site header.
- CSS is externalized; there are no page `<style>` blocks or inline `style=` attributes in the public HTML pages.
- Shared motion uses lightweight CSS animations and `IntersectionObserver`; reduced-motion preferences are respected.

## Booking

The Google Calendar booking component still needs the real Google booking URL/embed configuration. No private or guessed credentials were inserted.
