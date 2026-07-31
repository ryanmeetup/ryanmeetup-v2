const buildContactHref = (subject: string, message: string) =>
  `/contact?subject=${encodeURIComponent(subject)}&message=${encodeURIComponent(
    message,
  )}`;

const contactHrefs = {
  general: buildContactHref(
    "General Inquiry",
    "Hi Ryan Meetup,\n\nI have a general question and wanted to get in touch.\n",
  ),
  sponsorship: buildContactHref(
    "Sponsorship Inquiry",
    "Hi Ryan Meetup,\n\nI'm interested in learning more about sponsorship opportunities and what a partnership with Ryan Meetup could look like for our brand.\n",
  ),
  press: buildContactHref(
    "Press Inquiry",
    "Hi Ryan Meetup,\n\nI'm reaching out with a press or media inquiry and would love to connect.\n",
  ),
  cardsSupport: buildContactHref(
    "Cards Order Support",
    "Hi Ryan Meetup,\n\nI need help with a cards order and had a question about shipping, order details, or support.\n",
  ),
  joinTeam: buildContactHref(
    "Join the Team Inquiry",
    "Hi Ryan Meetup,\n\nI'm interested in helping out and would love to learn more about joining the team.\n",
  ),
  nameChangePaperwork: buildContactHref(
    "Name Change Paperwork Request",
    "Hi Ryan Meetup,\n\nI'm looking for help with name change paperwork and would like more information.\n",
  ),
  awardsCorrection: buildContactHref(
    "Awards / Leaderboard Update",
    "Hi Ryan Meetup,\n\nI think my awards or leaderboard information may need to be added or updated.\n",
  ),
  mapUpdate: buildContactHref(
    "Map Update Request",
    "Hi Ryan Meetup,\n\nI'd like to request an update to the Ryan map and add or correct a city listing.\n",
  ),
};

export { buildContactHref, contactHrefs };
