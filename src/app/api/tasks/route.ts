import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

const CID = "andre-santos-2026";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const tasks = await db.task.findMany({
      where: { campaignId: CID, assignedToId: session.user.id },
      orderBy: [{ status: "asc" }, { priority: "desc" }, { dueDate: "asc" }],
    });

    return NextResponse.json(tasks);
  } catch (err) {
    console.error("[tasks GET]", err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { title, description, dueDate, priority, assignedToId } = await req.json();
    if (!title?.trim()) return NextResponse.json({ error: "Título obrigatório" }, { status: 400 });

    const isAdminOrLeader = ["ADMIN", "LEADER"].includes(session.user.role ?? "");
    const targetUserId = isAdminOrLeader && assignedToId ? assignedToId : session.user.id;

    const VALID_PRIORITY = new Set(["LOW", "NORMAL", "HIGH"]);

    const task = await db.task.create({
      data: {
        campaignId:  CID,
        title:       title.trim(),
        description: description?.trim() || null,
        assignedToId: targetUserId,
        createdById: session.user.id,
        dueDate:     dueDate ? new Date(dueDate) : null,
        priority:    VALID_PRIORITY.has(priority) ? priority : "NORMAL",
      },
    });

    return NextResponse.json(task, { status: 201 });
  } catch (err) {
    console.error("[tasks POST]", err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
