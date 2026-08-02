"use client";

import { AppError, type AppErrorProps } from "@ryanmeetup/ui";

export default function ErrorPage(props: AppErrorProps) {
  return <AppError {...props} />;
}
