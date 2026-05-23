"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  LayoutDashboard,
  Folder,
  CheckSquare,
  Users,
  LogOut,
  Plus,
  Trash2,
  Calendar,
  AlertCircle,
  TrendingUp,
  Clock,
  ClipboardList,
  User,
  Copy,
  Check,
  Shield,
  Edit2,
  Filter,
  RefreshCw,
} from "lucide-react";

// Types
type Workspace = {
  id: string;
  name: string;
  inviteCode: string;
};

type UserProfile = {
  id: string;
  name: string;
  email: string;
  role: "ADMIN" | "MEMBER";
  workspaceId: string;
  workspace: Workspace;
};

type Project = {
  id: string;
  name: string;
  description: string | null;
  status: string;
  _count?: { tasks: number };
};

type Task = {
  id: string;
  title: string;
  description: string | null;
  status: "TODO" | "IN_PROGRESS" | "DONE";
  priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  dueDate: string;
  projectId: string;
  project: Project;
  assigneeId: string | null;
  assignee: { id: string; name: string; email: string; role: string } | null;
  creator: { id: string; name: string; email: string };
};

type TeamMember = {
  id: string;
  name: string;
  email: string;
  role: "ADMIN" | "MEMBER";
  createdAt: string;
};

type ActivityLog = {
  id: string;
  action: string;
  details: string;
  createdAt: string;
  user: { name: string; role: string };
};

type DashboardStats = {
  totalTasks: number;
  completedTasks: number;
  inProgressTasks: number;
  todoTasks: number;
  overdueTasks: number;
  completionRate: number;
};

type DashboardCharts = {
  tasksByStatus: { TODO: number; IN_PROGRESS: number; DONE: number };
  tasksByPriority: { LOW: number; MEDIUM: number; HIGH: number; URGENT: number };
  tasksByProject: Array<{ id: string; name: string; taskCount: number; completedCount: number }>;
  tasksByUser: Array<{ id: string; name: string; taskCount: number; completedCount: number }>;
};

type ToastType = {
  id: string;
  message: string;
  type: "success" | "error" | "info";
};

