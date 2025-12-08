# MyRocky Headless Frontend

A modern, headless storefront for Rocky built with Next.js App Router. It renders a fast, SEO-friendly frontend while integrating with a WordPress + WooCommerce backend via serverless API routes. This repo focuses on UX, performance, tracking, and a robust checkout that mirrors WooCommerce Store API behavior.

## Tech Stack
- Next.js 15 (App Router)
- React 19
- Tailwind CSS
- Axios for server-to-server calls
- Vercel Analytics & Speed Insights
- WooCommerce REST + Store APIs (headless)
- AWS S3 (presigned uploads)
- PostGrid (CA address autocomplete)

## Project Structure
- `app/`: App Router pages, layouts, and server actions
  - `layout.jsx`: Global layout, fonts, GTM, tracking providers, toast container
  - `middleware.js`: Auth + routing helpers, protected routes, header injection
  - `api/`: Serverless endpoints that proxy/compose backend services
- `components/`: UI and feature modules (cart, checkout, quizzes, product, blog, etc.)
- `lib/`: Backend integrations, domain models, factories
  - `woocommerce.js`: REST client, product/variation helpers, caching
  - `models/`: product category handlers, product types, variation logic
  - `constants/`: shared data (e.g., FAQs, product types)
- `public/`: static assets
- `config/`: product lists and configuration

## Key Behaviors
- Global layout injects:
  - Google Tag Manager
  - Convert Experiences experiments
  - TikTok Pixel (client ID sourced from env)
  - Vercel Analytics and Speed Insights
  - `Navbar`/`Footer` are conditionally hidden for minimal pages
- `middleware.js`:
  - Adds `x-pathname` header for layout decisions
  - Redirects legacy paths (e.g., `/old-blog/*` → `/blog/*`)
  - Enforces auth for protected routes (e.g., `/checkout`, `/cart`, questionnaires)
  - Smart redirect from `login-register` to `checkout` when onboarding params exist
- Image domains configured in `next.config.mjs` to safely optimize remote images

## API Routes (Selected)
All routes are under `app/api/*` and run server-side; they never expose secrets to the browser.

- Auth & Profile
  - `POST /api/login`: Authenticates with WordPress JWT; stores session via httpOnly cookies
  - `POST /api/register`: Two-step validation + user creation via custom WP endpoint; seeds session cookies
  - `GET /api/profile`: Returns merged user, billing, and shipping data from WP
- Cart & Checkout
  - `GET /api/cart`: Loads Woo Store cart or a local cookie-based fallback when unauthenticated
  - `PUT /api/cart`: Updates quantity
  - `DELETE /api/cart`: Removes items (handles variety packs and WL program constraints)
  - `POST /api/checkout`: Calls Woo Store checkout; supports Bambora tokenization and saved cards
- Products
  - `GET /api/products/[slug]` and variants: Product details powered by `lib/woocommerce`
  - `GET /api/products/by-id/[id]`: Product lookup by ID
- Northbeam
  - `POST /api/northbeam/orders`: Normalizes orders and sends to Northbeam with derived tags
- Utilities
  - `POST /api/s3/presigned-url`: Returns a presigned POST policy for S3 uploads (images only)
  - `POST /api/postgrid/address-autocomplete`: Canadian address suggestions via PostGrid
  - Various domain routes: `ed`, `wl`, `hair`, `mental-health`, `blogs`, `search`, etc.

## Environment Variables
Define variables in your deployment environment. Never commit secrets.

- WordPress / WooCommerce
  - `BASE_URL`: Base URL of the WP site (used for REST/Store APIs)
  - `CONSUMER_KEY`: WooCommerce REST key (server-side only)
  - `CONSUMER_SECRET`: WooCommerce REST secret (server-side only)
  - `ADMIN_TOKEN`: Server-only token for custom WP endpoints requiring elevated access
- Session & Site URLs (used for SSR-safe base URL resolution and redirects)
  - `NEXT_PUBLIC_SITE_URL` (public)
  - `SITE_URL`
  - `NEXTAUTH_URL`
  - `VERCEL_URL` (provided by Vercel)
- Tracking
  - `NEXT_PUBLIC_TIKTOK_PIXEL_ID` (public, optional)
  - Vercel Analytics/Speed Insights require no secrets
- Northbeam
  - `NB_CLIENT_ID` or `NORTHBEAM_CLIENT_ID`
  - `NB_API_KEY` or `NORTHBEAM_AUTH_TOKEN`
- AWS S3 (uploads)
  - `AWS_ACCESS_KEY_ID`
  - `AWS_SECRET_ACCESS_KEY`
  - `AWS_REGION`
  - `S3_BUCKET_NAME`
- PostGrid (address autocomplete)
  - `POSTGRID_API_KEY`
- Currency
  - `CURRENCY`: Currency code for server-side usage (e.g., "CAD", "USD") - defaults to "CAD"
  - `NEXT_PUBLIC_CURRENCY`: Currency code for client-side usage (e.g., "CAD", "USD") - defaults to "CAD"

Notes:
- Client-exposed vars must be prefixed `NEXT_PUBLIC_` per Next.js convention.
- Keys like `CONSUMER_SECRET`, `ADMIN_TOKEN`, and Northbeam credentials must remain server-only.

## Local Development
```bash
npm install
npm run dev
```
- App runs at `http://localhost:3000`
- Ensure required env vars are present for any features you test; some routes will fail gracefully if missing

## Deployment
- Designed for Vercel; uses `vercel.json` for redirects/rewrites and a cron to hit `/api/wp-cron`
- Set environment variables in your hosting platform
- `next.config.mjs` restricts allowed remote image hosts

## WooCommerce Integration Highlights
- `lib/woocommerce.js` wraps REST API with:
  - Product fetch by slug and ID
  - Variation normalization (matching legacy PHP shape)
  - In-memory caching for products and variations (30 minutes)
  - Fallback mapping for subscription-type variations
- Store API calls (cart/checkout) are proxied server-side to keep auth secure

## Auth & Cookies
- `authToken` stores Basic credentials (generated from user login) for server-to-server requests
- Additional cookies store user metadata used by the UI
- Middleware protects sensitive routes and preserves `redirect_to` across login

## Styling
- Tailwind is configured in both `tailwind.config.mjs` and `tailwind.config.js`
- Custom animations and gradients
- DatePicker CSS scanning via `./node_modules/react-tailwindcss-datepicker/dist/index.esm.js`

## Analytics & Experiments
- GTM is injected early (`beforeInteractive`), noscript iframe fallback included
- Convert Experiences is loaded globally
- TikTok Pixel is optional and uses a public env var
- Vercel Analytics and Speed Insights are enabled

## Image Optimization
- Remote patterns are explicitly whitelisted in `next.config.mjs`
- Use `next/image` for all external assets from approved domains

## Security & Privacy
- Never log PII or secrets; server logs only contain high-level events
- Secrets are read only in server contexts (`app/api`, Node server code)
- API routes validate inputs, limit file types, and sanitize when possible

## Common Issues
- Missing env variables will throw clear errors (e.g., WooCommerce client validation)
- Cart operations require a fresh `cart-nonce`; the API refreshes it on failure
- Some routes rely on WordPress custom endpoints; ensure they exist on the backend

## Scripts
```json
{
  "dev": "next dev --turbopack",
  "build": "next build",
  "start": "next start",
  "lint": "next lint"
}
```

## License
Proprietary. All rights reserved.
