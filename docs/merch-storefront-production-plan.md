# Merch Storefront Production Plan

## Overview

Use this repo as the storefront app and keep Shopify as the commerce system of record. This is the lowest-complexity path because the Ryan Meetup design system already exists here, `/merch` already exists as a stable route, and Shopify's Storefront API supports custom product browsing, carts, and handoff to Shopify checkout. Printful then plugs into Shopify for fulfillment, tracking, and shipping sync rather than requiring a custom order pipeline.

## Target Architecture

- Frontend: current Next.js app on `ryanmeetup.com`
- Commerce backend: Shopify
- Fulfillment: Printful connected to Shopify
- Content and brand/editorial: current site patterns, with Contentful optional for merch storytelling later if needed
- Checkout: Shopify-hosted
- Emails, receipts, and order status: Shopify notifications and Shopify order status page
- Analytics: existing Vercel analytics plus Shopify order reporting

## Source Of Truth

- Shopify owns:
  - products
  - variants
  - prices
  - inventory state
  - collections
  - cart and checkout linkage
  - discounts
  - orders
  - customer receipts and order status
- Printful owns:
  - print files
  - fulfillment sync
  - production and shipping events
  - Printful shipping logic
- Frontend owns:
  - presentation
  - product discovery UX
  - merchandising layout
  - cart experience before checkout redirect
- Contentful stays optional and should not be required for launch.

## Implementation Phases

### 1. Foundation

- Create a free Shopify development store through a Partner account.
- Connect a Printful account to that Shopify store.
- Keep this repo as the storefront repo rather than creating a new repo.
- Reserve the final URL structure now:
  - `ryanmeetup.com/merch`
  - `ryanmeetup.com/merch/products/[handle]`

### 2. Catalog Setup

- In Printful, create the first real products and publish or sync them into Shopify.
- In Shopify, organize products into collections such as `featured`, `shirts`, `hats`, and `event drops`.
- Add Shopify product metadata only where the storefront needs more control:
  - short badge text
  - featured color
  - launch date
  - limited run flag
  - lifestyle image overrides
- Do not create products manually in two systems.

### 3. Storefront UX

- Replace the Etsy redirect on `/merch` with:
  - merch landing page
  - collection grid
  - product detail pages
  - cart drawer or cart page
- Reuse the in-house design system directly:
  - `Card` for product tiles
  - `Button` for add-to-cart and checkout CTAs
  - `Heading` and `Text` for merch hierarchy
- UX requirements:
  - the storefront should feel like a native Ryan Meetup section, not a bolted-on shop
  - keep the entire pre-checkout experience on-brand
  - treat Shopify as backend infrastructure, not the visual layer

### 4. Cart And Checkout

- Use Shopify Storefront API for cart creation and updates.
- Keep cart state in the app.
- Redirect to Shopify's `checkoutUrl` when the user starts checkout.
- Accept that checkout styling will be less flexible than the storefront itself.

### 5. Printful Fulfillment

- Verify every sellable variant is fully synced in Printful.
- Use native Shopify variants only.
- Avoid advanced custom option systems unless they are necessary and tested, because variant sync can break when options are modeled outside the standard Shopify flow.
- Confirm fulfillment ownership and inventory setup are correctly assigned to Printful in Shopify.

### 6. Shipping, Tax, And Notifications

- Start with the simplest viable shipping model:
  - either bake shipping into retail price and present simple shipping to users
  - or use Printful flat rates initially
- Be aware that flat-rate shipping can undercharge on multi-item carts in some configurations.
- If that becomes a problem, move to Printful live shipping rates.
- Use Shopify customer notifications for:
  - order confirmation
  - shipping confirmation
  - tracking updates
  - refunds and cancellations

### 7. Launch Operations

- Test:
  - add to cart
  - variant selection
  - discount codes
  - checkout redirect
  - paid test order
  - Printful import
  - fulfillment and tracking sync
  - customer emails
- Turn on a production Shopify plan only when ready to accept live orders.
- Move domain and production customer-facing settings only after end-to-end checkout passes.

## Concrete Deliverables

- Merch landing page
- Collection listing pages
- Product detail page
- Cart
- Shopify checkout redirect
- Shopify notifications branded to Ryan Meetup
- 3 to 10 launch SKUs fully synced in Printful
- Basic policy pages:
  - shipping
  - returns
  - contact
- Internal runbook for:
  - adding a new product
  - retiring a product
  - handling a failed Printful sync
  - refunding an order

## Operating Model For New Products

1. Create the product in Printful.
2. Push or sync it to Shopify.
3. Assign the Shopify collection and metadata.
4. Let the custom frontend surface it automatically.
5. Test at least one variant before publishing broadly.

This keeps the workflow clean and avoids duplicate manual entry.

## What Not To Do In V1

- Do not split product truth across Shopify and Contentful.
- Do not build a custom checkout.
- Do not add a reviews platform in phase 1.
- Do not use advanced custom-option apps unless a specific merch use case forces it.
- Do not start with mixed fulfillment providers if it can be avoided.

## Main Risks

- Shipping logic can get messy quickly with multi-item carts and Printful flat-rate profiles.
- Checkout will visually diverge from the storefront because Shopify hosts it.
- Product sync discipline matters; unsynced variants will not fulfill correctly.
- If the store later needs highly custom bundles, subscriptions, or mixed inventory providers, complexity rises sharply.

## Recommended Sequence

- Phase 1: Shopify dev store plus Printful connection plus sample catalog
- Phase 2: design and build storefront UX inside this repo
- Phase 3: cart and checkout handoff
- Phase 4: notifications, shipping rules, policies, and QA
- Phase 5: launch live Shopify plan and replace the Etsy flow

## Reference Sources

- Shopify custom storefronts: <https://shopify.dev/docs/storefronts/headless/building-with-the-storefront-api/products-collections>
- Shopify Storefront API cart creation: <https://shopify.dev/docs/api/storefront/latest/mutations/cartCreate>
- Shopify custom storefront overview: <https://shopify.dev/docs/storefronts/headless/getting-started>
- Shopify customer notifications: <https://help.shopify.com/en/manual/fulfillment/setup/notifications/customer-notifications>
- Shopify order status tracking: <https://help.shopify.com/en/manual/orders/status-tracking>
- Printful Shopify shipping setup: <https://help.printful.com/hc/en-us/articles/360014007440-How-do-I-set-up-shipping-for-my-Shopify-store>
- Printful Shopify tracking sync: <https://help.printful.com/hc/en-us/articles/360014006880-How-does-Shopify-know-when-my-Printful-orders-are-shipped>
