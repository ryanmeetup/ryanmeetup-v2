"use client";

// Components
import { BryanModal } from "@/components/global";

// Utilities
import { usePathname } from "next/navigation";
import useBryanChecker from "@/hooks/useBryanChecker";

const BryanChecker = () => {
  const bryanChecked = useBryanChecker();

  const pathname = usePathname();

  return <>{pathname !== "/goodbye" && !bryanChecked && <BryanModal />}</>;
};

export { BryanChecker };
