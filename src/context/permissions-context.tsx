"use client";

import { createContext, useContext } from "react";
import {
  PermissionsContextValue,
  PermissionsMap,
  PermissionModule,
  PermissionAction,
} from "@/types/permissions";
import { getDefaultPermission } from "@/lib/permission-defaults";

const PermissionsContext = createContext<PermissionsContextValue | null>(null);

interface PermissionsProviderProps {
  children: React.ReactNode;
  isAdmin: boolean;
  userRole: string;
  permissionsMap: PermissionsMap;
}

export function PermissionsProvider({
  children,
  isAdmin,
  userRole,
  permissionsMap,
}: PermissionsProviderProps) {
  function can(module: PermissionModule, action: PermissionAction): boolean {
    if (isAdmin) return true;
    const key = `${module}:${action}`;
    if (key in permissionsMap) return permissionsMap[key];
    // Fallback to compile-time defaults (avoids extra fetch)
    return getDefaultPermission(userRole as "LEADER" | "MEMBER" | "ADMIN", module, action);
  }

  return (
    <PermissionsContext.Provider
      value={{
        isAdmin,
        permissionsMap,
        can,
        canView: (m) => can(m, "VIEW"),
        canCreate: (m) => can(m, "CREATE"),
        canEdit: (m) => can(m, "EDIT"),
        canDelete: (m) => can(m, "DELETE"),
      }}
    >
      {children}
    </PermissionsContext.Provider>
  );
}

export function usePermissions(): PermissionsContextValue {
  const ctx = useContext(PermissionsContext);
  if (!ctx) throw new Error("usePermissions must be used within PermissionsProvider");
  return ctx;
}
