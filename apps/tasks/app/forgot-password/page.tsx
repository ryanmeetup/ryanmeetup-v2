import type { Metadata } from "next";
import { ForgotPasswordForm } from "@/components/ForgotPasswordForm";

export const metadata: Metadata = {
  title: "Forgot password · Ryan Meetup",
  description: "Request a password reset link for your Ryan Meetup account.",
};

export default function ForgotPasswordPage() {
  return <ForgotPasswordForm />;
}
