"use client";

import { Input } from "@/components/ui/input";

const MIN = "1900-01-01";
const MAX = "2100-12-31";

export function DateInput({
  name,
  defaultValue,
}: {
  name: string;
  defaultValue?: string;
}) {
  return (
    <Input
      name={name}
      type="date"
      min={MIN}
      max={MAX}
      defaultValue={defaultValue?.slice(0, 10) ?? ""}
      onInput={(event) => {
        const el = event.currentTarget;
        const [year, month, day] = el.value.split("-");
        if (year && year.length > 4) {
          el.value = [year.slice(0, 4), month, day].filter(Boolean).join("-");
        }
      }}
    />
  );
}
