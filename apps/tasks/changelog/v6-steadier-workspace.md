---
version: 6
slug: v6-steadier-workspace
author: Ryan Le
date: "2026-08-27"
dateLabel: August 27, 2026
title: A shared calendar, a demo first look, and a steadier workspace
summary: Google Calendar becomes one shared workspace calendar, new deployments open on a neutral demo, and the workspace holds steady while it loads, routes, and onboards.
overview:
  - One shared Google Calendar, granted through access groups
  - A neutral, reusable first-run demo workspace, previewable from Admin
  - Project lifecycle statuses from Discovery through Complete
  - Weekday digests you can inspect, delay, or cancel before they send
  - Navigation and onboarding that stay steady and recover from failures
  - One clear visibility choice for projects and categories
---

## New

### One shared calendar for the workspace

Owners can connect one workspace Google Calendar and grant access through access groups. Events from Google appear automatically for permitted teammates, while tasks and dates created in Tasks stay in Tasks unless someone publishes them. Any important date or time-away entry can be copied to the shared Google Calendar with one checkbox, and editing or deleting the date keeps the Google copy in step.

Google events now use their own magenta calendar notation so they stay distinct from blue task deadlines, and routine Home blocks no longer clutter the shared view. Time away stays at the top of each day, crowded dates open into a complete day agenda, the details sidebar can be hidden between visits, and Google connection controls live in a compact status badge above the calendar.

Connecting Google Calendar now keeps deployment details out of the everyday flow: owners continue with Google when the workspace is ready, get a clear path to Admin when setup is still needed, and see friendlier guidance when a connection cannot be completed.

### A cleaner first look

The zero-configuration demo now opens as a neutral team workspace with sample teammates, projects, tasks, and calendar dates that fit any organization. Demo mode skips the production notice banner and uses a compact footer, which is also the default footer treatment on sign-in and account-recovery screens.

New workspaces now open with the complete Ryan Meetup workflow—Backlog, Todo, In Progress, In Review, Done, and Will Not Do—and older empty instances repair the missing board automatically.

Owners can see that first look for themselves without a second deployment: **Enter demo preview** on the Admin overview swaps the workspace for the demo fixtures in their browser alone, and the demo banner carries the way back out. Nothing touched during a preview reaches the database, and the preview lapses on its own after four hours.

### Project progress at a glance

Projects now carry a lifecycle status—Discovery, Queued, Active, Paused, or Complete—so the projects page shows what kind of work is underway without opening every board. Marking a project complete now offers to archive it while the wrap-up is top of mind.

### Digests you can review before they send

The Usage page now reports Resend's daily and monthly email allowance, recent sends, and color-coded delivery states. Weekday digests appear there 30 minutes before delivery, giving owners time to inspect the exact message, delay it, or cancel it.

## Improved

### A workspace that holds steady

Route changes now keep the workspace navigation and header in place while only the destination page loads, so moving around the app feels steady even when the next screen needs fresh data.

Changing task filters, searches, sorting, pages, or views while results are loading now always keeps the newest request, so a slower earlier response cannot replace or skip the selection you just made.

Categories, projects, contacts, calendar dates, notes, comments, and resource attachments now save their activity history in the same database transaction, so a failed save no longer leaves half-finished changes behind.

If workspace data cannot load, the app now explains the failure and provides a reference instead of repeatedly sending you to your profile as though onboarding were incomplete.

### One name for the workspace

A workspace used to carry three names: the wordmark, a longer product name for browser tabs and email subjects, and a tagline printed under the wordmark in the sidebar. It now carries one. The instance name titles every page, heads the digest email, and appears in link previews on its own, and the sidebar shows the wordmark alone with nothing beneath it.

The card other apps show when a link is pasted into Slack or Messages follows the same rule. It used to hold a headline, a tagline, and a motto of its own, which could describe a workspace the deployment no longer was; it now prints the monogram, the name, and the description straight from Identity, sized to fit whatever they say. What is left to set is the badge and the alt text.

### A banner the workspace writes itself

The notice above the workspace used to announce one thing in one voice: it assembled the sentence from the workspace's own name, so it read as though the product were named after whoever the workspace belongs to, and it could only ever say that the app was in beta.

The message is now yours to write. Under **Banner** in Settings, owners set the sentence members see — a beta warning, a maintenance window, a policy change — with an optional link and the words that link reads as. Leave the message blank and it falls back to this deployment's default; leave the label blank and the link phrases itself from its address. Rewriting the message brings the banner back for everyone who had dismissed the old one.

Whether a workspace collects its own feedback as tasks is no longer a setting. It described one deployment's arrangement and had no meaning anywhere else; what is left is a plain link that points wherever the instance wants.

### A footer that finishes the page

The compact footer is now the one consistent treatment everywhere in Tasks. It carries the workspace's uploaded logo or text wordmark, subtitle, configured links, social icons, and the credit line beneath a divider — so signed-in pages, sign-in screens, and the demo all finish the same way.

Footer presentation is now fixed instead of having its own settings editor. Updating the workspace name or logo under Identity still updates the wordmark in the footer automatically.

The task board now uses solid column surfaces that stay clear over the paper background, and it fills the space above the footer so its horizontal scroller sits directly against the bottom of the board.

### Notes that read like notes

The notes board now presents each note as a finished card: its title, formatted text, author, and comment count at a glance. Links written inside a note appear as chips you can follow, alongside the task or project the note became.

Opening a note brings up its full text and conversation, and editing happens there too, saved deliberately with Save note instead of quietly while you type.

Contact image uploads now save together with their contact, and replacing,
removing, or deleting an uploaded image also cleans up the old file.

### Onboarding that recovers

First sign-in now explains why profile completion is required, remembers the page you were trying to open, and returns you there after saving. If account provisioning is missing instead, the workspace shows its own recovery screen rather than trapping you in a profile redirect.

The workspace now verifies its required database contract before production builds and reports profile, default-access, signup-trigger, and starter-status health in Admin. Owners can repair missing beginner-flow records there without touching the database directly.

### One clear visibility choice

Project and category create and edit dialogs now use one clear visibility choice. New projects begin with their named owners only, and selected groups can collaborate on tasks without becoming project managers. Visibility stays with each project or category instead of appearing as a second set of controls on the Access page.
