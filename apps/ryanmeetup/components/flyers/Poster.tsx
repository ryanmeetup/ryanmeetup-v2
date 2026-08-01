// Components
import NextImage from "next/image";

type PosterProps = {
  title: string;
  src: string;
};

const Poster = (props: PosterProps) => {
  const { title, src } = props;

  return (
    <div className="relative aspect-[3/4] overflow-hidden shadow-lg">
      <NextImage
        className="border border-black/10 dark:border-white/10"
        src={src}
        fill={true}
        alt={title}
      />
    </div>
  );
};

export { Poster };
