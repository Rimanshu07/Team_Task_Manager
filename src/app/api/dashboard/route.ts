import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const isMember = user.role === "MEMBER";

    // Base filters:
    // If Admin, all tasks in workspace projects.
    // If Member, only tasks assigned to the member.
    const baseTaskFilter: any = {
      project: {
        workspaceId: user.workspaceId,
      },
    };

    if (isMember) {
      baseTaskFilter.assigneeId = user.id;
    }

    // 1. Fetch all matching tasks for stats
    const tasks = await db.task.findMany({
      where: baseTaskFilter,
      include: {
        project: true,
        assignee: {
          select: { id: true, name: true },
        },
      },
    });

    const now = new Date();

    // 2. Counters calculation
    const totalTasks = tasks.length;
    const completedTasks = tasks.filter((t) => t.status === "DONE").length;
    const inProgressTasks = tasks.filter((t) => t.status === "IN_PROGRESS").length;
    const todoTasks = tasks.filter((t) => t.status === "TODO").length;
    const overdueTasks = tasks.filter((t) => new Date(t.dueDate) < now && t.status !== "DONE").length;

    // 3. Status distribution
    const tasksByStatus = {
      TODO: todoTasks,
      IN_PROGRESS: inProgressTasks,
      DONE: completedTasks,
    };

    // 4. Priority distribution
    const tasksByPriority = {
      LOW: tasks.filter((t) => t.priority === "LOW").length,
      MEDIUM: tasks.filter((t) => t.priority === "MEDIUM").length,
      HIGH: tasks.filter((t) => t.priority === "HIGH").length,
      URGENT: tasks.filter((t) => t.priority === "URGENT").length,
    };

    // 5. Tasks by Project distribution
    const projectsMap: { [key: string]: { id: string; name: string; taskCount: number; completedCount: number } } = {};
    
    // Initialize all workspace projects first so they show in charts even if they have 0 tasks
    const allProjects = await db.project.findMany({
      where: { workspaceId: user.workspaceId },
    });
    
    allProjects.forEach((p) => {
      projectsMap[p.id] = { id: p.id, name: p.name, taskCount: 0, completedCount: 0 };
    });

    tasks.forEach((t) => {
      if (projectsMap[t.projectId]) {
        projectsMap[t.projectId].taskCount++;
        if (t.status === "DONE") {
          projectsMap[t.projectId].completedCount++;
        }
      }
    });
    const tasksByProject = Object.values(projectsMap);

    // 6. Tasks by User (team member) distribution
    // For admins, show distribution of all members. For members, just show themselves.
    const usersMap: { [key: string]: { id: string; name: string; taskCount: number; completedCount: number } } = {};
    
    const allUsers = await db.user.findMany({
      where: { workspaceId: user.workspaceId },
      select: { id: true, name: true },
    });

    allUsers.forEach((u) => {
      usersMap[u.id] = { id: u.id, name: u.name, taskCount: 0, completedCount: 0 };
    });

    tasks.forEach((t) => {
      if (t.assigneeId && usersMap[t.assigneeId]) {
        usersMap[t.assigneeId].taskCount++;
        if (t.status === "DONE") {
          usersMap[t.assigneeId].completedCount++;
        }
      }
    });
    const tasksByUser = Object.values(usersMap);

    // 7. Recent Activity Logs
    // Admins see all logs in workspace. Members see only their own activity logs.
    const logFilter: any = {
      user: {
        workspaceId: user.workspaceId,
      },
    };
    if (isMember) {
      logFilter.userId = user.id;
    }

    const recentLogs = await db.activityLog.findMany({
      where: logFilter,
      include: {
        user: {
          select: { name: true, email: true, role: true },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 10,
    });

    return NextResponse.json({
      success: true,
      stats: {
        totalTasks,
        completedTasks,
        inProgressTasks,
        todoTasks,
        overdueTasks,
        completionRate: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0,
      },
      charts: {
        tasksByStatus,
        tasksByPriority,
        tasksByProject,
        tasksByUser,
      },
      recentLogs: recentLogs.map((log) => ({
        id: log.id,
        action: log.action,
        details: log.details,
        createdAt: log.createdAt,
        user: {
          name: log.user.name,
          role: log.user.role,
        },
      })),
    });
  } catch (error) {
    console.error("GET Dashboard error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
