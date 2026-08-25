import { buildContactHref, type ContactTopic } from "@ryanmeetup/contact";

const DEFAULT_INBOX = "ryan@ryanmeetup.com";

const greeting = "Hi RyanCon,\n\n";

/**
 * Every reason a Ryan can pick on /contact. The `value` of each topic (and of
 * its detail options) is what other pages pass through the `topic`/`detail`
 * query params, so renaming one means updating the links that point at it.
 */
const contactTopics: ContactTopic[] = [
  {
    value: "attending",
    label: "Attending RyanCon",
    subject: "RyanCon Attendee Question",
    description: "Tickets, registration, schedule, and getting there.",
    message: `${greeting}I have a question about attending RyanCon.\n`,
    routeTo: DEFAULT_INBOX,
    detail: {
      label: "What do you need help with?",
      options: [
        { value: "registration", label: "Registration or tickets" },
        { value: "schedule", label: "Schedule and programming" },
        { value: "travel", label: "Travel, hotel, or venue" },
        { value: "accessibility", label: "Accessibility needs" },
      ],
    },
  },
  {
    value: "sponsorship",
    label: "Sponsorships & Partnerships",
    subject: "RyanCon Sponsorship",
    description: "Tell us about your brand and what you have in mind.",
    message: `${greeting}I'm interested in sponsoring RyanCon and would love to hear more about what a partnership could look like.\n`,
    messagePlaceholder:
      "Who are you with, what are you hoping to do, and what's your timeline?",
    routeTo: DEFAULT_INBOX,
    detail: {
      label: "What kind of partnership?",
      options: [
        { value: "sponsor-package", label: "Sponsorship package" },
        { value: "booth", label: "Booth or activation" },
        { value: "product-donation", label: "Product or swag donation" },
        { value: "media-collab", label: "Media collaboration" },
      ],
    },
  },
  {
    value: "programming",
    label: "Programming & Speaking",
    subject: "RyanCon Programming",
    description: "Pitch a talk, panel, or activity for the schedule.",
    message: `${greeting}I'd like to pitch something for the RyanCon schedule.\n`,
    routeTo: DEFAULT_INBOX,
    detail: {
      label: "What are you pitching?",
      options: [
        { value: "talk", label: "A talk" },
        { value: "panel", label: "A panel" },
        { value: "activity", label: "An activity or workshop" },
        { value: "performance", label: "A performance" },
      ],
    },
  },
  {
    value: "press",
    label: "Press & Media",
    subject: "RyanCon Press Inquiry",
    description: "Interviews, filming requests, and media credentials.",
    message: `${greeting}I'm reaching out with a press or media inquiry about RyanCon.\n`,
    messagePlaceholder: "What outlet are you with, and what's your deadline?",
    routeTo: DEFAULT_INBOX,
    detail: {
      label: "What kind of coverage?",
      options: [
        { value: "credentials", label: "Media credentials" },
        { value: "interview", label: "Interview request" },
        { value: "filming", label: "Filming or photography" },
        { value: "press-kit", label: "Press kit or assets" },
      ],
    },
  },
  {
    value: "volunteer",
    label: "Volunteering",
    subject: "RyanCon Volunteer Inquiry",
    description: "Help run RyanCon on the ground.",
    message: `${greeting}I'd love to help out at RyanCon and wanted to learn more about volunteering.\n`,
    routeTo: DEFAULT_INBOX,
  },
  {
    value: "other",
    label: "Something Else",
    subject: "Official RyanCon Business",
    message: greeting,
    routeTo: DEFAULT_INBOX,
  },
];

/**
 * Prebuilt links for the CTAs across the site. The `source` records which page
 * sent the Ryan over so replies land with context.
 */
const contactHrefs = {
  attending: buildContactHref("attending", { source: "register" }),
  sponsorship: buildContactHref("sponsorship", { source: "sponsorship" }),
  press: buildContactHref("press", { source: "press" }),
  volunteer: buildContactHref("volunteer", { source: "about" }),
};

export { buildContactHref, contactHrefs, contactTopics, DEFAULT_INBOX };
