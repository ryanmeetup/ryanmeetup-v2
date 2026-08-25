import emailjs from "@emailjs/browser";

export type ContactMessage = {
  firstName: string;
  lastName: string;
  email: string;
  /** Human label of the chosen topic, e.g. "Sponsorships & partnerships". */
  topic: string;
  /** Topic slug, for filters and routing rules. */
  topicValue: string;
  /** Human label of the follow-up dropdown, empty when the topic has none. */
  detail: string;
  detailValue: string;
  /** Inbox this topic should land in. Never empty. */
  routeTo: string;
  /** Page the visitor clicked through from, empty when they came in cold. */
  source: string;
  subject: string;
  message: string;
};

export async function sendContactMessage(message: ContactMessage) {
  if (process.env.NEXT_PUBLIC_E2E_TESTS === "true") return;

  await emailjs.send(
    process.env.NEXT_PUBLIC_EMAIL_SERVICE_ID as string,
    process.env.NEXT_PUBLIC_EMAIL_TEMPLATE_ID as string,
    message,
    process.env.NEXT_PUBLIC_EMAIL_USER_ID as string,
  );
}
