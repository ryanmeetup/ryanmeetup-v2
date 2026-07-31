import { useState, useEffect } from "react";

const useBryanChecker = () => {
  const [bryanChecked, setBryanChecked] = useState<boolean>(false);

  useEffect(() => {
    const value = JSON.parse(localStorage.getItem("bryanCheck") as string);
    setBryanChecked(value);
  }, []);

  return bryanChecked;
};

export default useBryanChecker;
