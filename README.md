# 🌌 Aether Task | Premium Full-Stack Team Workspace

A modern, high-fidelity collaborative Team Task Manager designed with state-of-the-art aesthetics and robust engineering. Features real-time responsive analytics, role-based workspace partitioning, fluid three-column Kanban boards, and a dual-connector database subsystem that automatically adapts between development and production.

---

## ✨ Features & Architecture

### 1. 🔒 Premium User Authentication & Workspace Isolation
*   **HttpOnly Token Session Security**: Utilizes JWT authentication safely stored inside HTTP-Only, Secure, and SameSite-restricted cookies, keeping user sessions isolated and secure.
*   **Workspace Organization Isolation**: During registration, users can create a new workspace (becoming the **Admin**) or join an existing workspace by pasting an invite code (becoming a **Member**). Tasks, projects, and logs are strictly isolated within workspaces.

### 2. 🛡️ Strict Role-Based Access Control (RBAC)
*   **ADMIN Role**:
    *   Structural control: Create, edit, and delete Projects.
    *   Operational control: Create, update, assign, and delete Tasks.
    *   Team management: Manage user roles (Toggle role between ADMIN and MEMBER), view membership, and remove members.
*   **MEMBER Role**:
    *   Focused work: View only assigned projects and view only tasks *assigned to them*.
    *   Work tracking: Update the **status column** (To Do, In Progress, Done) for tasks assigned to them. Forbidden from editing details, creating projects, or managing other users.

### 3. 📊 High-End Live Dashboard & Interactive Analytics
*   **Glassmorphic Counters**: Displaying Total Scope, Tasks In Progress, Completed Tasks, and Overdue tasks.
*   **Animated Custom SVG Gauges**: High-fidelity circular radial progress rings showing overall team completion rates.
*   **Horizontal SVG Project Allocations**: Live gauges demonstrating task weight and completion rates across all projects in the workspace.
*   **Operational Logs Feed**: Real-time activity auditing logging events like task assignments, status columns updates, and member onboarding.

### 4. 📋 Dynamic Three-Column Kanban Board
*   **State-of-the-Art Workspace View**: Tasks grouped into **To Do**, **In Progress**, and **Done** columns.
*   **Real-Time Multi-Filters**: Filter workspace tasks on-the-fly by Associated Project, Task Priority (Low, Medium, High, Urgent), Assignee, and Overdue Status.
*   **Micro-Action Workflows**: Quick status column transitions ("Work" / "Finish" / "Reopen") that update dashboard metrics and database logs instantly.

---

## 🛠️ Technology Stack

*   **Framework**: Next.js 16 (App Router, TypeScript-safe dynamic endpoints).
*   **Database Client**: Prisma 7 (TypeScript-native, adapter-based pluggable interface).
*   **Database Engines**:
    *   **Local Dev**: SQLite / LibSQL (via `@prisma/adapter-libsql` - 100% pure JavaScript, zero native-compilation Python or node-gyp requirements).
    *   **Production**: PostgreSQL (via `@prisma/adapter-pg` - robust client pool optimization for serverless deployment).
*   **Styling**: Modern Vanilla CSS (Aether Dark design system using custom CSS properties, flexbox/grid layout structures, glassmorphic filters, and animated keyframes).
*   **Icons**: Lucide React.

---

## 📂 Codebase File Structure

```bash
├── prisma/
│   ├── schema.prisma       # Database relations (Workspace, User, Project, Task, ActivityLog)
│   └── dev.db              # Local SQLite Database file (created on migration)
├── src/
│   ├── app/
│   │   ├── api/            # Complete RESTful endpoints
│   │   │   ├── auth/       # signup, login, logout, me (HttpOnly Session)
│   │   │   ├── projects/   # Workspace project handlers
│   │   │   ├── tasks/      # Multi-filtered task handlers with RBAC
│   │   │   └── workspace/  # Workspace team member management
│   │   ├── globals.css     # Premium "Aether Dark" modern Vanilla CSS design system
│   │   ├── layout.tsx      # Root layout and global SEO metadata configuration
│   │   └── page.tsx        # High-performance client controller coordinating all views and modals
│   ├── lib/
│   │   ├── db.ts           # Dual-driver Prisma 7 connection manager (LibSQL ⇄ Postgres)
│   │   └── auth.ts         # JWT authentication, password hashing, and logs helpers
├── .env                    # Local environment settings
├── tsconfig.json           # TypeScript configuration
└── next.config.ts          # Next.js configurations
```

---

## 🚀 Local Installation & Setup

Follow these simple steps to run Aether Task locally on your desktop:

### 1. Clone the repository and navigate in:
```bash
git clone <your-repo-url>
cd <your-project-dir>
```

### 2. Install dependencies:
```bash
npm install
```

### 3. Create your local environment file:
Create a `.env` file in the root directory and add the local SQLite database URL:
```env
DATABASE_URL="file:./dev.db"
JWT_SECRET="generate_a_super_secure_secret_hash_value"
```

### 4. Create and run Prisma migrations to configure your database:
```bash
npx prisma migrate dev --name init
```
This automatically syncs your schema with the local SQLite file and generates the Prisma 7 client.

### 5. Launch the development server:
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser to experience the Aether Task workspace!

---

## 🌐 Railway Production Deployment (Mandatory)

Aether Task is fully optimized and configured for seamless single-service deployments on **Railway** using PostgreSQL:

### Step 1: Push Code to GitHub
Push your complete Next.js codebase to a GitHub repository.

### Step 2: Create a Railway Project
1.  Log in to your [Railway Dashboard](https://railway.app/).
2.  Click **New Project** ➜ Select **Deploy from GitHub repo** ➜ Choose your repository.

### Step 3: Add PostgreSQL Database
1.  Click **Add Service** in your Railway project canvas.
2.  Select **Database** ➜ Choose **Add PostgreSQL**. Railway will automatically provision a production database and create a `DATABASE_URL` environment variable.

### Step 4: Configure Production Environment Variables
In your Next.js application service settings on Railway, add the following variables under the **Variables** tab:
*   `DATABASE_URL`: `${{ Postgres.DATABASE_URL }}` (Railway automatically maps this if Postgres is in the same project).
*   `JWT_SECRET`: `your_high_entropy_jwt_secret_key` (Make it strong and unique).

### Step 5: Automatic Schema Sync
Prisma 7 will read the `DATABASE_URL` starting with `postgres://`, automatically engage `@prisma/adapter-pg` to build optimal Postgres connection pools, and sync all models automatically!
Railway will build the Next.js bundle and deploy a fully functional live URL.

---

## 🧪 Verification & API Checks

*   **API Security**: Fetching `/api/dashboard`, `/api/tasks`, or `/api/projects` without a valid cookie-based session will return `401 Unauthorized`.
*   **Role Security**:
    *   Attempting to DELETE a task as a Member returns `403 Forbidden`.
    *   Attempting to CREATE a project as a Member returns `403 Forbidden`.
    *   Attempting to change task titles or assignees as a Member returns `403 Forbidden`.
