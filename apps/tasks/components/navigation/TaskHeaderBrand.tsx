// Components
import NextLink from 'next/link';

export function TaskHeaderBrand() {
  return (
    <NextLink href="/" className="items-center gap-2">
      <span className="font-cooper text-lg uppercase tracking-wide sm:hidden">
        Ryan Meetup
      </span>
    </NextLink>
  );
}
