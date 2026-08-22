// Components
import NextLink from 'next/link';
import { InstanceWordmark } from '@/components/global';

export function TaskHeaderBrand() {
  return (
    <NextLink href="/" className="items-center gap-2">
      <span className="font-cooper text-lg uppercase tracking-wide sm:hidden">
        <InstanceWordmark />
      </span>
    </NextLink>
  );
}
