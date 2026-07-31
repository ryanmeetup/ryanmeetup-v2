import { useState, useEffect } from "react";

const useLocalStorage = (key: string, initialValue: boolean) => {
  // State to track the checkbox state
  const [isChecked, setChecked] = useState(() => {
    if (typeof window !== "undefined") {
      const storedValue = localStorage?.getItem(key);
      return storedValue ? JSON.parse(storedValue) : initialValue;
    }
  });

  // Function to handle checkbox state change
  const handleChange = () => {
    setChecked(!isChecked);
  };

  // Effect to save the checkbox state to localStorage when it changes
  useEffect(() => {
    localStorage.setItem(key, JSON.stringify(isChecked));
  }, [isChecked, key]);

  return [isChecked, handleChange];
};

export default useLocalStorage;
