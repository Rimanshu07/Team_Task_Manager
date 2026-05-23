import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser, logActivity } from "@/lib/auth";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const users = await db.user.findMany({
      where: { workspaceId: user.workspaceId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
      },
      orderBy: { role: "asc" },
    });

    return NextResponse.json({ success: true, users });
  } catch (error) {
    console.error("GET Workspace Users error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only Admin can update user roles
    if (user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden: Only Admins can modify team members" }, { status: 403 });
    }

    const body = await req.json();
    const { userId, role } = body;

    if (!userId || !role) {
      return NextResponse.json({ error: "Missing required fields: userId, role" }, { status: 400 });
    }

    if (role !== "ADMIN" && role !== "MEMBER") {
      return NextResponse.json({ error: "Invalid role value. Must be ADMIN or MEMBER" }, { status: 400 });
    }

    // Prevent Admin from demoting themselves (must remain at least one Admin)
    if (userId === user.id && role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden: You cannot demote yourself. Transfer ownership first." }, { status: 400 });
    }

    // Check user belongs to same workspace
    const targetUser = await db.user.findFirst({
      where: { id: userId, workspaceId: user.workspaceId },
    });

    if (!targetUser) {
      return NextResponse.json({ error: "User not found in this workspace" }, { status: 404 });
    }

    const updatedUser = await db.user.update({
      where: { id: userId },
      data: { role },
      select: { id: true, name: true, role: true },
    });

    await logActivity(
      user.id,
      "UPDATE_MEMBER_ROLE",
      `Changed role of ${updatedUser.name} to ${updatedUser.role}`
    );

    return NextResponse.json({ success: true, user: updatedUser });
  } catch (error) {
    console.error("PATCH Workspace User error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only Admin can remove user
    if (user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden: Only Admins can remove team members" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const targetUserId = searchParams.get("userId");

    if (!targetUserId) {
      return NextResponse.json({ error: "userId query parameter is required" }, { status: 400 });
    }

    if (targetUserId === user.id) {
      return NextResponse.json({ error: "Forbidden: You cannot remove yourself from the workspace" }, { status: 400 });
    }

    // Check target user is in same workspace
    const targetUser = await db.user.findFirst({
      where: { id: targetUserId, workspaceId: user.workspaceId },
    });

    if (!targetUser) {
      return NextResponse.json({ error: "User not found in this workspace" }, { status: 404 });
    }

    await db.user.delete({
      where: { id: targetUserId },
    });

    await logActivity(
      user.id,
      "REMOVE_MEMBER",
      `Removed ${targetUser.name} from the workspace`
    );

    return NextResponse.json({ success: true, message: "Member removed successfully" });
  } catch (error) {
    console.error("DELETE Workspace User error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
