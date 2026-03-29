export type PermissionModule =
  | "MEMBERS"
  | "ATTENDANCE"
  | "FINANCIAL"
  | "REPORTS"
  | "EVENTS"
  | "BIRTHDAYS"
  | "SHIRTS"
  | "SETTINGS"
  | "USERS";

export type PermissionAction = "VIEW" | "CREATE" | "EDIT" | "DELETE" | "EXPORT";

// Map loaded from the server and passed through React Context
export type PermissionsMap = Record<string, boolean>;

export interface PermissionsContextValue {
  isAdmin: boolean;
  permissionsMap: PermissionsMap;
  can: (module: PermissionModule, action: PermissionAction) => boolean;
  canView: (module: PermissionModule) => boolean;
  canCreate: (module: PermissionModule) => boolean;
  canEdit: (module: PermissionModule) => boolean;
  canDelete: (module: PermissionModule) => boolean;
}
