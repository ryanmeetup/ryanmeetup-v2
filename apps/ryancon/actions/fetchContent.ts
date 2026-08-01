"use server";

import * as contentful from "contentful";

const client = contentful.createClient({
  space: process.env.CONTENTFUL_SPACE_ID as string,
  accessToken: process.env.CONTENTFUL_ACCESS_TOKEN as string,
});

const fetchFAQs = async () => {
  const data = await client.getEntries({ content_type: "faq" });

  return data.items.map((entry) => entry.fields).reverse();
};

const fetchSponsors = async () => {
  const data = await client.getEntries({ content_type: "sponsor" });

  return data.items.map((entry) => entry.fields);
};

export { fetchFAQs, fetchSponsors };
