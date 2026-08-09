import type { Metadata } from "next";
import { ForgotPasswordForm } from "@/components/auth";

export const metadata: Metadata = {
  title: { absolute: "Forgot Password | Ryan Meetup Tasks" },
};

export default function ForgotPasswordPage() {
  return <ForgotPasswordForm />;
}
