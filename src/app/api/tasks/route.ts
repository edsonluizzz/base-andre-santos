import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getCampaignContext } from "@/lib/campaign-context";


export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { db, cid } = getCampaignContext(session);
    const CID = cid;

    const all = req.nextUrl.searchParams.get("all") === "true" && session.user.role === "ADMIN";

    const tasks = await db.task.findMany({
      where: { campaignId: CID, ...(all ? {} : { assignedToId: session.user.id }) },
      orderBy: [{ status: "asc" }, { priority: "desc" }, { dueDate: "asc" }],
    });

    if (!all) return NextResponse.json(tasks);

    // Para admin: enriquece com nome do usuário atribuído
    const userIds = [...new Set(tasks.map((t) => t.assignedToId))];
    const users = userIds.length > 0
      ? await db.user.findMany({ where: { id: { in: userIds } }, select: { id: true, name: true, email: true } })
      : [];
    const userMap = Object.fromEntries(users.map((u) => [u.id, { name: u.name, email: u.email }]));

    return NextResponse.json(tasks.map((t) => ({ ...t, assignedTo: userMap[t.assignedToId] ?? null })));
  } catch (err) {
    console.error("[tasks GET]", err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { db, cid } = getCampaignContext(session);
    const CID = cid;

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
