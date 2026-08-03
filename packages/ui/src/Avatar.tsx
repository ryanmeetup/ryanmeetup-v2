export type AvatarProps = {
  className?: string;
  name?: string | null;
  size?: "xs" | "sm" | "md" | "lg";
  src?: string | null;
};

const sizeClasses = {
  xs: "h-4 w-4 text-[7px]",
  sm: "h-6 w-6 text-[9px]",
  md: "h-8 w-8 text-[9px]",
  lg: "h-16 w-16 text-lg",
};

function initials(name?: string | null) {
  return (name || "?")
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

const Avatar = ({ className, name, size = "md", src }: AvatarProps) => (
  <span
    aria-label={name || "Teammate"}
    role="img"
    style={src ? { backgroundImage: `url(${JSON.stringify(src)})` } : undefined}
    className={`inline-grid shrink-0 place-items-center rounded-full border border-black/10 bg-black bg-cover bg-center font-bold text-white dark:border-white/20 dark:bg-white dark:text-black ${sizeClasses[size]} ${className ?? ""}`}
  >
    {!src && <span aria-hidden>{initials(name)}</span>}
  </span>
);

export { Avatar };
