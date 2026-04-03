import { Role, PermissionModule, PermissionAction } from "@prisma/client";

type PermissionKey = `${Role}:${PermissionModule}:${PermissionAction}`;

// Default permissions when no custom record exists in RolePermission table.
// ADMIN always has full access — these defaults only apply to LEADER and MEMBER.
const PERMISSION_DEFAULTS: Partial<Record<PermissionKey, boolean>> = {
  // MEMBERS
  "LEADER:MEMBERS:VIEW": true,
  "LEADER:MEMBERS:CREATE": true,
  "LEADER:MEMBERS:EDIT": true,
  "LEADER:MEMBERS:DELETE": false,
  "MEMBER:MEMBERS:VIEW": false,
  "MEMBER:MEMBERS:CREATE": false,
  "MEMBER:MEMBERS:EDIT": false,
  "MEMBER:MEMBERS:DELETE": false,

  // ATTENDANCE
  "LEADER:ATTENDANCE:VIEW": true,
  "LEADER:ATTENDANCE:CREATE": true,
  "LEADER:ATTENDANCE:EDIT": true,
  "LEADER:ATTENDANCE:DELETE": false,
  "MEMBER:ATTENDANCE:VIEW": true,
  "MEMBER:ATTENDANCE:CREATE": false,
  "MEMBER:ATTENDANCE:EDIT": false,
  "MEMBER:ATTENDANCE:DELETE": false,

  // FINANCIAL
  "LEADER:FINANCIAL:VIEW": true,
  "LEADER:FINANCIAL:CREATE": true,
  "LEADER:FINANCIAL:EDIT": true,
  "LEADER:FINANCIAL:DELETE": false,
  "MEMBER:FINANCIAL:VIEW": false,
  "MEMBER:FINANCIAL:CREATE": false,
  "MEMBER:FINANCIAL:EDIT": false,
  "MEMBER:FINANCIAL:DELETE": false,

  // REPORTS
  "LEADER:REPORTS:VIEW": true,
  "LEADER:REPORTS:EXPORT": true,
  "MEMBER:REPORTS:VIEW": false,
  "MEMBER:REPORTS:EXPORT": false,

  // EVENTS
  "LEADER:EVENTS:VIEW": true,
  "LEADER:EVENTS:CREATE": true,
  "LEADER:EVENTS:EDIT": true,
  "LEADER:EVENTS:DELETE": false,
  "MEMBER:EVENTS:VIEW": true,
  "MEMBER:EVENTS:CREATE": false,
  "MEMBER:EVENTS:EDIT": false,
  "MEMBER:EVENTS:DELETE": false,

  // BIRTHDAYS
  "LEADER:BIRTHDAYS:VIEW": true,
  "MEMBER:BIRTHDAYS:VIEW": true,

  // SHIRTS
  "LEADER:SHIRTS:VIEW": true,
  "LEADER:SHIRTS:CREATE": true,
  "LEADER:SHIRTS:EDIT": true,
  "LEADER:SHIRTS:DELETE": false,
  "LEADER:SHIRTS:EXPORT": true,
  "MEMBER:SHIRTS:VIEW": true,
  "MEMBER:SHIRTS:CREATE": false,
  "MEMBER:SHIRTS:EDIT": false,
  "MEMBER:SHIRTS:DELETE": false,
  "MEMBER:SHIRTS:EXPORT": false,

  // SETTINGS
  "LEADER:SETTINGS:VIEW": false,
  "LEADER:SETTINGS:EDIT": false,
  "MEMBER:SETTINGS:VIEW": false,
  "MEMBER:SETTINGS:EDIT": false,

  // USERS
  "LEADER:USERS:VIEW": false,
  "LEADER:USERS:EDIT": false,
  "MEMBER:USERS:VIEW": false,
  "MEMBER:USERS:EDIT": false,

  // MINISTRIES
  "LEADER:MINISTRIES:VIEW": true,
  "LEADER:MINISTRIES:CREATE": true,
  "LEADER:MINISTRIES:EDIT": true,
  "LEADER:MINISTRIES:DELETE": false,
  "MEMBER:MINISTRIES:VIEW": false,
  "MEMBER:MINISTRIES:CREATE": false,
  "MEMBER:MINISTRIES:EDIT": false,
  "MEMBER:MINISTRIES:DELETE": false,
};

export function getDefaultPermission(
  role: Role,
  module: PermissionModule,
  action: PermissionAction
): boolean {
  if (role === "ADMIN") return true;
  const key: PermissionKey = `${role}:${module}:${action}`;
  return PERMISSION_DEFAULTS[key] ?? false;
}
