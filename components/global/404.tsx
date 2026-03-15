// Components
import { Heading, Text, Button } from "@/components/global";
import { FaHome as Home } from "react-icons/fa";

const PageNotFound = () => {
  return (
    <div className="relative flex min-h-[70vh] flex-col items-center justify-center overflow-visible text-center">
      <div className="absolute -top-40 right-0 hidden h-72 w-72 rounded-full border border-black/10 bg-white/60 blur-3xl dark:border-white/10 dark:bg-white/10 lg:block" />
      <div className="absolute -bottom-40 left-0 hidden h-72 w-72 rounded-full border border-black/10 bg-white/60 blur-3xl dark:border-white/10 dark:bg-white/10 lg:block" />

      <div className="relative space-y-6">
        <Heading className="text-[7rem] sm:text-[9rem] title" size="h1">
          404
        </Heading>
        <Heading className="text-center text-4xl sm:text-5xl title" size="h2">
          Ryan Not Found
        </Heading>
        <Text className="text-center text-lg text-black/70 dark:text-white/70 mx-auto">
          Maybe you meant to access one of our other pages?
        </Text>
        <div className="flex justify-center">
          <Button.Link
            href="/"
            leftIcon={<Home />}
            newTab={false}
            variant="primary"
            size="md"
          >
            Go Home
          </Button.Link>
        </div>
      </div>
    </div>
  );
};

export { PageNotFound };
