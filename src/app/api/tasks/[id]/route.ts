import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser, logActivity } from "@/lib/auth";

type Props = {
  params: Promise<{ id: string }>;
};

export async function PUT(req: Request, { params }: Props) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Check task exists and belongs to the user's workspace
    const task = await db.task.findFirst({
      where: {
        id,
        project: {
          workspaceId: user.workspaceId,
        },
      },
      include: {
        project: true,
      },
    });

    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 444 });
    }

    const body = await req.json();

    let updatedTask;

    if (user.role === "ADMIN") {
      // Admins can update any field
      const { title, description, status, priority, dueDate, assigneeId, projectId } = body;

      // Validate assignee if provided
      if (assigneeId) {
        const assigneeUser = await db.user.findFirst({
          where: { id: assigneeId, workspaceId: user.workspaceId },
        });
        if (!assigneeUser) {
          return NextResponse.json({ error: "Assignee must belong to the same workspace" }, { status: 400 });
        }
      }

      // Validate project if provided
      if (projectId && projectId !== task.projectId) {
        const project = await db.project.findFirst({
          where: { id: projectId, workspaceId: user.workspaceId },
        });
        if (!project) {
          return NextResponse.json({ error: "Project not found in this workspace" }, { status: 400 });
        }
      }

      updatedTask = await db.task.update({
        where: { id },
        data: {
          title: title ? title.trim() : task.title,
          description: description !== undefined ? description?.trim() : task.description,
          status: status || task.status,
          priority: priority || task.priority,
          dueDate: dueDate ? new Date(dueDate) : task.dueDate,
          assigneeId: assigneeId !== undefined ? (assigneeId === "" ? null : assigneeId) : task.assigneeId,
          projectId: projectId || task.projectId,
        },
        include: {
          project: true,
          assignee: { select: { name: true } },
        },
      });

      await logActivity(
        user.id,
        "UPDATE_TASK",
        `Admin updated task "${updatedTask.title}" (Status: ${updatedTask.status})`
      );
    } else {
      // Members can ONLY update status, and ONLY if the task is assigned to them
      if (task.assigneeId !== user.id) {
        return NextResponse.json({ error: "Forbidden: You can only update tasks assigned to you" }, { status: 403 });
      }

      // Check if they tried to update other fields
      const allowedKeys = ["status"];
      const bodyKeys = Object.keys(body);
      const hasOtherEdits = bodyKeys.some((key) => !allowedKeys.includes(key));

      if (hasOtherEdits) {
        return NextResponse.json({ error: "Forbidden: Members can only update task status" }, { status: 403 });
      }

      const { status } = body;
      if (!status) {
        return NextResponse.json({ error: "Status is required" }, { status: 400 });
      }

      updatedTask = await db.task.update({
        where: { id },
        data: { status },
        include: {
          project: true,
          assignee: { select: { name: true } },
        },
      });

      await logActivity(
        user.id,
        "UPDATE_TASK",
        `Member updated task "${updatedTask.title}" status to ${updatedTask.status}`
      );
    }

    return NextResponse.json({ success: true, task: updatedTask });
  } catch (error) {
    console.error("PUT Task error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: Props) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden: Only Admins can delete tasks" }, { status: 403 });
    }

    const { id } = await params;

    // Check task exists and belongs to workspace
    const task = await db.task.findFirst({
      where: {
        id,
        project: {
          workspaceId: user.workspaceId,
        },
      },
    });

    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 444 });
    }

    await db.task.delete({
      where: { id },
    });

    await logActivity(user.id, "DELETE_TASK", `Deleted task "${task.title}"`);

    return NextResponse.json({ success: true, message: "Task deleted successfully" });
  } catch (error) {
    console.error("DELETE Task error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
