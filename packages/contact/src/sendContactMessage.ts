import emailjs from "@emailjs/browser";

export type ContactMessage = {
  firstName: string;
  lastName: string;
  email: string;
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
