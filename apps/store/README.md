# Ryan Meetup Store

Headless Shopify storefront for `store.ryanmeetup.com`. Product and collection pages are rendered from the Shopify Storefront API, while checkout stays on Shopify. Judge.me supplies product reviews.

## Local development

From the repository root:

```sh
npm install
npm run dev:store
```

Copy `.env.example` to `.env.local` and add the development-store credentials. Without Shopify credentials, the app deliberately starts in a labeled preview mode with a small demo catalog and local cart; checkout and review submission remain disabled.

## Shopify setup

- Create public Storefront API access for products, collections, and carts.
- Set the headless storefront domain and checkout return URL to `https://store.ryanmeetup.com/thank-you`.
- Install/connect Printful in Shopify and map every Shopify variant to the matching Printful SKU.
- Customize checkout branding in Shopify Admin.
- Configure a catalog revalidation webhook before launch if five-minute ISR freshness is not sufficient.

## Judge.me setup

Install Judge.me in the same Shopify store and provide its private API token server-side. Published reviews are read during product-page rendering; new reviews post through the server route and follow Judge.me moderation settings.
