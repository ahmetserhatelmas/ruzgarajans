"use client";

import { useFormStatus } from "react-dom";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ShareLinkSubmitButton({
  idleLabel,
  pendingLabel = "Link oluşturuluyor…",
  disabled,
  className,
}: {
  idleLabel: string;
  pendingLabel?: string;
  disabled?: boolean;
  className?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className={className} disabled={disabled || pending} aria-busy={pending}>
      {pending ? (
        <>
          <Loader2 className="animate-spin" />
          {pendingLabel}
        </>
      ) : (
        idleLabel
      )}
    </Button>
  );
}
