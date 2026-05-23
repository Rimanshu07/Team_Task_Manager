import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser, logActivity } from "@/lib/auth";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const projects = await db.project.findMany({
      where: { workspaceId: user.workspaceId },
      include: {
        _count: {
          select: { tasks: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ success: true, projects });
  } catch (error) {
    console.error("GET Projects error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only Admin can create projects
    if (user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden: Only Admins can create projects" }, { status: 403 });
    }

    const body = await req.json();
    const { name, description, status } = body;

    if (!name) {
      return NextResponse.json({ error: "Project name is required" }, { status: 400 });
    }

    const project = await db.project.create({
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        status: status || "ACTIVE",
        workspaceId: user.workspaceId,
      },
    });

    await logActivity(user.id, "CREATE_PROJECT", `Created project "${project.name}"`);

    return NextResponse.json({ success: true, project }, { status: 210 }); // use standard success code
  } catch (error) {
    console.error("POST Project error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
