// Components
import { Heading, TestimonialCard } from "@ryanmeetup/ui";

// Types
import { Testimonial } from "@/lib/types";

type TestimonyContainerProps = {
  testimonies: Testimonial[];
};

const TestimonyContainer = (props: TestimonyContainerProps) => {
  const { testimonies } = props;

  return (
    <section className="relative overflow-hidden xl:p-6">
      <div className="relative">
        <div className="mx-auto mb-8 text-center">
          <Heading className="text-4xl title" size="h2">
            Hear what Ryans have to say about the Ryan Meetup:
          </Heading>
        </div>

        <div className="columns-1 gap-4 sm:columns-2 xl:columns-3">
          {testimonies.map((item) => (
            <TestimonialCard
              key={item.lastName}
              quote={item.quote}
              location={item.location}
            />
          ))}
        </div>
      </div>
    </section>
  );
};

export { TestimonyContainer };
