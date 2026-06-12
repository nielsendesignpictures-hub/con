"use client";

import { useTransition } from "react";
import { Trash2 } from "lucide-react";
import { deleteContract } from "@/app/actions/contracts";
import { Button } from "@/components/ui";

export function DeleteContractButton({ id }: { id: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <Button
      variant="danger"
      disabled={pending}
      onClick={() => {
        if (confirm("Slet kontrakten og alle tilhørende dokumenter permanent?")) {
          startTransition(() => deleteContract(id));
        }
      }}
    >
      <Trash2 size={15} /> {pending ? "Sletter…" : "Slet"}
    </Button>
  );
}
