-- Retire the product name, the tagline, and the link-preview card's own copy.
--
-- The workspace had three names for itself: the wordmark, a longer product
-- name for titles and email subjects, and a tagline printed under the sidebar
-- wordmark. Two of them were the same words in different dress, and the
-- tagline was a second line of chrome the header did not need. The instance
-- name is now the only name -- it is the wordmark, the page title, the link
-- preview title, and the digest email's header -- and the sidebar shows the
-- wordmark alone.
--
-- Dropping the columns is what makes that true for an instance that had
-- overridden them: leaving them behind would keep stale values in the row that
-- nothing reads and the settings form can no longer edit.

alter table public.instance_settings
  drop column if exists product_name,
  drop column if exists tagline;

-- The Open Graph card carried a third set of words -- a headline, a tagline of
-- its own, and a motto -- so the card an instance published could describe a
-- different workspace than the one it ran. It now composes from the identity:
-- the monogram, the instance name, and the description. `og_alt` stays, because
-- alt text describes the image rather than repeating what is printed on it.

alter table public.instance_settings
  drop column if exists og_headline,
  drop column if exists og_tagline,
  drop column if exists og_motto;
