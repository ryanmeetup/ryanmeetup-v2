// Types
import type { ReactNode } from "react";

type NoteProps = {
  children: ReactNode;
};

const Note = (props: NoteProps) => {
  const { children } = props;

  return (
    <div className="mb-8 border-l pl-4 border-gray-400 dark:border-gray-700 border-l-4 space-y-4">
      {children}
    </div>
  );
};

export { Note };
