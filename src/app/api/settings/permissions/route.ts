import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { Role, PermissionModule, PermissionAction } from "@prisma/client";
import { getDefaultPermission } from "@/lib/permission-defaults";

// All valid module/action combinations
const VALID_COMBOS: Record<string, string[]> = {
  MEMBERS:    ["VIEW", "CREATE", "EDIT", "DELETE"],
  ATTENDANCE: ["VIEW", "CREATE", "EDIT", "DELETE"],
  FINANCIAL:  ["VIEW", "CREATE", "EDIT", "DELETE"],
  REPORTS:    ["VIEW", "EXPORT"],
  EVENTS:     ["VIEW", "CREATE", "EDIT", "DELETE"],
  BIRTHDAYS:  ["VIEW"],
  SHIRTS:     ["VIEW", "CREATE", "EDIT", "DELETE", "EXPORT"],
  SETTINGS:   ["VIEW", "EDIT"],
  USERS:      ["VIEW", "EDIT"],
};

export async function GET() {
  try {
    const session = await auth();
    if (!session || session.user?.role !== "ADMIN")
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const eid = session.user?.establishmentId ?? "default-porto-belo";
    const records = await db.rolePermission.findMany({
      where: { role: { in: ["LEADER", "MEMBER"] }, establishmentId: eid },
    });

    // Return full matrix merging DB records with defaults
    const result: Array<{ role: string; module: string; action: string; granted: boolean }> = [];
    for (const role of ["LEADER", "MEMBER"] as const) {
      for (const [module, actions] of Object.entries(VALID_COMBOS)) {
        for (const action of actions) {
          const db_record = records.find(
            (r) => r.role === role && r.module === module && r.action === action
          );
          result.push({
            role,
            module,
            action,
            granted: db_record
              ? db_record.granted
              : getDefaultPermission(role, module as PermissionModule, action as PermissionAction),
          });
        }
      }
    }

    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await auth();
    if (!session || session.user?.role !== "ADMIN")
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const body: Array<{
      role: Role;
      module: PermissionModule;
      action: PermissionAction;
      granted: boolean;
    }> = await req.json();

    if (!Array.isArray(body)) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    const eid = session.user?.establishmentId ?? "default-porto-belo";
    const ops = body.map(({ role, module, action, granted }) =>
      db.rolePermission.upsert({
        where: { role_module_action_establishmentId: { role, module, action, establishmentId: eid } },
        update: { granted, updatedBy: session.user?.id },
        create: { role, module, action, granted, establishmentId: eid, updatedBy: session.user?.id },
      })
    );

    await db.$transaction(ops);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    const session = await auth();
    if (!session || session.user?.role !== "ADMIN")
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const eid = session.user?.establishmentId ?? "default-porto-belo";
    // Reset to defaults: delete all custom records so fallback kicks in
    await db.rolePermission.deleteMany({
      where: { role: { in: ["LEADER", "MEMBER"] }, establishmentId: eid },
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
