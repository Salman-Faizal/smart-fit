# Smart Fit

### Personalized menswear shopping, backed by retail insights.

Smart Fit is a full-stack fashion e-commerce application that brings together a customer storefront and an admin workspace. Customers can discover clothing through a style quiz and behavior-based recommendations, while administrators manage products, orders, customers, reports, and inventory forecasts.

**[Explore the demo](https://smart-fit-alpha.vercel.app)** · **[Features](#features)** · **[Local setup](#local-setup)** · **[Screenshots](#screenshots)**

> The demo URL is listed in this repository's About section. Customer shopping routes require sign-in; new registrations use email verification. No shared demo credentials are provided here.

## Features

### Customer experience

- **Product discovery:** search with suggestions, product details, trending products, new arrivals, and an infinite-scroll discovery feed.
- **Style quiz:** recommendations based on category, budget, fit, style, and occasion preferences.
- **Personalized shopping:** “Top Picks For You,” “Customers Also Viewed,” and checkout suggestions informed by browsing, wishlists, cart activity, and purchases.
- **Wishlist and cart:** save products and move through a checkout workflow.
- **Payments:** Stripe Checkout or manual bank transfer with payment-slip uploads.
- **Account management:** email OTP registration, sign-in, profile and avatar updates, saved addresses, password changes, and order history.
- **Transactional email:** verification, welcome, and order/payment updates.

### Admin workspace

- **Dashboard:** revenue charts, weekly statistics, category performance, a conversion funnel, top products, monthly targets, and low-stock visibility.
- **Catalog management:** create and edit products, manage categories and stock, and upload product images.
- **Order and customer management:** review orders and manual payments, update order states, and manage customers.
- **Reports:** sales summaries, revenue breakdowns, product/category performance, customer insights, and inventory snapshots.
- **Stock forecasting:** estimated days until stockout, stock-risk classifications, suggested restock quantities, sales trends, and a 14-day sales projection.
- **Store settings:** administration settings and recommendation maintenance actions.

## How recommendations and forecasting work

The intelligence features are implemented in JavaScript on the server:

| Area | Implemented approach |
| --- | --- |
| Personalized picks | Weighted interaction signals, category preferences, price proximity, trending scores, and product recency, with trending fallbacks for users with little activity. |
| Related products | Co-view activity within a time window, with wishlist/purchase boosts and category-based fallbacks. |
| Style quiz | Product filtering and weighted scoring against quiz answers, using product attributes and keyword fallbacks. |
| Discovery feed | A mix of personalized products, unfamiliar categories, trending items, and new arrivals with cursor pagination. |
| Checkout suggestions | Wishlist intent, repeated views, complementary categories, and trending fallback products. |
| Inventory forecast | Average daily sales over a 30-day window, with a 90-day fallback, stockout estimates, week-over-week trends, and heuristic sales projections. |

These are scoring, collaborative filtering, and statistical heuristics; the repository does not include a separate trained ML model or an external LLM integration. Recommendation quality and forecast usefulness depend on the available catalog and activity/sales data.

## Tech stack

| Layer | Technologies |
| --- | --- |
| Frontend | React 19, Vite 8, React Router 7, Tailwind CSS 3 |
| UI and reporting | Lucide React, Recharts, jsPDF |
| Backend | Node.js, Express 5, CommonJS |
| Database | MongoDB, Mongoose 9 |
| Authentication | JSON Web Tokens, bcryptjs, role-based route protection |
| Images and uploads | Cloudinary, Multer |
| Payments | Stripe Checkout and webhooks, manual bank transfers |
| Email and scheduling | Nodemailer with Gmail, node-cron |

## Repository structure

| Path | Purpose |
| --- | --- |
| `client/src/pages/customer/` | Storefront, product details, search, checkout, and customer profile pages |
| `client/src/pages/admin/` | Dashboard, catalog, orders, customers, reports, forecasting, and settings |
| `client/src/components/` | Shared layouts, product UI, recommendation sections, and style quiz |
| `client/src/context/` | Authentication and wishlist state |
| `client/src/lib/` | API requests, storage, formatting, and activity tracking |
| `client/src/routes/` | Authentication and role guards |
| `server/routes/` | API route definitions |
| `server/controllers/` | Request handling, including inventory forecasting |
| `server/services/` | Business logic, recommendations, payments, email, and analytics |
| `server/models/` | MongoDB schemas |
| `server/middleware/` | Authentication and upload handling |
| `server/scripts/` | Admin creation, quiz diagnostics, and synthetic activity/sales data |
| `server/.env.example` | Backend environment template |

## Local setup

### Prerequisites

- Git, npm, and a recent Node.js runtime. **Node.js 22.12+ is a suitable baseline** for the Vite 8 toolchain.
- A local MongoDB instance or MongoDB Atlas database.
- A Gmail account with an app password for registration and transactional email.
- Cloudinary credentials for image and payment-slip uploads.
- Stripe test credentials if you want to exercise card payments.

### 1. Clone and install

```bash
git clone https://github.com/Salman-Faizal/smart-fit.git
cd smart-fit

npm ci --prefix server
npm ci --prefix client
```

The client and server have separate dependency manifests; there is no root-level install or start script.

### 2. Configure the backend

Copy `server/.env.example` to `server/.env`. Replace its placeholders and use these local URLs:

```dotenv
MONGO_URI=mongodb://127.0.0.1:27017/smart-fit
JWT_SECRET=replace-with-a-long-random-secret

PORT=3000
CLIENT_URL=http://localhost:5173
CORS_ORIGIN=http://localhost:5173

# Add these: they are used by the email service but absent from .env.example.
FRONTEND_URL=http://localhost:5173
GMAIL_USER=your-email@gmail.com
GMAIL_APP_PASSWORD=your-gmail-app-password

CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret

# Needed for Stripe checkout and webhook processing.
STRIPE_SECRET_KEY=sk_test_replace_me
STRIPE_WEBHOOK_SECRET=whsec_replace_me
STRIPE_CURRENCY=usd
```

Generate a JWT secret with:

```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

Use real credentials in your local environment and keep them out of version control. Gmail configuration is needed to receive registration codes; Cloudinary is needed for uploads. Stripe credentials are needed only for its payment flow.

**Currency configuration:** the UI formats prices in LKR, while the Stripe configuration defaults to `usd` and sends the stored numeric prices without currency conversion. Verify the currency and amount configuration before exercising payments, and use Stripe test mode for development.

### 3. Point the frontend at your local API

Create `client/.env.local`:

```dotenv
VITE_API_BASE_URL=http://localhost:3000
```

Use the API origin; the client appends `/api`. This override matters because `client/src/lib/api.js` otherwise defaults to the hosted Render API. Although Vite also defines a local `/api` proxy, the default API helper uses an absolute hosted URL.

Restart Vite after changing environment values.

### 4. Start both applications

In one terminal:

```bash
cd server
node server.js
```

In another:

```bash
cd client
npm run dev
```

Open **http://localhost:5173**. The backend defaults to **http://localhost:3000**; its root endpoint returns `API Running...`.

Register a customer account and verify the email code. For admin access, promote that account's `role` to `admin` in your local MongoDB database, then sign in again to obtain a token with the updated role.

The repository also includes `server/scripts/createAdmin.js`, but it contains fixed example credentials and does not load dotenv itself. Review and replace those values before using it; the account-promotion approach above avoids relying on those defaults.

### 5. Add catalog data

Use the admin product screens to populate the store. No complete catalog seed is included. Recommendation sections need eligible products; personalized results need interaction history, and sales-based forecasts need paid orders.

The scripts in `server/scripts/` include synthetic interaction and sales data helpers. Inspect their behavior before running them and use a disposable development database.

### Optional: Stripe webhooks locally

With the Stripe CLI installed and authenticated:

```bash
stripe listen --forward-to localhost:3000/api/payments/stripe-webhook
```

Set the emitted signing secret as `STRIPE_WEBHOOK_SECRET`, restart the backend, and keep the listener running during test payments. The port above matches the server's default of 3000.

## Build and checks

Run from `client/`:

```bash
npm run build
npm run preview
npm run lint
```

`build` generates `client/dist/`; `preview` serves that build locally. Set `VITE_API_BASE_URL` to the intended backend origin **before building**.

The backend is started with `node server.js`. Its current `npm test` script is a placeholder that exits with an error; no automated test suite is configured in the package scripts.

For deployment, configure the frontend API URL, backend database/service credentials, `CLIENT_URL`, `FRONTEND_URL`, and allowed `CORS_ORIGIN` values for the deployed origins. A Vercel SPA rewrite is included in `client/vercel.json`.

## Screenshots

Screenshots are pending. Suggested captures:

| View | Placeholder |
| --- | --- |
| Customer storefront and recommendations | Add `docs/screenshots/storefront.png` |
| Product details and related products | Add `docs/screenshots/product-details.png` |
| Style quiz and results | Add `docs/screenshots/style-quiz.png` |
| Checkout | Add `docs/screenshots/checkout.png` |
| Admin dashboard | Add `docs/screenshots/admin-dashboard.png` |
| Inventory forecasting | Add `docs/screenshots/inventory-forecast.png` |

<!-- Replace the table placeholders with embedded images once the files exist.
Example: ![Smart Fit customer storefront](docs/screenshots/storefront.png)
-->

## Development acknowledgment

This project was developed with assistance from **Claude Code**, particularly for the recommendation and forecasting logic, while I was building experience with these algorithms.

## Author

**[Salman Faizal](https://github.com/Salman-Faizal)**
