import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser, logActivity } from "@/lib/auth";

export async function GET(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get("projectId");
    const status = searchParams.get("status");
    const priority = searchParams.get("priority");
    const assigneeId = searchParams.get("assigneeId");
    const overdue = searchParams.get("overdue") === "true";

    // Build filter query scoped to the user's workspace
    const whereClause: any = {
      project: {
        workspaceId: user.workspaceId,
      },
    };

    if (projectId) {
      whereClause.projectId = projectId;
    }
    if (status) {
      whereClause.status = status;
    }
    if (priority) {
      whereClause.priority = priority;
    }
    if (assigneeId) {
      whereClause.assigneeId = assigneeId;
    }
    if (overdue) {
      whereClause.dueDate = { lt: new Date() };
      whereClause.status = { not: "DONE" };
    }

    // Role check: Members can only view tasks assigned to them? 
    // Wait, requirement says: "Members can view assigned projects" and "Member: View and update assigned tasks only". 
    // So if the user is a MEMBER, let's filter tasks to only show those where assigneeId === user.id!
    // Wait, yes, "Member: View and update assigned tasks only" means they should only see their own assigned tasks!
    // Let's enforce this:
    if (user.role === "MEMBER") {
      whereClause.assigneeId = user.id;
    }

    const tasks = await db.task.findMany({
      where: whereClause,
      include: {
        project: true,
        assignee: {
          select: { id: true, name: true, email: true, role: true },
        },
        creator: {
          select: { id: true, name: true, email: true },
        },
      },
      orderBy: { dueDate: "asc" },
    });

    return NextResponse.json({ success: true, tasks });
  } catch (error) {
    console.error("GET Tasks error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only Admin can create tasks
    if (user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden: Only Admins can create tasks" }, { status: 403 });
    }

    const body = await req.json();
    const { title, description, status, priority, dueDate, projectId, assigneeId } = body;

    // Validation
    if (!title || !dueDate || !projectId) {
      return NextResponse.json({ error: "Missing required fields: title, dueDate, projectId" }, { status: 400 });
    }

    // Check project exists and belongs to workspace
    const project = await db.project.findFirst({
      where: { id: projectId, workspaceId: user.workspaceId },
    });

    if (!project) {
      return NextResponse.json({ error: "Project not found in this workspace" }, { status: 400 });
    }

    // If assigneeId is provided, check if assignee belongs to same workspace
    if (assigneeId) {
      const assigneeUser = await db.user.findFirst({
        where: { id: assigneeId, workspaceId: user.workspaceId },
      });

      if (!assigneeUser) {
        return NextResponse.json({ error: "Assignee must belong to the same workspace" }, { status: 400 });
      }
    }

    const task = await db.task.create({
      data: {
        title: title.trim(),
        description: description?.trim() || null,
        status: status || "TODO",
        priority: priority || "MEDIUM",
        dueDate: new Date(dueDate),
        projectId,
        assigneeId: assigneeId || null,
        creatorId: user.id,
      },
      include: {
        project: true,
        assignee: {
          select: { name: true },
        },
      },
    });

    // Log Activity
    let activityDetail = `Created task "${task.title}" in project "${task.project.name}"`;
    if (task.assignee) {
      activityDetail += ` and assigned to ${task.assignee.name}`;
    }
    await logActivity(user.id, "CREATE_TASK", activityDetail);

    return NextResponse.json({ success: true, task }, { status: 210 });
  } catch (error) {
    console.error("POST Task error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
