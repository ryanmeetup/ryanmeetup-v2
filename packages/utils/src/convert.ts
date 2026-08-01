export type ContentfulImageLike = {
  fields?: { file?: { url?: string } };
};

const convertDateToDateTimeString = (date: Date) => {
  const value = new Date(date);
  const dateString = value.toDateString();
  return `${dateString.slice(0, 3)}, ${dateString.slice(4, 8)} ${value.getDate()}, ${value.getFullYear()}`;
};

const convertShortDate = (date: Date) => {
  const value = new Date(date);
  const dateString = value.toDateString();
  return `${dateString.slice(4, 8)} ${value.getDate() + 1}, ${value.getFullYear()}`;
};

const convertImageUrl = (file?: ContentfulImageLike | null) => {
  const route = file?.fields?.file?.url;
  return route ? `https://${route.replace("//", "")}` : undefined;
};

const convertSlug = (slug: string) =>
  slug
    .replaceAll("-", " ")
    .split(" ")
    .map((word) => (word ? word[0].toUpperCase() + word.slice(1) : word))
    .join(" ");

const filterInstagram = (url: string) =>
  url.split("https://www.instagram.com/")[1];

export {
  convertDateToDateTimeString,
  convertImageUrl,
  convertShortDate,
  convertSlug,
  filterInstagram,
};
