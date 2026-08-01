const validateEmail = (email: string) => /\S+@\S+\.\S+/.test(email);

const isMoreThanTwoWeeksAgo = (dateString: string) => {
  const [month, day, yearValue] = dateString.split("/");
  const year =
    yearValue.length === 2 ? 2000 + Number(yearValue) : Number(yearValue);
  const parsedDate = new Date(year, Number(month) - 1, Number(day));
  const twoWeeksAgo = new Date();
  twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
  return parsedDate < twoWeeksAgo;
};

export { isMoreThanTwoWeeksAgo, validateEmail };
