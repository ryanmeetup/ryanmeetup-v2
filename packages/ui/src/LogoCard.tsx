import Image from "next/image";
import Link from "next/link";

export type LogoCardProps = {
  src: string;
  alt: string;
  href: string;
  className?: string;
  imageClassName?: string;
  width?: number;
  height?: number;
  sizes?: string;
};

const LogoCard = ({
  src,
  alt,
  href,
  className,
  imageClassName,
  width = 360,
  height = 180,
  sizes = "(max-width: 640px) 200px, 360px",
}: LogoCardProps) => (
  <Link
    href={href}
    className={`group flex items-center justify-center rounded-2xl border border-black/10 bg-white transition hover:-translate-y-1 hover:border-black/30 dark:border-white/10 dark:bg-white/5 dark:hover:border-white/30 dark:hover:bg-white/10 ${className ?? ""}`}
  >
    <Image
      src={src}
      alt={alt}
      width={width}
      height={height}
      className={`w-auto object-contain ${imageClassName ?? ""}`}
      sizes={sizes}
    />
  </Link>
);

export { LogoCard };
