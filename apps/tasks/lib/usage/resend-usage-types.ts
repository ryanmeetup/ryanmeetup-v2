export type ResendQuota = {
  used: number;
  limit: number;
  estimated: boolean;
};

export type ResendEmailSummary = {
  id: string;
  subject: string;
  createdAt: string;
  recipientCount: number;
  recipients: string[];
  lastEvent: string;
  scheduledAt: string | null;
};

export type ResendEmailDetail = ResendEmailSummary & {
  from: string;
  html: string | null;
  text: string | null;
};

export type ResendUsage = {
  status: "available" | "unconfigured" | "unavailable";
  daily: ResendQuota | null;
  monthly: ResendQuota | null;
  recentEmails: ResendEmailSummary[];
  checkedAt: string;
  message?: string;
};
