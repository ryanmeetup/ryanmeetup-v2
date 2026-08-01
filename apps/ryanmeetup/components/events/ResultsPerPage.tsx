"use client";

import { Select } from "@ryanmeetup/ui";

type ResultsPerPageProps = {
  value: number;
  options: number[];
  onChange: (value: number) => void;
};

const ResultsPerPage = (props: ResultsPerPageProps) => {
  const { value, options, onChange } = props;

  return (
    <Select
      label="Results per page"
      name="results-per-page"
      variant="compact"
      value={String(value)}
      options={options.map((option) => ({
        label: String(option),
        value: String(option),
      }))}
      onChange={(nextValue) => onChange(Number(nextValue))}
    />
  );
};

export { ResultsPerPage };
