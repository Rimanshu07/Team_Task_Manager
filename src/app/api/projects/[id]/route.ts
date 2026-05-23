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

    if (user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden: Only Admins can modify projects" }, { status: 403 });
    }

    const { id } = await params;
    const body = await req.json();
    const { name, description, status } = body;

    // Check project exists and belongs to the user's workspace
    const project = await db.project.findFirst({
      where: { id, workspaceId: user.workspaceId },
    });

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 444 });
    }

    const updatedProject = await db.project.update({
      where: { id },
      data: {
        name: name ? name.trim() : project.name,
        description: description !== undefined ? description?.trim() : project.description,
        status: status || project.status,
      },
    });

    await logActivity(user.id, "UPDATE_PROJECT", `Updated project "${updatedProject.name}"`);

    return NextResponse.json({ success: true, project: updatedProject });
  } catch (error) {
    console.error("PUT Project error:", error);
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
      return NextResponse.json({ error: "Forbidden: Only Admins can delete projects" }, { status: 403 });
    }

    const { id } = await params;

    // Check project exists and belongs to workspace
    const project = await db.project.findFirst({
      where: { id, workspaceId: user.workspaceId },
    });

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 444 });
    }

    await db.project.delete({
      where: { id },
    });

    await logActivity(user.id, "DELETE_PROJECT", `Deleted project "${project.name}"`);

    return NextResponse.json({ success: true, message: "Project deleted successfully" });
  } catch (error) {
    console.error("DELETE Project error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
