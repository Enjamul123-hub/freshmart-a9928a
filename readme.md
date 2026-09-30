# FreshMart

A responsive grocery-shopping storefront with a local demo mode and a Node.js/PostgreSQL API foundation. The customer-facing flow currently supports browsing, search, department filters, quick add, a persistent basket and wishlist, delivery location, substitution preference, cash-on-delivery checkout, and order confirmation.

## Run the storefront

1. Install Node.js 20 or later.
2. Open a terminal in `frontend/` and run `npm install`.
3. Run `npm run dev` and open the local URL Vite prints (normally `http://localhost:5173`).

The storefront also works directly from `frontend/index.html` without Node.js. It uses sample catalog data and browser local storage in that mode. Product reads switch to the REST API when it is available at `http://localhost:4000/api`.

## Run the API

1. Install PostgreSQL and create a database named `freshmart`.
2. Run `database/schema.sql`, followed by `database/seed.sql`, against that database.
3. Copy `backend/.env.example` to `backend/.env` and set a private `DATABASE_URL` and random `JWT_SECRET`.
4. Open a second terminal in `backend/`, run `npm install`, then `npm run dev`.
5. Check `http://localhost:4000/api/health` and `http://localhost:4000/api/products`.

Never commit `.env` files or store raw card details. Online payment is intentionally disabled until a payment provider and server-side verification are configured. The browser checkout is a front-end demonstration and does not call the order API yet; the API can create transactional COD orders when given product UUIDs, a valid zone postal code, and a bookable slot UUID.

## Project steps

1. **Storefront foundation:** responsive layout, catalog, search, filters, product cards, and mobile navigation.
2. **Shopping flow:** persistent cart and wishlist, location selection, substitution choice, COD checkout, and confirmation.
3. **API and data model:** Express product API and PostgreSQL tables for products, stock batches, addresses, orders, payments, and delivery slots. COD order writes reserve FEFO stock and slot capacity in a database transaction.
4. **Next production steps:** add account/auth endpoints and roles, connect the browser checkout to the order API, integrate a Bangladesh payment provider, then add agent/admin workflows, reviews, coupons, notifications, and deployment monitoring.

## Current API endpoints

- `GET /api/health`
- `GET /api/products?q=&category=&limit=&offset=`
- `GET /api/products/:id`
- `POST /api/orders` (transactional order, COD payment, delivery, slot booking, and FEFO inventory reservation)

The `frontend/api.js` client uses the live product endpoints when reachable and falls back to the local catalog when it cannot connect. This keeps the shopping UI usable before the database is configured.
