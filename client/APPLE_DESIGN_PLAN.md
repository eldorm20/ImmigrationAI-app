# Apple-style Design System (Uzbekistan site inspiration)

Purpose: implement a clean, minimal, high-contrast UI inspired by the Apple Uzbekistan site while avoiding use of trademarked assets. This file lists tokens, typography, layout rules, and assets to implement first as a proof-of-concept.

Principles
- Minimal chrome, lots of whitespace
- Large, readable typography with strong hierarchy
- Subtle glass or frosted effects on cards where useful
- High-quality imagery and centered hero sections
- Accessible contrast and responsive scaling

Typography
- Primary: Inter or System UI stack (prefer Inter / SF Pro where available)
- Headings: heavy weight for H1/H2 (700-800); use fluid sizes
- Body: 16px base, 1.125 rem line-height

Color tokens (start small)
- --brand-foreground: #111111
- --brand-muted: #6b6b6b
- --bg: #ffffff
- --bg-muted: #f5f5f7
- --accent: #0071e3 (use sparingly for links / CTAs)

Spacing and layout
- Max content width: 1200px centered
- Generous vertical rhythm (48px sections on desktop)
- Use a centered hero with large H1 and short subhead

Components to update (priority order)
1. Global layout: client/src/components/layout/Layout.tsx and client/src/components/layout/ModernLayout.tsx
2. Header / Navbar: client/src/components/layout/Navbar.tsx and client/src/components/Header.tsx
3. Home hero: client/src/pages/home.tsx
4. Footer: client/src/components/layout/Footer.tsx and client/src/components/layout/footer-new.tsx
5. Buttons and CTA: client/src/components/ui/button.tsx
6. Typography utility classes: global client/src/index.css

Assets
- Replace generic logos with simple wordmark (text SVG) or neutral logo provided by you
- High-resolution hero image (landscape) or gradient placeholder
- Minimal icon set (use lucide-react already in the project)

Accessibility & Legal
- Do not copy or redistribute Apple's proprietary images, fonts, or exact UI assets.
- Use similar visual language (spacing, scale) but original assets.

Implementation notes
- Start by adding CSS tokens to client/src/index.css and a simple hero in client/src/pages/home.tsx.
- Keep changes in a feature branch ui-apple-redesign (create locally and push).
- Test responsiveness and keyboard navigation.

Acceptance criteria (for initial PR)
- New tokens live in client/src/index.css
- Header, hero, and footer updated to the new style
- Basic smoke test: npm run dev (client) loads and shows the new home hero

Next steps after approval
- Replace additional pages/components progressively
- Polish interactions, micro-animations, and component library
- QA and deploy to Railway; ensure AI backend working before final release
