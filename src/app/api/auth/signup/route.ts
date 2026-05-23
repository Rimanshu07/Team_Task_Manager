import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { hashPassword, signToken, logActivity } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, email, password, workspaceName, inviteCode } = body;

    // Validation
    if (!name || !email || !password) {
      return NextResponse.json({ error: "Missing required fields: name, email, password" }, { status: 400 });
    }

    if (!inviteCode && !workspaceName) {
      return NextResponse.json({ error: "Either inviteCode or workspaceName must be provided" }, { status: 400 });
    }

    // Check duplicate email
    const existingUser = await db.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json({ error: "A user with this email already exists" }, { status: 400 });
    }

    let workspaceId = "";
    let role = "MEMBER";

    if (inviteCode) {
      // Find existing workspace
      const workspace = await db.workspace.findUnique({
        where: { inviteCode: inviteCode.trim().toUpperCase() },
      });

      if (!workspace) {
        return NextResponse.json({ error: "Invalid invite code" }, { status: 400 });
      }

      workspaceId = workspace.id;
      role = "MEMBER"; // Joining via invite code always defaults to MEMBER
    } else {
      // Create new workspace
      // Generate unique invite code
      let isCodeUnique = false;
      let generatedCode = "";
      while (!isCodeUnique) {
        generatedCode = "TEAM-" + Math.random().toString(36).substring(2, 8).toUpperCase();
        const existingWorkspace = await db.workspace.findUnique({
          where: { inviteCode: generatedCode },
        });
        if (!existingWorkspace) {
          isCodeUnique = true;
        }
      }

      const workspace = await db.workspace.create({
        data: {
          name: workspaceName.trim(),
          inviteCode: generatedCode,
        },
      });

      workspaceId = workspace.id;
      role = "ADMIN"; // Creator of workspace is ADMIN
    }

    // Hash password and create user
    const passwordHash = await hashPassword(password);
    const user = await db.user.create({
      data: {
        name: name.trim(),
        email: email.trim().toLowerCase(),
        passwordHash,
        role,
        workspaceId,
      },
      include: {
        workspace: true,
      },
    });

    // Sign JWT and set cookie
    const token = signToken(user.id);
    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        workspace: user.workspace,
      },
    });

    response.cookies.set("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: "/",
      sameSite: "strict",
    });

    // Log Activity
    await logActivity(
      user.id,
      "USER_SIGNUP",
      inviteCode ? `Joined workspace via invite code` : `Created workspace "${workspaceName}"`
    );

    return response;
  } catch (error) {
    console.error("Signup error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
