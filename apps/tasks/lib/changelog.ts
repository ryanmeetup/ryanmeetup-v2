export type ChangelogCategory = "New" | "Improved" | "Foundation";

export type ChangelogItem = {
  category: ChangelogCategory;
  title: string;
  description: string;
};

export type ChangelogRelease = {
  version: `v${number}`;
  slug: string;
  author: string;
  date: string;
  dateLabel: string;
  title: string;
  summary: string;
  overview: string[];
  items: ChangelogItem[];
};

export const changelog: ChangelogRelease[] = [
  {
    version: "v4",
    slug: "v4-workspace-grows-up",
    author: "Ryan Le",
    date: "2026-08-13",
    dateLabel: "August 12–13, 2026",
    title: "The workspace grows up",
    summary:
      "A more polished, responsive workspace with better management tools, quick notes, contacts, and clearer access controls.",
    overview: [
      "Favorite projects and a redesigned dashboard",
      "Responsive navigation and roomier task views",
      "Quick notes and contact management",
      "Workspace-wide activity and clearer access controls",
    ],
    items: [
      {
        category: "New",
        title: "Notes that can become tasks",
        description:
          "Capture a thought quickly, organize it by category, and turn it into real work when it is ready.",
      },
      {
        category: "New",
        title: "Contact management",
        description:
          "Keep useful people, their details, and relevant context close to the work without reaching for another system.",
      },
      {
        category: "New",
        title: "Favorite projects",
        description:
          "Star frequently visited projects and reach them directly from the dashboard and sidebar.",
      },
      {
        category: "Improved",
        title: "A more useful dashboard",
        description:
          "A responsive masonry layout brings assigned work, drafts, deadlines, favorites, and activity into clearer groups.",
      },
      {
        category: "Improved",
        title: "Resource management",
        description:
          "Projects, categories, notes, and contacts now share clearer layouts and more consistent editing patterns.",
      },
      {
        category: "Improved",
        title: "Workspace activity",
        description:
          "Activity now captures changes to projects, categories, notes, contacts, and attachments alongside task updates.",
      },
      {
        category: "Improved",
        title: "Category access and ownership",
        description:
          "Owners can understand category visibility more easily and manage responsibility with explicit controls.",
      },
      {
        category: "Improved",
        title: "Responsive workspace navigation",
        description:
          "Navigation, forms, cards, and task columns make better use of phones, tablets, and wide desktop screens.",
      },
    ],
  },
  {
    version: "v3",
    slug: "v3-faster-workflows",
    author: "Ryan Le",
    date: "2026-08-09",
    dateLabel: "August 9, 2026",
    title: "A faster way to run the work",
    summary:
      "The app gained a real dashboard, richer activity and filtering, saved drafts, global search, and stable task links.",
    overview: [
      "Dashboard and full activity page",
      "Saved task drafts and richer filters",
      "Global search and stable RMT task links",
      "Attachments and expanded task editing",
    ],
    items: [
      {
        category: "New",
        title: "Dashboard and activity page",
        description:
          "See assigned work, reported tasks, upcoming deadlines, and recent movement without digging through the board.",
      },
      {
        category: "New",
        title: "Saved task drafts",
        description:
          "Pause while creating a task and return to the draft later from the dashboard.",
      },
      {
        category: "New",
        title: "Stable task pages and identifiers",
        description:
          "Tasks received durable RMT-numbered URLs that are easier to recognize, copy, and share.",
      },
      {
        category: "New",
        title: "Global task search",
        description:
          "Find tasks from anywhere in the workspace and move directly into the relevant details or filtered view.",
      },
      {
        category: "Improved",
        title: "Filtering and pagination",
        description:
          "Inclusive and exclusive filters, multiselect controls, and pagination make larger workspaces easier to navigate.",
      },
      {
        category: "Improved",
        title: "Richer task and project editing",
        description:
          "Attachments, reporter details, lateness indicators, comments, and task preferences made everyday editing more complete.",
      },
      {
        category: "Improved",
        title: "Team and access insights",
        description:
          "Owners gained clearer member status, workload context, and more capable access-group controls.",
      },
    ],
  },
  {
    version: "v2",
    slug: "v2-team-tool",
    author: "Ryan Le",
    date: "2026-08-05",
    dateLabel: "August 3–5, 2026",
    title: "From prototype to team tool",
    summary:
      "The initial workspace became a safer team product with onboarding, access controls, stronger workflows, and hardened foundations.",
    overview: [
      "Profile onboarding and recovery flows",
      "Project and group-based access controls",
      "Improved board, status, and navigation workflows",
      "Security, authorization, and reliability hardening",
    ],
    items: [
      {
        category: "New",
        title: "Onboarding and profile preferences",
        description:
          "Team members received a guided profile setup, password recovery, and personalized task-detail behavior.",
      },
      {
        category: "New",
        title: "Project access controls",
        description:
          "Projects could be shared intentionally through centralized access groups, creator grants, and owner management.",
      },
      {
        category: "New",
        title: "Access preview",
        description:
          "Owners could inspect the workspace from a group or member perspective before changing permissions.",
      },
      {
        category: "Improved",
        title: "Workspace navigation and management",
        description:
          "Projects, categories, statuses, profile controls, and filtered board links became easier to reach and operate.",
      },
      {
        category: "Improved",
        title: "Board and status workflows",
        description:
          "Task movement, shared updates, status configuration, and activity presentation became more dependable.",
      },
      {
        category: "Foundation",
        title: "Authorization and API hardening",
        description:
          "Fail-closed permissions, protected mutation boundaries, recoverable writes, browser security, and broader tests prepared the app for team use.",
      },
    ],
  },
  {
    version: "v1",
    slug: "v1-first-working-workspace",
    author: "Ryan Le",
    date: "2026-08-02",
    dateLabel: "August 1–2, 2026",
    title: "The first working workspace",
    summary:
      "The first development push established the task board and the core building blocks needed to organize Ryan Meetup work.",
    overview: [
      "Task board and task-management workspace",
      "Authentication, profiles, and theme support",
      "Projects, categories, and task details",
      "Configurable statuses and core feedback states",
    ],
    items: [
      {
        category: "New",
        title: "Task-management workspace",
        description:
          "The first usable board brought Ryan Meetup tasks, statuses, and everyday planning into one focused app.",
      },
      {
        category: "New",
        title: "Authentication and profiles",
        description:
          "A private sign-in experience and member profiles established the foundation for a shared team workspace.",
      },
      {
        category: "New",
        title: "Projects and categories",
        description:
          "Tasks could be organized into the projects and work categories that reflect how the team operates.",
      },
      {
        category: "New",
        title: "Task details and workflows",
        description:
          "The initial editor, task details, and status controls made the board useful beyond a static list.",
      },
      {
        category: "Improved",
        title: "Login, theme, and feedback",
        description:
          "Light and dark themes, clearer authentication, and standardized success and error feedback made the first release feel cohesive.",
      },
      {
        category: "Foundation",
        title: "Shared Ryan Meetup UI",
        description:
          "Common visual components started moving into shared packages so the Tasks app could grow with the wider product family.",
      },
    ],
  },
];

export const latestChangelogRelease = changelog[0];

export const changelogReleasePath = (release: ChangelogRelease) =>
  `/changelog/${release.slug}`;

export const findChangelogRelease = (slug: string) =>
  changelog.find((release) => release.slug === slug);
