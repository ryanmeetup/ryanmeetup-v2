type EmptyStateProps = {
  message: string;
  variant?: "solid" | "dashed";
  className?: string;
};

const EmptyState = (props: EmptyStateProps) => {
  const { message, variant = "dashed", className } = props;
  const base =
    variant === "solid"
      ? "rounded-2xl border border-black/10 bg-white/80 p-6 text-center dark:border-white/10 dark:bg-white/5"
      : "rounded-2xl border border-dashed border-black/20 p-6 text-center dark:border-white/20";

  return (
    <div className={`${base} ${className ?? ""}`}>
      <span className="text-sm uppercase tracking-[0.2em] text-black/70 dark:text-white/70">
        {message}
      </span>
    </div>
  );
};

export { EmptyState };
