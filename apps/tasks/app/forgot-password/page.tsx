import type { Metadata } from "next";
import { ForgotPasswordForm } from "@/components/auth";
import { pageTitle } from "@/lib/server/instance-settings";

export async function generateMetadata(): Promise<Metadata> {
  return { title: { absolute: await pageTitle("Forgot Password") } };
}

export default function ForgotPasswordPage() {
  return <ForgotPasswordForm />;
}