export default function AetherTaskManager() {
  // Navigation & Authentication
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"dashboard" | "projects" | "tasks" | "team">("dashboard");

  // Auth Forms State
  const [isLoginTab, setIsLoginTab] = useState(true);
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authName, setAuthName] = useState("");
  const [authWorkspaceName, setAuthWorkspaceName] = useState("");
  const [authInviteCode, setAuthInviteCode] = useState("");
  const [authError, setAuthError] = useState("");
  const [authFormLoading, setAuthFormLoading] = useState(false);

  // Application Data State
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [recentLogs, setRecentLogs] = useState<ActivityLog[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [charts, setCharts] = useState<DashboardCharts | null>(null);

  // Filters for Tasks View
  const [filterProject, setFilterProject] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterPriority, setFilterPriority] = useState("");
  const [filterAssignee, setFilterAssignee] = useState("");
  const [filterOverdue, setFilterOverdue] = useState(false);

  // Modals state
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [projectFormName, setProjectFormName] = useState("");
  const [projectFormDesc, setProjectFormDesc] = useState("");
  const [projectFormId, setProjectFormId] = useState<string | null>(null); // For edit mode

  const [showTaskModal, setShowTaskModal] = useState(false);
  const [taskFormTitle, setTaskFormTitle] = useState("");
  const [taskFormDesc, setTaskFormDesc] = useState("");
  const [taskFormStatus, setTaskFormStatus] = useState<"TODO" | "IN_PROGRESS" | "DONE">("TODO");
  const [taskFormPriority, setTaskFormPriority] = useState<"LOW" | "MEDIUM" | "HIGH" | "URGENT">("MEDIUM");
  const [taskFormDueDate, setTaskFormDueDate] = useState("");
  const [taskFormProject, setTaskFormProject] = useState("");
  const [taskFormAssignee, setTaskFormAssignee] = useState("");
  const [taskFormId, setTaskFormId] = useState<string | null>(null); // For edit mode

  // Toasts state
  const [toasts, setToasts] = useState<ToastType[]>([]);
  const [copiedInvite, setCopiedInvite] = useState(false);

  // Custom Toast trigger
  const showToast = useCallback((message: string, type: "success" | "error" | "info" = "info") => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  // Fetch session profile
  const fetchSession = async () => {
    try {
      const res = await fetch("/api/auth/me");
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSession();
  }, []);

  // API Call wrappers
  const fetchDashboardData = async () => {
    try {
      const res = await fetch("/api/dashboard");
      if (res.ok) {
        const data = await res.json();
        setStats(data.stats);
        setCharts(data.charts);
        setRecentLogs(data.recentLogs);
      }
    } catch (err) {
      console.error("Fetch dashboard error", err);
    }
  };

  const fetchProjects = async () => {
    try {
      const res = await fetch("/api/projects");
      if (res.ok) {
        const data = await res.json();
        setProjects(data.projects);
      }
    } catch (err) {
      console.error("Fetch projects error", err);
    }
  };

  const fetchTasks = useCallback(async () => {
    try {
      const queryParams = new URLSearchParams();
      if (filterProject) queryParams.append("projectId", filterProject);
      if (filterStatus) queryParams.append("status", filterStatus);
      if (filterPriority) queryParams.append("priority", filterPriority);
      if (filterAssignee) queryParams.append("assigneeId", filterAssignee);
      if (filterOverdue) queryParams.append("overdue", "true");

      const res = await fetch(`/api/tasks?${queryParams.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setTasks(data.tasks);
      }
    } catch (err) {
      console.error("Fetch tasks error", err);
    }
  }, [filterProject, filterStatus, filterPriority, filterAssignee, filterOverdue]);

  const fetchTeamMembers = async () => {
    try {
      const res = await fetch("/api/workspace/users");
      if (res.ok) {
        const data = await res.json();
        setTeamMembers(data.users);
      }
    } catch (err) {
      console.error("Fetch team error", err);
    }
  };

  // Load all workspace data once authenticated
  useEffect(() => {
    if (user) {
      fetchDashboardData();
      fetchProjects();
      fetchTasks();
      fetchTeamMembers();
    }
  }, [user, fetchTasks]);

  // Refresh tasks whenever filter properties change
  useEffect(() => {
    if (user) {
      fetchTasks();
    }
  }, [user, filterProject, filterStatus, filterPriority, filterAssignee, filterOverdue, fetchTasks]);

  // Authentication Handlers
  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError("");
    setAuthFormLoading(true);

    const endpoint = isLoginTab ? "/api/auth/login" : "/api/auth/signup";
    const payload = isLoginTab
      ? { email: authEmail, password: authPassword }
      : {
          name: authName,
          email: authEmail,
          password: authPassword,
          workspaceName: authWorkspaceName || undefined,
          inviteCode: authInviteCode || undefined,
        };

    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (res.ok) {
        setUser(data.user);
        showToast(isLoginTab ? `Welcome back, ${data.user.name}!` : `Account created successfully!`, "success");
      } else {
        setAuthError(data.error || "Authentication failed");
      }
    } catch {
      setAuthError("Failed to connect to the server.");
    } finally {
      setAuthFormLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      const res = await fetch("/api/auth/logout", { method: "POST" });
      if (res.ok) {
        setUser(null);
        setActiveTab("dashboard");
        showToast("Logged out successfully.", "info");
      }
    } catch {
      showToast("Logout failed.", "error");
    }
  };

  // Project Handlers (Create & Edit)
  const handleProjectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectFormName) return;

    try {
      const endpoint = projectFormId ? `/api/projects/${projectFormId}` : "/api/projects";
      const method = projectFormId ? "PUT" : "POST";

      const res = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: projectFormName, description: projectFormDesc }),
      });

      if (res.ok) {
        showToast(projectFormId ? "Project updated successfully!" : "New project created!", "success");
        setShowProjectModal(false);
        setProjectFormName("");
        setProjectFormDesc("");
        setProjectFormId(null);
        fetchProjects();
        fetchDashboardData();
      } else {
        const data = await res.json();
        showToast(data.error || "Failed to save project.", "error");
      }
    } catch {
      showToast("Server error saving project.", "error");
    }
  };

  const handleDeleteProject = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete project "${name}"? This will delete all its tasks!`)) return;

    try {
      const res = await fetch(`/api/projects/${id}`, { method: "DELETE" });
      if (res.ok) {
        showToast("Project deleted.", "success");
        fetchProjects();
        fetchTasks();
        fetchDashboardData();
      } else {
        const data = await res.json();
        showToast(data.error || "Failed to delete project.", "error");
      }
    } catch {
      showToast("Server error deleting project.", "error");
    }
  };

  // Task Handlers (Create, Edit, Status quick change, Delete)
  const handleTaskSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskFormTitle || !taskFormDueDate || !taskFormProject) {
      showToast("Please fill in all required fields.", "error");
      return;
    }

    const payload = {
      title: taskFormTitle,
      description: taskFormDesc,
      status: taskFormStatus,
      priority: taskFormPriority,
      dueDate: taskFormDueDate,
      projectId: taskFormProject,
      assigneeId: taskFormAssignee || null,
    };

    try {
      const endpoint = taskFormId ? `/api/tasks/${taskFormId}` : "/api/tasks";
      const method = taskFormId ? "PUT" : "POST";

      const res = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        showToast(taskFormId ? "Task updated!" : "Task created successfully!", "success");
        setShowTaskModal(false);
        setTaskFormTitle("");
        setTaskFormDesc("");
        setTaskFormStatus("TODO");
        setTaskFormPriority("MEDIUM");
        setTaskFormDueDate("");
        setTaskFormProject("");
        setTaskFormAssignee("");
        setTaskFormId(null);
        fetchTasks();
        fetchDashboardData();
      } else {
        const data = await res.json();
        showToast(data.error || "Failed to save task.", "error");
      }
    } catch {
      showToast("Server error saving task.", "error");
    }
  };

  const handleTaskStatusChange = async (task: Task, newStatus: "TODO" | "IN_PROGRESS" | "DONE") => {
    try {
      const res = await fetch(`/api/tasks/${task.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      if (res.ok) {
        showToast(`Task status updated to ${newStatus === "IN_PROGRESS" ? "In Progress" : newStatus === "TODO" ? "To Do" : "Done"}!`, "success");
        fetchTasks();
        fetchDashboardData();
      } else {
        const data = await res.json();
        showToast(data.error || "Unauthorized to update this task.", "error");
      }
    } catch {
      showToast("Error updating task status.", "error");
    }
  };

  const handleDeleteTask = async (id: string, title: string) => {
    if (!confirm(`Are you sure you want to delete task "${title}"?`)) return;

    try {
      const res = await fetch(`/api/tasks/${id}`, { method: "DELETE" });
      if (res.ok) {
        showToast("Task deleted.", "success");
        fetchTasks();
        fetchDashboardData();
      } else {
        const data = await res.json();
        showToast(data.error || "Failed to delete task.", "error");
      }
    } catch {
      showToast("Error deleting task.", "error");
    }
  };

  // Team Member Handlers
  const handleUpdateRole = async (userId: string, currentRole: string) => {
    const newRole = currentRole === "ADMIN" ? "MEMBER" : "ADMIN";
    if (!confirm(`Are you sure you want to change this member's role to ${newRole}?`)) return;

    try {
      const res = await fetch("/api/workspace/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, role: newRole }),
      });

      if (res.ok) {
        showToast("User role updated.", "success");
        fetchTeamMembers();
        fetchDashboardData();
      } else {
        const data = await res.json();
        showToast(data.error || "Failed to update role.", "error");
      }
    } catch {
      showToast("Error updating member role.", "error");
    }
  };

  const handleRemoveMember = async (userId: string, name: string) => {
    if (!confirm(`Are you sure you want to remove ${name} from the workspace?`)) return;

    try {
      const res = await fetch(`/api/workspace/users?userId=${userId}`, { method: "DELETE" });
      if (res.ok) {
        showToast(`${name} has been removed.`, "success");
        fetchTeamMembers();
        fetchTasks();
        fetchDashboardData();
      } else {
        const data = await res.json();
        showToast(data.error || "Failed to remove member.", "error");
      }
    } catch {
      showToast("Error removing member.", "error");
    }
  };

  // Copy Workspace Invite Code Utility
  const copyInviteCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedInvite(true);
    showToast("Invite code copied to clipboard!", "success");
    setTimeout(() => setCopiedInvite(false), 2000);
  };

  // Open modals with pre-populated values for edit mode
  const openEditProject = (p: Project) => {
    setProjectFormId(p.id);
    setProjectFormName(p.name);
    setProjectFormDesc(p.description || "");
    setShowProjectModal(true);
  };

  const openEditTask = (t: Task) => {
    setTaskFormId(t.id);
    setTaskFormTitle(t.title);
    setTaskFormDesc(t.description || "");
    setTaskFormStatus(t.status);
    setTaskFormPriority(t.priority);
    setTaskFormDueDate(t.dueDate.split("T")[0]);
    setTaskFormProject(t.projectId);
    setTaskFormAssignee(t.assigneeId || "");
    setShowTaskModal(true);
  };

  // Format date helper
  const formatDate = (dateStr: string) => {
    if (!dateStr) return "No due date";
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  };

  // Check if a task is overdue helper
  const isOverdue = (dateStr: string, status: string) => {
    if (status === "DONE") return false;
    return new Date(dateStr) < new Date();
  };

  // Render Loader during initial session check
  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100vh", backgroundColor: "#07090e" }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "1rem" }}>
          <RefreshCw style={{ animation: "spin 1.5s linear infinite", color: "#6366f1", width: "40px", height: "40px" }} />
          <p style={{ color: "#9ca3af", fontFamily: "Outfit, sans-serif" }}>Loading Aether Task...</p>
        </div>
        <style jsx global>{`
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  // 1. GORGEOUS AUTHENTICATION SCREENS (LOGIN / SIGNUP)
  if (!user) {
    return (
      <div style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "1.5rem",
        background: "radial-gradient(circle at top right, rgba(99, 102, 241, 0.15), transparent 60%), radial-gradient(circle at bottom left, rgba(59, 130, 246, 0.1), transparent 60%), #07090e",
        fontFamily: "Outfit, sans-serif"
      }}>
        {/* Toast Containers */}
        <div className="toast-container">
          {toasts.map((t) => (
            <div key={t.id} className={`toast toast-${t.type}`}>
              <span style={{ fontSize: "1.2rem" }}>
                {t.type === "success" ? "✓" : t.type === "error" ? "✕" : "ℹ"}
              </span>
              <p style={{ color: "#fff", fontSize: "0.9rem" }}>{t.message}</p>
            </div>
          ))}
        </div>

        <div className="glass-card animate-scale-in" style={{ width: "100%", maxWidth: "460px", padding: "2.5rem" }}>
          {/* Brand Logo */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: "2rem", textAlign: "center" }}>
            <div style={{
              width: "50px",
              height: "50px",
              borderRadius: "12px",
              background: "linear-gradient(135deg, #6366f1, #3b82f6)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 0 20px rgba(99, 102, 241, 0.4)",
              marginBottom: "1rem"
            }}>
              <CheckSquare style={{ color: "#fff", width: "26px", height: "26px" }} />
            </div>
            <h1 style={{ fontSize: "2rem", fontWeight: 700, background: "linear-gradient(135deg, #fff 40%, #9ca3af)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              AETHER TASK
            </h1>
            <p style={{ color: "#6b7280", fontSize: "0.85rem", marginTop: "0.25rem", textTransform: "uppercase", letterSpacing: "0.08em" }}>
              Premium Full-Stack Task Workspace
            </p>
          </div>

          {/* Form Tabs */}
          <div style={{ display: "flex", background: "rgba(0,0,0,0.2)", padding: "4px", borderRadius: "8px", marginBottom: "1.5rem" }}>
            <button
              onClick={() => { setIsLoginTab(true); setAuthError(""); }}
              style={{
                flex: 1,
                padding: "0.5rem",
                borderRadius: "6px",
                border: "none",
                background: isLoginTab ? "rgba(99,102,241,0.2)" : "transparent",
                color: isLoginTab ? "#fff" : "#9ca3af",
                fontWeight: 600,
                cursor: "pointer",
                transition: "all 0.2s"
              }}
            >
              Sign In
            </button>
            <button
              onClick={() => { setIsLoginTab(false); setAuthError(""); }}
              style={{
                flex: 1,
                padding: "0.5rem",
                borderRadius: "6px",
                border: "none",
                background: !isLoginTab ? "rgba(99,102,241,0.2)" : "transparent",
                color: !isLoginTab ? "#fff" : "#9ca3af",
                fontWeight: 600,
                cursor: "pointer",
                transition: "all 0.2s"
              }}
            >
              Register Team
            </button>
          </div>

          {/* Auth Error */}
          {authError && (
            <div style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              background: "rgba(239,68,68,0.1)",
              border: "1px solid rgba(239,68,68,0.2)",
              padding: "0.75rem 1rem",
              borderRadius: "8px",
              marginBottom: "1.25rem",
              color: "#f87171",
              fontSize: "0.85rem"
            }}>
              <AlertCircle style={{ width: "16px", height: "16px", flexShrink: 0 }} />
              <p>{authError}</p>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleAuth}>
            {!isLoginTab && (
              <div className="form-group animate-fade-in">
                <label>Full Name</label>
                <input
                  type="text"
                  placeholder="Enter your name"
                  value={authName}
                  onChange={(e) => setAuthName(e.target.value)}
                  className="input-field"
                  required
                />
              </div>
            )}

            <div className="form-group">
              <label>Email Address</label>
              <input
                type="email"
                placeholder="you@example.com"
                value={authEmail}
                onChange={(e) => setAuthEmail(e.target.value)}
                className="input-field"
                required
              />
            </div>

            <div className="form-group">
              <label>Password</label>
              <input
                type="password"
                placeholder="••••••••"
                value={authPassword}
                onChange={(e) => setAuthPassword(e.target.value)}
                className="input-field"
                required
              />
            </div>

            {!isLoginTab && (
              <div style={{ marginTop: "1rem", borderTop: "1px solid rgba(255,255,255,0.05)", paddingTop: "1rem" }} className="animate-fade-in">
                <div style={{ display: "flex", gap: "1rem", marginBottom: "0.75rem" }}>
                  <p style={{ fontSize: "0.8rem", color: "#9ca3af", fontWeight: 600 }}>Create new team or join one?</p>
                </div>
                <div className="form-group">
                  <label>Create Workspace (Workspace Name)</label>
                  <input
                    type="text"
                    placeholder="e.g., Acme Corp Team"
                    value={authWorkspaceName}
                    onChange={(e) => { setAuthWorkspaceName(e.target.value); setAuthInviteCode(""); }}
                    className="input-field"
                    required={!authInviteCode}
                  />
                </div>
                <div style={{ textAlign: "center", color: "#6b7280", fontSize: "0.75rem", margin: "0.5rem 0" }}>— OR JOIN TEAM —</div>
                <div className="form-group">
                  <label>Join Workspace (Invite Code)</label>
                  <input
                    type="text"
                    placeholder="e.g., TEAM-ABC123"
                    value={authInviteCode}
                    onChange={(e) => { setAuthInviteCode(e.target.value.toUpperCase()); setAuthWorkspaceName(""); }}
                    className="input-field"
                    required={!authWorkspaceName}
                  />
                </div>
              </div>
            )}

            <button type="submit" className="btn btn-primary" style={{ width: "100%", marginTop: "1.5rem" }} disabled={authFormLoading}>
              {authFormLoading ? (
                <RefreshCw style={{ animation: "spin 1s linear infinite", width: "18px", height: "18px" }} />
              ) : isLoginTab ? (
                "Sign In to Dashboard"
              ) : (
                "Complete Registration"
              )}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // 2. MAIN APPLICATION CORE WORKSPACE (AUTHENTICATED VIEWS)
  return (
    <div className="app-container">
      {/* Toast Notifications */}
      <div className="toast-container">
        {toasts.map((t) => (
          <div key={t.id} className={`toast toast-${t.type}`}>
            <span style={{ fontSize: "1.2rem" }}>
              {t.type === "success" ? "✓" : t.type === "error" ? "✕" : "ℹ"}
            </span>
            <p style={{ color: "#fff", fontSize: "0.9rem" }}>{t.message}</p>
          </div>
        ))}
      </div>

      {/* TOP NAVIGATION BAR */}
      <div style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        height: "var(--topbar-height)",
        background: "rgba(11, 15, 25, 0.8)",
        backdropFilter: "blur(12px)",
        borderBottom: "1px solid var(--border-color)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 2rem",
        zIndex: 99
      }}>
        {/* Workspace Brand Indicator */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", paddingLeft: "max(0px, calc(var(--sidebar-width) - 2rem + 1rem))" }}>
          <div style={{
            width: "36px",
            height: "36px",
            borderRadius: "8px",
            background: "var(--accent-glow)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center"
          }}>
            <CheckSquare style={{ color: "#fff", width: "20px", height: "20px" }} />
          </div>
          <div>
            <h3 style={{ fontSize: "1.1rem", fontWeight: 700, color: "#fff" }}>{user.workspace.name}</h3>
            <p style={{ fontSize: "0.7rem", color: "var(--text-secondary)", display: "flex", alignItems: "center", gap: "0.25rem" }}>
              Invite: <span style={{ fontFamily: "monospace", color: "#818cf8", fontWeight: 600 }}>{user.workspace.inviteCode}</span>
            </p>
          </div>
        </div>

        {/* User profile dropdown and signout */}
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
            <p style={{ fontSize: "0.9rem", fontWeight: 600, color: "#fff" }}>{user.name}</p>
            <span className="badge badge-role" style={{ fontSize: "0.6rem", padding: "0.1rem 0.5rem", marginTop: "2px" }}>
              <Shield style={{ width: "10px", height: "10px", marginRight: "3px" }} /> {user.role}
            </span>
          </div>
          <div style={{ width: "38px", height: "38px", borderRadius: "50%", background: "rgba(99, 102, 241, 0.1)", border: "1px solid var(--accent-primary)", display: "flex", alignItems: "center", justifyItems: "center", justifyContent: "center" }}>
            <User style={{ color: "var(--accent-primary)", width: "18px", height: "18px" }} />
          </div>
        </div>
      </div>

      {/* SIDEBAR NAVIGATION PANEL */}
      <div style={{
        position: "fixed",
        top: 0,
        bottom: 0,
        left: 0,
        width: "var(--sidebar-width)",
        background: "rgba(7, 9, 14, 0.95)",
        borderRight: "1px solid var(--border-color)",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: "1.5rem 1rem",
        paddingTop: "calc(var(--topbar-height) + 1rem)",
        zIndex: 98
      }}>
        {/* Navigation list */}
        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          <button
            onClick={() => setActiveTab("dashboard")}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.75rem",
              padding: "0.75rem 1rem",
              borderRadius: "8px",
              border: "none",
              background: activeTab === "dashboard" ? "rgba(99, 102, 241, 0.15)" : "transparent",
              color: activeTab === "dashboard" ? "#fff" : "var(--text-secondary)",
              fontWeight: 600,
              fontSize: "0.95rem",
              cursor: "pointer",
              textAlign: "left",
              transition: "all 0.2s"
            }}
          >
            <LayoutDashboard style={{ width: "18px", height: "18px", color: activeTab === "dashboard" ? "var(--accent-primary)" : "inherit" }} />
            Dashboard
          </button>

          <button
            onClick={() => setActiveTab("projects")}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.75rem",
              padding: "0.75rem 1rem",
              borderRadius: "8px",
              border: "none",
              background: activeTab === "projects" ? "rgba(99, 102, 241, 0.15)" : "transparent",
              color: activeTab === "projects" ? "#fff" : "var(--text-secondary)",
              fontWeight: 600,
              fontSize: "0.95rem",
              cursor: "pointer",
              textAlign: "left",
              transition: "all 0.2s"
            }}
          >
            <Folder style={{ width: "18px", height: "18px", color: activeTab === "projects" ? "var(--accent-primary)" : "inherit" }} />
            Projects
          </button>

          <button
            onClick={() => setActiveTab("tasks")}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.75rem",
              padding: "0.75rem 1rem",
              borderRadius: "8px",
              border: "none",
              background: activeTab === "tasks" ? "rgba(99, 102, 241, 0.15)" : "transparent",
              color: activeTab === "tasks" ? "#fff" : "var(--text-secondary)",
              fontWeight: 600,
              fontSize: "0.95rem",
              cursor: "pointer",
              textAlign: "left",
              transition: "all 0.2s"
            }}
          >
            <CheckSquare style={{ width: "18px", height: "18px", color: activeTab === "tasks" ? "var(--accent-primary)" : "inherit" }} />
            Kanban Board
          </button>

          <button
            onClick={() => setActiveTab("team")}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.75rem",
              padding: "0.75rem 1rem",
              borderRadius: "8px",
              border: "none",
              background: activeTab === "team" ? "rgba(99, 102, 241, 0.15)" : "transparent",
              color: activeTab === "team" ? "#fff" : "var(--text-secondary)",
              fontWeight: 600,
              fontSize: "0.95rem",
              cursor: "pointer",
              textAlign: "left",
              transition: "all 0.2s"
            }}
          >
            <Users style={{ width: "18px", height: "18px", color: activeTab === "team" ? "var(--accent-primary)" : "inherit" }} />
            Workspace Team
          </button>
        </div>

        {/* Workspace Invite Copy + Logout footer */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <div className="glass-card" style={{ padding: "0.75rem", background: "rgba(99, 102, 241, 0.03)" }}>
            <p style={{ fontSize: "0.7rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 600 }}>Invite Members</p>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "4px", gap: "4px" }}>
              <span style={{ fontFamily: "monospace", fontSize: "0.8rem", color: "#a855f7", fontWeight: 700 }}>{user.workspace.inviteCode}</span>
              <button
                onClick={() => copyInviteCode(user.workspace.inviteCode)}
                style={{ background: "transparent", border: "none", cursor: "pointer", color: copiedInvite ? "#10b981" : "var(--text-secondary)" }}
              >
                {copiedInvite ? <Check style={{ width: "14px", height: "14px" }} /> : <Copy style={{ width: "14px", height: "14px" }} />}
              </button>
            </div>
          </div>

          <button
            onClick={handleLogout}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.75rem",
              padding: "0.75rem 1rem",
              borderRadius: "8px",
              border: "none",
              background: "rgba(239, 68, 68, 0.05)",
              color: "#f87171",
              fontWeight: 600,
              cursor: "pointer",
              width: "100%",
              textAlign: "left",
              transition: "all 0.2s"
            }}
          >
            <LogOut style={{ width: "18px", height: "18px" }} />
            Sign Out
          </button>
        </div>
      </div>

      {/* CORE WORKSPACE MAIN WINDOW AREA */}
      <main className="main-content">

        {/* 2A. TAB VIEW: INTEGRATED DASHBOARD & ANALYTICS */}
        {activeTab === "dashboard" && stats && (
          <div className="animate-slide-up">
            {/* Greeting Top Bar */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
              <div>
                <h2 style={{ fontSize: "1.8rem", fontWeight: 700 }}>Welcome Back, {user.name.split(" ")[0]}!</h2>
                <p style={{ color: "var(--text-secondary)", fontSize: "0.95rem" }}>
                  Here is the operational status of your tasks in <strong>{user.workspace.name}</strong>.
                </p>
              </div>
              <button onClick={() => { fetchDashboardData(); showToast("Dashboard reloaded", "info"); }} className="btn btn-secondary" style={{ padding: "0.5rem 1rem" }}>
                <RefreshCw style={{ width: "14px", height: "14px" }} /> Refresh Metrics
              </button>
            </div>

            {/* Counter Grid */}
            <div className="dashboard-grid">
              <div className="glass-card glass-card-glow" style={{ borderLeft: "4px solid var(--accent-primary)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div>
                    <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem", textTransform: "uppercase", fontWeight: 600 }}>Total Scope</p>
                    <h3 style={{ fontSize: "2rem", marginTop: "0.25rem" }}>{stats.totalTasks}</h3>
                  </div>
                  <div style={{ padding: "0.5rem", borderRadius: "8px", background: "rgba(99,102,241,0.1)", color: "var(--accent-primary)" }}>
                    <ClipboardList style={{ width: "20px", height: "20px" }} />
                  </div>
                </div>
                <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "0.75rem" }}>Tasks assigned or created</p>
              </div>

              <div className="glass-card" style={{ borderLeft: "4px solid var(--status-progress)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div>
                    <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem", textTransform: "uppercase", fontWeight: 600 }}>In Progress</p>
                    <h3 style={{ fontSize: "2rem", marginTop: "0.25rem" }}>{stats.inProgressTasks}</h3>
                  </div>
                  <div style={{ padding: "0.5rem", borderRadius: "8px", background: "rgba(245,158,11,0.1)", color: "var(--status-progress)" }}>
                    <Clock style={{ width: "20px", height: "20px" }} />
                  </div>
                </div>
                <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "0.75rem" }}>Active tasks being worked on</p>
              </div>

              <div className="glass-card" style={{ borderLeft: "4px solid var(--status-done)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div>
                    <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem", textTransform: "uppercase", fontWeight: 600 }}>Completed</p>
                    <h3 style={{ fontSize: "2rem", marginTop: "0.25rem" }}>{stats.completedTasks}</h3>
                  </div>
                  <div style={{ padding: "0.5rem", borderRadius: "8px", background: "rgba(16,185,129,0.1)", color: "var(--status-done)" }}>
                    <CheckSquare style={{ width: "20px", height: "20px" }} />
                  </div>
                </div>
                <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "0.75rem" }}>
                  Completion rate: <strong>{stats.completionRate}%</strong>
                </p>
              </div>

              <div className="glass-card" style={{ borderLeft: "4px solid var(--status-overdue)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div>
                    <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem", textTransform: "uppercase", fontWeight: 600 }}>Overdue</p>
                    <h3 style={{ fontSize: "2rem", marginTop: "0.25rem", color: stats.overdueTasks > 0 ? "var(--status-overdue)" : "inherit" }}>
                      {stats.overdueTasks}
                    </h3>
                  </div>
                  <div style={{ padding: "0.5rem", borderRadius: "8px", background: "rgba(239,68,68,0.1)", color: "var(--status-overdue)" }}>
                    <AlertCircle style={{ width: "20px", height: "20px" }} />
                  </div>
                </div>
                <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "0.75rem" }}>Requires immediate attention</p>
              </div>
            </div>

            {/* Visual Analytics with Custom SVG Charts */}
            <div className="analytics-grid">
              {/* Project distribution bar chart */}
              <div className="glass-card">
                <h3 style={{ fontSize: "1.1rem", fontWeight: 600, marginBottom: "1.5rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <TrendingUp style={{ color: "var(--accent-primary)", width: "18px", height: "18px" }} /> Tasks Allocations Per Project
                </h3>

                {charts && charts.tasksByProject.length > 0 ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                    {charts.tasksByProject.map((proj) => {
                      const percentage = proj.taskCount > 0 ? Math.round((proj.completedCount / proj.taskCount) * 100) : 0;
                      return (
                        <div key={proj.id} style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem" }}>
                            <span style={{ fontWeight: 600, color: "#fff" }}>{proj.name}</span>
                            <span style={{ color: "var(--text-secondary)" }}>
                              {proj.completedCount} / {proj.taskCount} tasks ({percentage}%)
                            </span>
                          </div>
                          {/* Animated SVG horizontal gauge line */}
                          <svg width="100%" height="8" style={{ borderRadius: "4px", background: "rgba(255,255,255,0.05)" }}>
                            <rect
                              width={`${Math.max(percentage, 2)}%`}
                              height="100%"
                              fill="url(#indigoGrad)"
                              rx="4"
                              style={{ transition: "width 1s cubic-bezier(0.4, 0, 0.2, 1)" }}
                            />
                            <defs>
                              <linearGradient id="indigoGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                                <stop offset="0%" stopColor="#6366f1" />
                                <stop offset="100%" stopColor="#3b82f6" />
                              </linearGradient>
                            </defs>
                          </svg>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "200px", color: "var(--text-muted)" }}>
                    Create projects to see distribution
                  </div>
                )}
              </div>

              {/* Status Ring Chart (radial SVG gauge) */}
              <div className="glass-card" style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center" }}>
                <h3 style={{ fontSize: "1.1rem", fontWeight: 600, alignSelf: "flex-start", marginBottom: "1.5rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  Completion Status Gauge
                </h3>

                <div style={{ position: "relative", width: "160px", height: "160px", marginBottom: "1rem" }}>
                  {/* Custom animated ring */}
                  <svg width="100%" height="100%" viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r="40" stroke="rgba(255,255,255,0.05)" strokeWidth="8" fill="transparent" />
                    <circle
                      cx="50"
                      cy="50"
                      r="40"
                      stroke="url(#radialAccent)"
                      strokeWidth="8"
                      fill="transparent"
                      strokeDasharray={`${2 * Math.PI * 40}`}
                      strokeDashoffset={`${2 * Math.PI * 40 * (1 - stats.completionRate / 100)}`}
                      strokeLinecap="round"
                      transform="rotate(-90 50 50)"
                      style={{ transition: "stroke-dashoffset 1s ease" }}
                    />
                    <defs>
                      <linearGradient id="radialAccent" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#6366f1" />
                        <stop offset="100%" stopColor="#a855f7" />
                      </linearGradient>
                    </defs>
                  </svg>
                  <div style={{
                    position: "absolute",
                    top: "50%",
                    left: "50%",
                    transform: "translate(-50%, -50%)",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center"
                  }}>
                    <span style={{ fontSize: "1.8rem", fontWeight: 700, color: "#fff" }}>{stats.completionRate}%</span>
                    <span style={{ fontSize: "0.65rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Done</span>
                  </div>
                </div>

                <div style={{ display: "flex", justifyContent: "center", gap: "1rem", flexWrap: "wrap", fontSize: "0.8rem", color: "var(--text-secondary)" }}>
                  <span style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
                    <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "var(--status-todo)" }} /> To Do ({stats.todoTasks})
                  </span>
                  <span style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
                    <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "var(--status-progress)" }} /> In Progress ({stats.inProgressTasks})
                  </span>
                  <span style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
                    <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "var(--status-done)" }} /> Completed ({stats.completedTasks})
                  </span>
                </div>
              </div>
            </div>

            {/* Recent Activity Log Feed */}
            <div className="glass-card">
              <h3 style={{ fontSize: "1.1rem", fontWeight: 600, marginBottom: "1rem" }}>Workspace Operation Logs</h3>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", maxHeight: "300px", overflowY: "auto" }}>
                {recentLogs.length > 0 ? (
                  recentLogs.map((log) => (
                    <div key={log.id} style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "0.75rem 1rem",
                      background: "rgba(255,255,255,0.02)",
                      border: "1px solid var(--border-color)",
                      borderRadius: "8px",
                      fontSize: "0.85rem"
                    }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                        <span style={{
                          padding: "0.25rem 0.5rem",
                          borderRadius: "4px",
                          background: log.action.includes("SIGNUP") || log.action.includes("LOGIN") ? "rgba(99,102,241,0.1)" : log.action.includes("CREATE") ? "rgba(16,185,129,0.1)" : "rgba(245,158,11,0.1)",
                          color: log.action.includes("SIGNUP") || log.action.includes("LOGIN") ? "#818cf8" : log.action.includes("CREATE") ? "#10b981" : "#f59e0b",
                          fontSize: "0.65rem",
                          fontWeight: 700,
                          fontFamily: "monospace"
                        }}>
                          {log.action}
                        </span>
                        <div>
                          <p style={{ color: "#fff" }}>{log.details}</p>
                          <p style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>
                            Triggered by: <strong>{log.user.name}</strong> ({log.user.role})
                          </p>
                        </div>
                      </div>
                      <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", display: "flex", alignItems: "center", gap: "0.25rem" }}>
                        <Clock style={{ width: "12px", height: "12px" }} /> {formatDate(log.createdAt)}
                      </span>
                    </div>
                  ))
                ) : (
                  <div style={{ textAlign: "center", color: "var(--text-muted)", padding: "2rem" }}>No activities logged yet.</div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* 2B. TAB VIEW: PROJECT MANAGEMENT LIST */}
        {activeTab === "projects" && (
          <div className="animate-slide-up">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem" }}>
              <div>
                <h2 style={{ fontSize: "1.8rem", fontWeight: 700 }}>Workspace Projects</h2>
                <p style={{ color: "var(--text-secondary)", fontSize: "0.95rem" }}>
                  Configure structural project containers to manage tasks and scoping.
                </p>
              </div>
              {user.role === "ADMIN" && (
                <button onClick={() => { setProjectFormId(null); setProjectFormName(""); setProjectFormDesc(""); setShowProjectModal(true); }} className="btn btn-primary">
                  <Plus style={{ width: "18px", height: "18px" }} /> Create Project
                </button>
              )}
            </div>

            {projects.length > 0 ? (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "1.5rem" }}>
                {projects.map((proj) => (
                  <div key={proj.id} className="glass-card" style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", minHeight: "180px" }}>
                    <div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.5rem" }}>
                        <h3 style={{ fontSize: "1.2rem", color: "#fff" }}>{proj.name}</h3>
                        <span className={`badge ${proj.status === "ACTIVE" ? "badge-done" : "badge-todo"}`}>{proj.status}</span>
                      </div>
                      <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem", marginBottom: "1.5rem", lineBreak: "anywhere" }}>
                        {proj.description || "No project description provided."}
                      </p>
                    </div>

                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid var(--border-color)", paddingTop: "0.75rem" }}>
                      <span style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>
                        Tasks: <strong>{proj._count?.tasks || 0}</strong>
                      </span>

                      {user.role === "ADMIN" && (
                        <div style={{ display: "flex", gap: "0.5rem" }}>
                          <button onClick={() => openEditProject(proj)} style={{ background: "transparent", border: "none", cursor: "pointer", color: "var(--text-secondary)" }}>
                            <Edit2 style={{ width: "16px", height: "16px" }} />
                          </button>
                          <button onClick={() => handleDeleteProject(proj.id, proj.name)} style={{ background: "transparent", border: "none", cursor: "pointer", color: "#f87171" }}>
                            <Trash2 style={{ width: "16px", height: "16px" }} />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{
                textAlign: "center",
                padding: "4rem 2rem",
                background: "var(--bg-glass)",
                borderRadius: "var(--border-radius)",
                border: "1px solid var(--border-color)",
                color: "var(--text-muted)"
              }}>
                <Folder style={{ width: "48px", height: "48px", strokeWidth: 1, marginBottom: "1rem", color: "var(--accent-primary)" }} />
                <h3>No projects found</h3>
                <p style={{ marginTop: "0.5rem" }}>
                  {user.role === "ADMIN" ? "Create your first workspace project to begin assigning tasks." : "No projects have been configured yet by your Admin."}
                </p>
                {user.role === "ADMIN" && (
                  <button onClick={() => setShowProjectModal(true)} className="btn btn-primary" style={{ marginTop: "1rem" }}>
                    Create Project
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {/* 2C. TAB VIEW: DYNAMIC KANBAN BOARD */}
        {activeTab === "tasks" && (
          <div className="animate-slide-up">
            {/* Page Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
              <div>
                <h2 style={{ fontSize: "1.8rem", fontWeight: 700 }}>Task Kanban Board</h2>
                <p style={{ color: "var(--text-secondary)", fontSize: "0.95rem" }}>
                  Manage task workflows, priorities, and deadlines across your team.
                </p>
              </div>
              {user.role === "ADMIN" && (
                <button
                  onClick={() => {
                    if (projects.length === 0) {
                      showToast("You must create at least one Project first!", "error");
                      return;
                    }
                    setTaskFormId(null);
                    setTaskFormTitle("");
                    setTaskFormDesc("");
                    setTaskFormStatus("TODO");
                    setTaskFormPriority("MEDIUM");
                    setTaskFormDueDate("");
                    setTaskFormProject(projects[0]?.id || "");
                    setTaskFormAssignee("");
                    setShowTaskModal(true);
                  }}
                  className="btn btn-primary"
                >
                  <Plus style={{ width: "18px", height: "18px" }} /> Add Task
                </button>
              )}
            </div>

            {/* FILTER CONTROLS BAR */}
            <div className="glass-card" style={{ padding: "1rem", display: "flex", flexWrap: "wrap", gap: "1rem", alignItems: "center", marginBottom: "1.5rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "var(--text-secondary)", fontSize: "0.85rem", fontWeight: 600 }}>
                <Filter style={{ width: "16px", height: "16px" }} /> Filters
              </div>

              {/* Project Filter */}
              <select value={filterProject} onChange={(e) => setFilterProject(e.target.value)} className="input-field" style={{ width: "auto", minWidth: "150px", padding: "0.4rem 0.8rem", fontSize: "0.85rem" }}>
                <option value="">All Projects</option>
                {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>

              {/* Priority Filter */}
              <select value={filterPriority} onChange={(e) => setFilterPriority(e.target.value)} className="input-field" style={{ width: "auto", minWidth: "130px", padding: "0.4rem 0.8rem", fontSize: "0.85rem" }}>
                <option value="">All Priorities</option>
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
                <option value="URGENT">Urgent</option>
              </select>

              {/* Assignee Filter (Only visible to Admin since Member is auto-filtered to their tasks) */}
              {user.role === "ADMIN" && (
                <select value={filterAssignee} onChange={(e) => setFilterAssignee(e.target.value)} className="input-field" style={{ width: "auto", minWidth: "150px", padding: "0.4rem 0.8rem", fontSize: "0.85rem" }}>
                  <option value="">All Assignees</option>
                  {teamMembers.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
              )}

              {/* Overdue checkbox */}
              <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.85rem", color: "var(--text-secondary)", cursor: "pointer" }}>
                <input type="checkbox" checked={filterOverdue} onChange={(e) => setFilterOverdue(e.target.checked)} style={{ cursor: "pointer" }} />
                Show Overdue Only
              </label>

              {/* Reset filters button */}
              {(filterProject || filterPriority || filterAssignee || filterOverdue) && (
                <button
                  onClick={() => {
                    setFilterProject("");
                    setFilterPriority("");
                    setFilterAssignee("");
                    setFilterOverdue(false);
                    showToast("Filters cleared", "info");
                  }}
                  className="btn btn-secondary"
                  style={{ padding: "0.4rem 0.8rem", fontSize: "0.85rem" }}
                >
                  Clear Filters
                </button>
              )}
            </div>

            {/* THREE-COLUMN KANBAN BOARD SYSTEM */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "1.5rem", alignItems: "stretch" }}>
              {/* 1. TO DO COLUMN */}
              <div style={{ background: "rgba(0,0,0,0.15)", borderRadius: "var(--border-radius)", border: "1px solid var(--border-color)", padding: "1rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--border-color)", paddingBottom: "0.5rem", marginBottom: "0.25rem" }}>
                  <span style={{ fontWeight: 600, color: "#fff", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "var(--status-todo)" }} /> To Do
                  </span>
                  <span className="badge" style={{ background: "rgba(255,255,255,0.05)", color: "var(--text-secondary)" }}>
                    {tasks.filter((t) => t.status === "TODO").length}
                  </span>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "1rem", overflowY: "auto", maxHeight: "65vh" }}>
                  {tasks.filter((t) => t.status === "TODO").map((task) => (
                    <div key={task.id} className="glass-card animate-fade-in" style={{ padding: "1rem", position: "relative" }}>
                      {/* Priority Tag */}
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
                        <span className={`badge badge-${task.priority.toLowerCase()}`} style={{ fontSize: "0.6rem" }}>{task.priority}</span>
                        <span style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>{task.project.name}</span>
                      </div>

                      {/* Title */}
                      <h4 style={{ fontSize: "0.95rem", color: "#fff", marginBottom: "0.5rem" }}>{task.title}</h4>
                      
                      {/* Description */}
                      <p style={{ color: "var(--text-secondary)", fontSize: "0.8rem", marginBottom: "1rem", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                        {task.description || "No description provided."}
                      </p>

                      {/* Due date and Overdue banner */}
                      <div style={{ display: "flex", alignItems: "center", gap: "0.25rem", fontSize: "0.75rem", color: isOverdue(task.dueDate, task.status) ? "var(--status-overdue)" : "var(--text-secondary)", marginBottom: "0.75rem" }}>
                        <Calendar style={{ width: "12px", height: "12px" }} />
                        <span>{formatDate(task.dueDate)}</span>
                        {isOverdue(task.dueDate, task.status) && <span style={{ fontWeight: 700, fontSize: "0.65rem", marginLeft: "4px" }}>(OVERDUE)</span>}
                      </div>

                      {/* Assignee indicator, actions, and status quick-shift */}
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid rgba(255,255,255,0.03)", paddingTop: "0.75rem" }}>
                        <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                          Assigned: <strong style={{ color: "#a855f7" }}>{task.assignee ? task.assignee.name : "Unassigned"}</strong>
                        </span>

                        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                          {/* Quick transition to IN_PROGRESS */}
                          <button
                            onClick={() => handleTaskStatusChange(task, "IN_PROGRESS")}
                            className="btn btn-secondary"
                            style={{ padding: "0.25rem 0.5rem", fontSize: "0.7rem", color: "var(--status-progress)", borderColor: "rgba(245,158,11,0.2)" }}
                          >
                            Work
                          </button>

                          {user.role === "ADMIN" && (
                            <>
                              <button onClick={() => openEditTask(task)} style={{ background: "transparent", border: "none", cursor: "pointer", color: "var(--text-secondary)" }}>
                                <Edit2 style={{ width: "14px", height: "14px" }} />
                              </button>
                              <button onClick={() => handleDeleteTask(task.id, task.title)} style={{ background: "transparent", border: "none", cursor: "pointer", color: "#f87171" }}>
                                <Trash2 style={{ width: "14px", height: "14px" }} />
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 2. IN PROGRESS COLUMN */}
              <div style={{ background: "rgba(0,0,0,0.15)", borderRadius: "var(--border-radius)", border: "1px solid var(--border-color)", padding: "1rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--border-color)", paddingBottom: "0.5rem", marginBottom: "0.25rem" }}>
                  <span style={{ fontWeight: 600, color: "#fff", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "var(--status-progress)" }} /> In Progress
                  </span>
                  <span className="badge" style={{ background: "rgba(255,255,255,0.05)", color: "var(--text-secondary)" }}>
                    {tasks.filter((t) => t.status === "IN_PROGRESS").length}
                  </span>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "1rem", overflowY: "auto", maxHeight: "65vh" }}>
                  {tasks.filter((t) => t.status === "IN_PROGRESS").map((task) => (
                    <div key={task.id} className="glass-card animate-fade-in" style={{ padding: "1rem" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
                        <span className={`badge badge-${task.priority.toLowerCase()}`} style={{ fontSize: "0.6rem" }}>{task.priority}</span>
                        <span style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>{task.project.name}</span>
                      </div>

                      <h4 style={{ fontSize: "0.95rem", color: "#fff", marginBottom: "0.5rem" }}>{task.title}</h4>
                      
                      <p style={{ color: "var(--text-secondary)", fontSize: "0.8rem", marginBottom: "1rem", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                        {task.description || "No description provided."}
                      </p>

                      <div style={{ display: "flex", alignItems: "center", gap: "0.25rem", fontSize: "0.75rem", color: isOverdue(task.dueDate, task.status) ? "var(--status-overdue)" : "var(--text-secondary)", marginBottom: "0.75rem" }}>
                        <Calendar style={{ width: "12px", height: "12px" }} />
                        <span>{formatDate(task.dueDate)}</span>
                        {isOverdue(task.dueDate, task.status) && <span style={{ fontWeight: 700, fontSize: "0.65rem", marginLeft: "4px" }}>(OVERDUE)</span>}
                      </div>

                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid rgba(255,255,255,0.03)", paddingTop: "0.75rem" }}>
                        <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                          Assigned: <strong style={{ color: "#a855f7" }}>{task.assignee ? task.assignee.name : "Unassigned"}</strong>
                        </span>

                        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                          {/* Quick transition to DONE */}
                          <button
                            onClick={() => handleTaskStatusChange(task, "DONE")}
                            className="btn btn-secondary"
                            style={{ padding: "0.25rem 0.5rem", fontSize: "0.7rem", color: "var(--status-done)", borderColor: "rgba(16,185,129,0.2)" }}
                          >
                            Finish
                          </button>

                          {user.role === "ADMIN" && (
                            <>
                              <button onClick={() => openEditTask(task)} style={{ background: "transparent", border: "none", cursor: "pointer", color: "var(--text-secondary)" }}>
                                <Edit2 style={{ width: "14px", height: "14px" }} />
                              </button>
                              <button onClick={() => handleDeleteTask(task.id, task.title)} style={{ background: "transparent", border: "none", cursor: "pointer", color: "#f87171" }}>
                                <Trash2 style={{ width: "14px", height: "14px" }} />
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 3. DONE COLUMN */}
              <div style={{ background: "rgba(0,0,0,0.15)", borderRadius: "var(--border-radius)", border: "1px solid var(--border-color)", padding: "1rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--border-color)", paddingBottom: "0.5rem", marginBottom: "0.25rem" }}>
                  <span style={{ fontWeight: 600, color: "#fff", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "var(--status-done)" }} /> Done
                  </span>
                  <span className="badge" style={{ background: "rgba(255,255,255,0.05)", color: "var(--text-secondary)" }}>
                    {tasks.filter((t) => t.status === "DONE").length}
                  </span>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "1rem", overflowY: "auto", maxHeight: "65vh" }}>
                  {tasks.filter((t) => t.status === "DONE").map((task) => (
                    <div key={task.id} className="glass-card animate-fade-in" style={{ padding: "1rem", opacity: 0.75 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
                        <span className={`badge badge-${task.priority.toLowerCase()}`} style={{ fontSize: "0.6rem" }}>{task.priority}</span>
                        <span style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>{task.project.name}</span>
                      </div>

                      <h4 style={{ fontSize: "0.95rem", color: "#fff", marginBottom: "0.5rem", textDecoration: "line-through" }}>{task.title}</h4>
                      
                      <p style={{ color: "var(--text-secondary)", fontSize: "0.8rem", marginBottom: "1rem", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                        {task.description || "No description provided."}
                      </p>

                      <div style={{ display: "flex", alignItems: "center", gap: "0.25rem", fontSize: "0.75rem", color: "var(--text-secondary)", marginBottom: "0.75rem" }}>
                        <Calendar style={{ width: "12px", height: "12px" }} />
                        <span>Completed</span>
                      </div>

                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid rgba(255,255,255,0.03)", paddingTop: "0.75rem" }}>
                        <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                          Completed by: <strong style={{ color: "#10b981" }}>{task.assignee ? task.assignee.name : "Team"}</strong>
                        </span>

                        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                          {/* Quick transition back to TODO */}
                          <button
                            onClick={() => handleTaskStatusChange(task, "TODO")}
                            className="btn btn-secondary"
                            style={{ padding: "0.25rem 0.5rem", fontSize: "0.7rem" }}
                          >
                            Reopen
                          </button>

                          {user.role === "ADMIN" && (
                            <>
                              <button onClick={() => openEditTask(task)} style={{ background: "transparent", border: "none", cursor: "pointer", color: "var(--text-secondary)" }}>
                                <Edit2 style={{ width: "14px", height: "14px" }} />
                              </button>
                              <button onClick={() => handleDeleteTask(task.id, task.title)} style={{ background: "transparent", border: "none", cursor: "pointer", color: "#f87171" }}>
                                <Trash2 style={{ width: "14px", height: "14px" }} />
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Empty view state when no tasks exist */}
            {tasks.length === 0 && (
              <div style={{
                textAlign: "center",
                padding: "4rem 2rem",
                background: "var(--bg-glass)",
                borderRadius: "var(--border-radius)",
                border: "1px solid var(--border-color)",
                color: "var(--text-muted)",
                marginTop: "1.5rem"
              }}>
                <CheckSquare style={{ width: "48px", height: "48px", strokeWidth: 1, marginBottom: "1rem", color: "var(--accent-primary)" }} />
                <h3>No tasks match your filters</h3>
                <p style={{ marginTop: "0.5rem" }}>
                  Adjust your search parameters above or create a new task.
                </p>
              </div>
            )}
          </div>
        )}

        {/* 2D. TAB VIEW: TEAM & WORKSPACE MANAGEMENT */}
        {activeTab === "team" && (
          <div className="animate-slide-up">
            {/* Header info */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem" }}>
              <div>
                <h2 style={{ fontSize: "1.8rem", fontWeight: 700 }}>Workspace Team Settings</h2>
                <p style={{ color: "var(--text-secondary)", fontSize: "0.95rem" }}>
                  Manage team membership and role-based permissions in the <strong>{user.workspace.name}</strong>.
                </p>
              </div>
            </div>

            {/* Invite Info Card */}
            <div className="glass-card glass-card-glow" style={{ padding: "2rem", marginBottom: "2rem", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1.5rem" }}>
              <div>
                <h3 style={{ fontSize: "1.2rem", color: "#fff", marginBottom: "0.5rem" }}>Grow Your Collaborative Workspace</h3>
                <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", maxWidth: "550px" }}>
                  Share this unique invite code with new team members. When registering, they can enter this code to join your workspace automatically as standard members.
                </p>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "1rem", background: "rgba(0,0,0,0.3)", padding: "1rem 1.5rem", borderRadius: "12px", border: "1px solid var(--border-color)" }}>
                <div style={{ display: "flex", flexDirection: "column" }}>
                  <span style={{ fontSize: "0.7rem", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 600 }}>Workspace Invite Code</span>
                  <span style={{ fontSize: "1.5rem", fontWeight: 700, color: "#a855f7", fontFamily: "monospace", letterSpacing: "0.05em" }}>
                    {user.workspace.inviteCode}
                  </span>
                </div>
                <button
                  onClick={() => copyInviteCode(user.workspace.inviteCode)}
                  className="btn btn-primary"
                  style={{ padding: "0.6rem", borderRadius: "8px" }}
                >
                  {copiedInvite ? <Check style={{ width: "18px", height: "18px" }} /> : <Copy style={{ width: "18px", height: "18px" }} />}
                </button>
              </div>
            </div>

            {/* Team Members List */}
            <div className="glass-card">
              <h3 style={{ fontSize: "1.1rem", fontWeight: 600, marginBottom: "1rem" }}>Workspace Team Members</h3>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "0.9rem" }}>
                  <thead>
                    <tr style={{ borderBottom: "1px solid var(--border-color)", color: "var(--text-secondary)" }}>
                      <th style={{ padding: "1rem" }}>Member Name</th>
                      <th style={{ padding: "1rem" }}>Email Address</th>
                      <th style={{ padding: "1rem" }}>System Role</th>
                      <th style={{ padding: "1rem" }}>Date Joined</th>
                      {user.role === "ADMIN" && <th style={{ padding: "1rem", textAlign: "right" }}>Actions</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {teamMembers.map((member) => (
                      <tr key={member.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.03)", transition: "background 0.2s" }} className="table-row-hover">
                        <td style={{ padding: "1rem", fontWeight: 600, color: "#fff" }}>
                          {member.name} {member.id === user.id && <span style={{ color: "var(--accent-primary)", fontSize: "0.75rem" }}>(You)</span>}
                        </td>
                        <td style={{ padding: "1rem", color: "var(--text-secondary)" }}>{member.email}</td>
                        <td style={{ padding: "1rem" }}>
                          <span className={`badge ${member.role === "ADMIN" ? "badge-role" : "badge-todo"}`} style={{ fontSize: "0.65rem" }}>
                            {member.role}
                          </span>
                        </td>
                        <td style={{ padding: "1rem", color: "var(--text-muted)" }}>{formatDate(member.createdAt)}</td>
                        {user.role === "ADMIN" && (
                          <td style={{ padding: "1rem", textAlign: "right" }}>
                            {member.id !== user.id ? (
                              <div style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end" }}>
                                <button
                                  onClick={() => handleUpdateRole(member.id, member.role)}
                                  className="btn btn-secondary"
                                  style={{ padding: "0.25rem 0.5rem", fontSize: "0.75rem" }}
                                >
                                  Toggle Role
                                </button>
                                <button
                                  onClick={() => handleRemoveMember(member.id, member.name)}
                                  style={{ background: "transparent", border: "none", cursor: "pointer", color: "#f87171" }}
                                >
                                  <Trash2 style={{ width: "16px", height: "16px" }} />
                                </button>
                              </div>
                            ) : (
                              <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontStyle: "italic" }}>Workspace Owner</span>
                            )}
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <style jsx>{`
              .table-row-hover:hover {
                background: rgba(255, 255, 255, 0.01);
              }
            `}</style>
          </div>
        )}

      </main>

      {/* ========================================================================= */}
      {/* MODAL POPUPS SECTION */}
      {/* ========================================================================= */}

      {/* A. PROJECT MODAL (CREATE / EDIT) */}
      {showProjectModal && (
        <div className="modal-overlay">
          <div className="modal-content animate-scale-in">
            <div className="modal-header">
              <h3 style={{ color: "#fff" }}>{projectFormId ? "Edit Project Details" : "Create New Project"}</h3>
              <button onClick={() => setShowProjectModal(false)} style={{ background: "transparent", border: "none", cursor: "pointer", color: "var(--text-secondary)", fontSize: "1.2rem" }}>✕</button>
            </div>
            <form onSubmit={handleProjectSubmit}>
              <div className="modal-body">
                <div className="form-group">
                  <label>Project Name *</label>
                  <input
                    type="text"
                    placeholder="e.g., Q3 Platform Launch"
                    value={projectFormName}
                    onChange={(e) => setProjectFormName(e.target.value)}
                    className="input-field"
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Description</label>
                  <textarea
                    placeholder="Detail the goals and scope of this project..."
                    value={projectFormDesc}
                    onChange={(e) => setProjectFormDesc(e.target.value)}
                    className="input-field"
                    style={{ minHeight: "120px", resize: "vertical" }}
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" onClick={() => setShowProjectModal(false)} className="btn btn-secondary">Cancel</button>
                <button type="submit" className="btn btn-primary">{projectFormId ? "Save Changes" : "Create Project"}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* B. TASK MODAL (CREATE / EDIT) */}
      {showTaskModal && (
        <div className="modal-overlay">
          <div className="modal-content animate-scale-in">
            <div className="modal-header">
              <h3 style={{ color: "#fff" }}>{taskFormId ? "Edit Task" : "Assign New Task"}</h3>
              <button onClick={() => setShowTaskModal(false)} style={{ background: "transparent", border: "none", cursor: "pointer", color: "var(--text-secondary)", fontSize: "1.2rem" }}>✕</button>
            </div>
            <form onSubmit={handleTaskSubmit}>
              <div className="modal-body">
                {/* Task Title */}
                <div className="form-group">
                  <label>Task Title *</label>
                  <input
                    type="text"
                    placeholder="e.g., Integrate Auth Cookies"
                    value={taskFormTitle}
                    onChange={(e) => setTaskFormTitle(e.target.value)}
                    className="input-field"
                    required
                  />
                </div>

                {/* Description */}
                <div className="form-group">
                  <label>Description</label>
                  <textarea
                    placeholder="Provide details, deliverables, and notes..."
                    value={taskFormDesc}
                    onChange={(e) => setTaskFormDesc(e.target.value)}
                    className="input-field"
                    style={{ minHeight: "100px", resize: "vertical" }}
                  />
                </div>

                {/* Project Selection */}
                <div className="form-group">
                  <label>Associated Project *</label>
                  <select
                    value={taskFormProject}
                    onChange={(e) => setTaskFormProject(e.target.value)}
                    className="input-field"
                    required
                  >
                    <option value="" disabled>Select a Project</option>
                    {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>

                {/* Team Assignee Selection */}
                <div className="form-group">
                  <label>Assignee</label>
                  <select
                    value={taskFormAssignee}
                    onChange={(e) => setTaskFormAssignee(e.target.value)}
                    className="input-field"
                  >
                    <option value="">Unassigned</option>
                    {teamMembers.map((m) => <option key={m.id} value={m.id}>{m.name} ({m.role})</option>)}
                  </select>
                </div>

                {/* Priority Selection */}
                <div className="form-group">
                  <label>Task Priority</label>
                  <select
                    value={taskFormPriority}
                    onChange={(e) => setTaskFormPriority(e.target.value as any)}
                    className="input-field"
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                    <option value="URGENT">Urgent</option>
                  </select>
                </div>

                {/* Status Selection */}
                <div className="form-group">
                  <label>Status Column</label>
                  <select
                    value={taskFormStatus}
                    onChange={(e) => setTaskFormStatus(e.target.value as any)}
                    className="input-field"
                  >
                    <option value="TODO">To Do</option>
                    <option value="IN_PROGRESS">In Progress</option>
                    <option value="DONE">Done</option>
                  </select>
                </div>

                {/* Due Date */}
                <div className="form-group">
                  <label>Due Date *</label>
                  <input
                    type="date"
                    value={taskFormDueDate}
                    onChange={(e) => setTaskFormDueDate(e.target.value)}
                    className="input-field"
                    required
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" onClick={() => setShowTaskModal(false)} className="btn btn-secondary">Cancel</button>
                <button type="submit" className="btn btn-primary">{taskFormId ? "Save Changes" : "Assign Task"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
