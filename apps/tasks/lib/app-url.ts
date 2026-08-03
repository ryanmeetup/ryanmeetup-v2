export const tasksAppOrigin = "https://tasks.ryanmeetup.com";

export function tasksAppUrl(path: string) {
  return new URL(path, tasksAppOrigin).toString();
}
