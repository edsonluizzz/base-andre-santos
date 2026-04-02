import { Role, PermissionModule, PermissionAction } from "@prisma/client";
import { db } from "./db";
import { getDefaultPermission } from "./permission-defaults";

// Server-side permission check.
// First queries the RolePermission table for custom overrides.
// Falls back to PERMISSION_DEFAULTS if no record exists.
export async function hasPermission(
  userRole: Role,
  module: PermissionModule,
  action: PermissionAction,
  establishmentId: string
): Promise<boolean> {
  // ADMIN always has full access
  if (userRole === "ADMIN") return true;

  try {
    const record = await db.rolePermission.findUnique({
      where: { role_module_action_establishmentId: { role: userRole, module, action, establishmentId } },
      select: { granted: true },
    });

    if (record !== null) return record.granted;
  } catch {
    // DB unavailable — fall through to defaults
  }

  return getDefaultPermission(userRole, module, action);
}

// Load all permissions for a given role (used by layout server component)
export async function loadPermissionsForRole(
  userRole: Role,
  establishmentId: string
): Promise<Record<string, boolean>> {
  if (userRole === "ADMIN") return {}; // ADMIN has everything, no need to load

  try {
    const records = await db.rolePermission.findMany({
      where: { role: userRole, establishmentId },
      select: { module: true, action: true, granted: true },
    });

    const map: Record<string, boolean> = {};
    for (const r of records) {
      map[`${r.module}:${r.action}`] = r.granted;
    }
    return map;
  } catch {
    return {};
  }
}
