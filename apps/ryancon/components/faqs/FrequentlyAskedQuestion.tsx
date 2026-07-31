'use client';

// Components
import { Disclosure, DisclosureButton, DisclosurePanel } from '@headlessui/react';
import { Heading, Text } from '@/components/global';
import { FaChevronDown as ChevronDown } from 'react-icons/fa';

type FAQProps = {
  question: string;
  answer: string;
};

const FAQ = (props: FAQProps) => {
  const { question, answer } = props;

  return (
    <Disclosure
      as='div'
      className='w-full rounded-2xl border border-black/10 bg-white/80 shadow-sm transition hover:-translate-y-1 hover:border-black/30 dark:border-white/10 dark:bg-white/5 dark:hover:border-white/40'
    >
      {({ open }) => (
        <>
          <DisclosureButton className='flex w-full items-center gap-4 px-5 py-5 text-center'>
            <Heading
              size='h2'
              className="text-3xl title text-left flex-1"
            >
              {question}
            </Heading>
            <ChevronDown
              className={`h-5 w-5 transition-transform duration-300 ${open ? 'rotate-180' : ''}`}
            />
          </DisclosureButton>
          <div className={`overflow-hidden px-5 ${open && "pb-5"}`}>
            <DisclosurePanel
              transition
              className='origin-top transition duration-400 ease-out will-change-transform data-closed:-translate-y-3 data-closed:opacity-0 data-closed:scale-[0.98] data-closed:blur-[1px]'
            >
              <Text className='text-base sm:text-lg'>
                {answer}
              </Text>
            </DisclosurePanel>
          </div>
        </>
      )}
    </Disclosure>
  );
};

export { FAQ };
