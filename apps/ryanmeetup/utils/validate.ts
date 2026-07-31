// Use regex to validate that some text follows string@string.string format
export const validateEmail = (email: string) => {
  const re = /\S+@\S+\.\S+/;
  return re.test(email);
};

// Compare two dates and see if they're more than 2 weeks apart
export const isMoreThanTwoWeeksAgo = (dateString: string) => {
  const [month, day, yearStr] = dateString.split("/");

  // Handle 2-digit or 4-digit years
  const year = yearStr.length === 2 ? 2000 + Number(yearStr) : Number(yearStr);

  const parsedDate = new Date(year, Number(month) - 1, Number(day));

  const now = new Date();
  const twoWeeksAgo = new Date(now);
  twoWeeksAgo.setDate(now.getDate() - 14);

  return parsedDate < twoWeeksAgo;
};
