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
};

export type ResendUsage = {
  status: "available" | "unconfigured" | "unavailable";
  daily: ResendQuota | null;
  monthly: ResendQuota | null;
  recentEmails: ResendEmailSummary[];
  checkedAt: string;
  message?: string;
};

type ResendEmailResponse = {
  has_more?: boolean;
  data?: Array<{
    id?: unknown;
    subject?: unknown;
    created_at?: unknown;
    to?: unknown;
    cc?: unknown;
    bcc?: unknown;
    last_event?: unknown;
  }>;
};

const positiveInteger = (value: string | undefined, fallback: number) => {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
};

export function parseResendQuota(
  header: string | null,
  configuredLimit: number,
): ResendQuota | null {
  if (!header) return null;
  const [usedValue, headerLimit] = header
    .split("/")
    .map((value) => value.trim());
  const used = Number(usedValue);
  const parsedHeaderLimit = Number(headerLimit);
  const limit =
    Number.isFinite(parsedHeaderLimit) && parsedHeaderLimit > 0
      ? parsedHeaderLimit
      : configuredLimit;
  if (!Number.isFinite(used) || used < 0) return null;
  return { used, limit, estimated: false };
}

const addressCount = (value: unknown) =>
  Array.isArray(value)
    ? value.filter((address) => typeof address === "string").length
    : 0;

const addresses = (value: unknown) =>
  Array.isArray(value)
    ? value.filter((address): address is string => typeof address === "string")
    : [];

function parseRecentEmails(payload: ResendEmailResponse): ResendEmailSummary[] {
  if (!Array.isArray(payload.data)) return [];
  return payload.data.flatMap((email) => {
    if (
      typeof email.id !== "string" ||
      typeof email.subject !== "string" ||
      typeof email.created_at !== "string" ||
      typeof email.last_event !== "string"
    ) {
      return [];
    }
    const recipients = [
      ...addresses(email.to),
      ...addresses(email.cc),
      ...addresses(email.bcc),
    ];
    return [
      {
        id: email.id,
        subject: email.subject,
        createdAt: email.created_at,
        recipientCount: recipients.length,
        recipients: [...new Set(recipients)],
        lastEvent: email.last_event,
      },
    ];
  });
}

const waitForResendRateLimit = () =>
  new Promise((resolve) => setTimeout(resolve, 225));

async function fetchResendEmailPage(apiKey: string, after?: string) {
  const url = new URL("https://api.resend.com/emails");
  url.searchParams.set("limit", "100");
  if (after) url.searchParams.set("after", after);
  return fetch(url, {
    headers: {
      authorization: `Bearer ${apiKey}`,
      "user-agent": "ryan-meetup-tasks/1.0",
    },
    cache: "no-store",
  });
}

function estimatedQuota(
  emails: NonNullable<ResendEmailResponse["data"]>,
  since: number,
  limit: number,
): ResendQuota {
  const used = emails.reduce((total, email) => {
    const createdAt =
      typeof email.created_at === "string"
        ? new Date(email.created_at).getTime()
        : Number.NaN;
    return createdAt >= since
      ? total +
          addressCount(email.to) +
          addressCount(email.cc) +
          addressCount(email.bcc)
      : total;
  }, 0);
  return { used, limit, estimated: true };
}

export async function getResendUsage(): Promise<ResendUsage> {
  const checkedAt = new Date().toISOString();
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return {
      status: "unconfigured",
      daily: null,
      monthly: null,
      recentEmails: [],
      checkedAt,
      message: "Add RESEND_API_KEY to show live email usage.",
    };
  }

  try {
    const response = await fetchResendEmailPage(apiKey);
    if (!response.ok) {
      return {
        status: "unavailable",
        daily: null,
        monthly: null,
        recentEmails: [],
        checkedAt,
        message: `Resend returned ${response.status}. Check the API key's permissions.`,
      };
    }

    const payload = (await response.json()) as ResendEmailResponse;
    const emails = Array.isArray(payload.data) ? [...payload.data] : [];
    const now = Date.now();
    const rollingDayStart = now - 24 * 60 * 60 * 1000;
    const currentMonthStart = new Date(
      new Date(now).getFullYear(),
      new Date(now).getMonth(),
      1,
    ).getTime();
    const historyCutoff = Math.min(rollingDayStart, currentMonthStart);
    let hasMore = payload.has_more === true;
    while (hasMore && emails.length < 3000) {
      const lastEmail = emails.at(-1);
      if (
        typeof lastEmail?.created_at === "string" &&
        new Date(lastEmail.created_at).getTime() < historyCutoff
      ) {
        break;
      }
      if (typeof lastEmail?.id !== "string") break;
      await waitForResendRateLimit();
      const nextResponse = await fetchResendEmailPage(apiKey, lastEmail.id);
      if (!nextResponse.ok) break;
      const nextPayload = (await nextResponse.json()) as ResendEmailResponse;
      if (!Array.isArray(nextPayload.data) || nextPayload.data.length === 0)
        break;
      emails.push(...nextPayload.data);
      hasMore = nextPayload.has_more === true;
    }
    const dailyLimit = positiveInteger(process.env.RESEND_DAILY_QUOTA, 100);
    const monthlyLimit = positiveInteger(
      process.env.RESEND_MONTHLY_QUOTA,
      3000,
    );
    const dailyHeader = parseResendQuota(
      response.headers.get("x-resend-daily-quota"),
      dailyLimit,
    );
    const monthlyHeader = parseResendQuota(
      response.headers.get("x-resend-monthly-quota"),
      monthlyLimit,
    );
    return {
      status: "available",
      daily: dailyHeader ?? estimatedQuota(emails, rollingDayStart, dailyLimit),
      monthly:
        monthlyHeader ??
        estimatedQuota(emails, currentMonthStart, monthlyLimit),
      recentEmails: parseRecentEmails(payload),
      checkedAt,
      message:
        dailyHeader && monthlyHeader
          ? undefined
          : "Resend does not expose quota totals on this request, so usage is estimated from sent email history.",
    };
  } catch {
    return {
      status: "unavailable",
      daily: null,
      monthly: null,
      recentEmails: [],
      checkedAt,
      message: "Resend could not be reached. Try refreshing in a moment.",
    };
  }
}
