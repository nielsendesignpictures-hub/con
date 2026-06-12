"use client";

import { useTransition } from "react";
import { updateUserRole } from "@/app/actions/admin";
import type { UserRole } from "@/lib/types";
import { Select } from "@/components/ui";

export function RoleSelect({
  userId,
  role,
  disabled,
}: {
  userId: string;
  role: UserRole;
  disabled?: boolean;
}) {
  const [pending, startTransition] = useTransition();
  return (
    <Select
      defaultValue={role}
      disabled={disabled || pending}
      onChange={(e) =>
        startTransition(() => updateUserRole(userId, e.target.value as UserRole))
      }
      className="w-40"
    >
      <option value="admin">Administrator</option>
      <option value="reader">Læsebruger</option>
    </Select>
  );
}
