# Task Management Module — Google Stitch UI/UX Specification

> This document is a **screen-by-screen specification** for the Task Management module. It is written so you can copy each screen section directly into Google Stitch as a prompt. There are **two user roles** with completely different screens.

---

## Roles Overview

| Role | Label in UI | What they can do |
|---|---|---|
| **Admin / Operation** | Internal staff who manage the team | Create tasks, view ALL tasks, filter by date/employee/department/status/project, change status to any forward state (including "postponed"), view analytics |
| **Employee** | A team member assigned tasks | View ONLY their own non-completed tasks, change status one step at a time (pending → in progress → completed), filter by date ONLY |

---

## Status System

There are exactly **4 statuses**. They flow forward only — never backward.

| Status | Color Suggestion | Badge Style |
|---|---|---|
| `pending` | Amber / Yellow | Outline or soft fill |
| `in progress` | Blue | Solid fill |
| `postponed` | Orange / Red-Orange | Solid fill |
| `completed` | Green | Solid fill with checkmark icon |

**Transition rules:**
- **Admin/Operation**: Can jump to ANY forward status (e.g., pending → completed directly). Can set "postponed".
- **Employee**: Must go step-by-step: `pending` → `in progress` → `completed`. Cannot set "postponed". Cannot go backward.

---

# ADMIN / OPERATION SCREENS

---

## Screen 1: Admin — Task List (Main Screen)

**Stitch Prompt Context:** This is a desktop dashboard screen for an internal admin panel. It is the primary task management view where admins and operation users see all assigned tasks for a selected date. The design should be clean, professional, and data-dense — similar to a project management tool like Asana or Monday.com.

### Top Section — Filters Bar

A horizontal filter bar at the top of the page with these controls, left to right:

| # | Control | Type | Behavior | Default |
|---|---|---|---|---|
| 1 | **Date Picker** | Single-date picker (calendar icon) | Selects which day's tasks to show. A task appears if its time range overlaps with the selected day. | Today's date |
| 2 | **Employee Dropdown** | Searchable select dropdown | Shows list of all employees (name + department). Filters tasks to only that employee. | "All Employees" (no filter) |
| 3 | **Department Dropdown** | Select dropdown | Shows list of all departments. Filters tasks to all employees within that department. **Disabled/hidden when a specific employee is selected** (employee takes priority). | "All Departments" (no filter) |
| 4 | **Status Dropdown** | Select dropdown with 4 options | Options: `All`, `Pending`, `In Progress`, `Postponed`, `Completed`. Filters tasks by status. | "All" (no filter) |
| 5 | **Project Dropdown** | Searchable select dropdown | Shows list of all projects. Filters tasks assigned to that project. | "All Projects" (no filter) |

> [!IMPORTANT]
> **Filter priority rule:** If "Employee" is selected, the "Department" filter is overridden/disabled. They are mutually exclusive — employee takes priority.

### Main Section — Task Cards / Table

Display tasks as **cards in a list** or a **table**. Sorted by **deadline (end time) ascending** — tasks ending soonest appear first. This sort is hardcoded and cannot be changed by the user.

**Each task item displays these fields:**

| # | Field | Data Type | Display Notes |
|---|---|---|---|
| 1 | **Task Name** | Text (2–200 chars) | Primary text, bold/prominent |
| 2 | **Description** | Text (up to 2000 chars) | Secondary text, can be truncated with "show more". Optional — may be empty |
| 3 | **Status Badge** | Colored badge | One of: `pending`, `in progress`, `postponed`, `completed`. Use the color mapping above |
| 4 | **Assigned Employee Name** | Text | The employee's name (e.g., "Ahmed Hassan") |
| 5 | **Department Name** | Text | The department of the assigned employee (e.g., "Design") |
| 6 | **Project Name** | Text | The project this task belongs to. Optional — may show "No Project" or be empty |
| 7 | **Start Time** | DateTime | Formatted as readable date+time (e.g., "Apr 14, 2026 · 9:00 AM") |
| 8 | **End Time (Deadline)** | DateTime | Formatted as readable date+time. **Highlight if past due** (red text or icon if endTime < now and status ≠ completed) |
| 9 | **Link** | URL (clickable) | Optional — opens in new tab. Show as a small icon/button if present, hide if null |
| 10 | **Created By** | Text | The admin/operation user who created the task (e.g., "Admin User") |

### Task Card Interactions (Admin)

- **Click on status badge** → Opens a **status change dropdown/modal** with the allowed forward statuses only. Example: if task is "pending", show options: "in progress", "postponed", "completed". If task is "in progress", show: "postponed", "completed". If task is "completed", no options (final state — disable or hide the control).
- **No delete action** — tasks cannot be deleted.
- **No edit action** — task details cannot be edited after creation (only status can change).

### Pagination

- Bottom of the list: page controls (`< 1 2 3 >`)
- Default: 10 tasks per page
- Show: "Showing X of Y results"

### Empty State

If no tasks match the filters, show:
- Illustration or icon
- Text: "No tasks found for this date" or "No tasks match your filters"
- Suggestion: "Try selecting a different date or clearing filters"

---

## Screen 2: Admin — Create Task Modal / Page

**Stitch Prompt Context:** A modal dialog (or a dedicated page) that appears when the admin clicks a "Create Task" or "+ New Task" button. It supports creating **one or multiple tasks at once** (bulk creation). Only Admin and Operation users can access this.

### Create Task Form — Single Task Fields

| # | Field | Input Type | Required? | Validation | Placeholder |
|---|---|---|---|---|---|
| 1 | **Task Name** | Text input | ✅ Yes | 2–200 characters | "Enter task name" |
| 2 | **Description** | Textarea | ❌ No | Max 2000 characters | "Add a description (optional)" |
| 3 | **Start Time** | Date + Time picker | ✅ Yes | Must be a valid datetime | "Select start date & time" |
| 4 | **End Time** | Date + Time picker | ✅ Yes | Must be AFTER start time | "Select end date & time" |
| 5 | **Assigned Employee** | Searchable dropdown | ✅ Yes | Must select a valid employee | "Search and select employee" |
| 6 | **Project** | Searchable dropdown | ❌ No | Must be a valid project if selected | "Select project (optional)" |
| 7 | **Link** | URL text input | ❌ No | Must be a valid URL if provided | "https://..." |

### Bulk Creation UX

- The form should have an **"+ Add Another Task"** button that adds another set of the same fields below the current one.
- Each task row should have a **remove (✕)** button to delete that entry before submitting.
- A **"Create X Task(s)"** submit button at the bottom reflecting the count.
- All tasks are submitted together as one request.

### On Success

- Show success toast/notification: "3 task(s) created successfully"
- Close modal and refresh the task list
- New tasks will always start with status `pending`

### On Validation Error

- Inline field-level errors (red border + error text below the field)
- Example: "End time must be after start time", "Task name is required"

---

## Screen 3: Admin — Task Status Update (Inline or Modal)

**Stitch Prompt Context:** This is NOT a full screen. It is an inline interaction or a small modal that appears when an admin clicks on a task's status badge in the task list.

### Behavior

1. Admin clicks the **status badge** on a task card.
2. A dropdown or small popover appears showing **only valid forward transitions**:

| Current Status | Available Options |
|---|---|
| `pending` | `in progress`, `postponed`, `completed` |
| `in progress` | `postponed`, `completed` |
| `postponed` | `completed` |
| `completed` | *(none — disable click, this is the final state)* |

3. Admin selects a new status.
4. Confirmation toast: "Task status updated successfully"
5. The card updates in-place with the new badge color.

### Error States

- If somehow a backward transition is attempted: Error toast "Only forward transitions are allowed"
- If task is already in the selected status: Error toast "Task is already [status]"

---

## Screen 4: Admin — Analytics Dashboard

**Stitch Prompt Context:** A dedicated analytics page accessible from the sidebar/navigation. It shows task performance metrics and statistics. Only Admin and Operation users can access this page.

### Top Section — Filters

| # | Control | Type | Default |
|---|---|---|---|
| 1 | **Date Range Picker** | Start date + End date (two date inputs or a range picker) | Both default to today |
| 2 | **Employee Dropdown** | Searchable select | "All Employees" (no filter) |
| 3 | **Project Dropdown** | Searchable select | "All Projects" (no filter) |

> [!NOTE]
> This screen uses a **date range** (`startDate` + `endDate`), NOT a single date like the task list screen.

### Summary Cards Row

Display **5 metric cards** in a horizontal row:

| Card | Value | Icon Suggestion | Color |
|---|---|---|---|
| **Total Tasks** | Number (e.g., `10`) | Clipboard / List icon | Neutral / Gray |
| **Completed** | Number (e.g., `6`) | Checkmark icon | Green |
| **Pending** | Number (e.g., `2`) | Clock icon | Amber |
| **In Progress** | Number (e.g., `1`) | Arrow-right / Play icon | Blue |
| **Postponed** | Number (e.g., `1`) | Pause icon | Orange |

### Completion Rate

- A prominent **percentage display** (e.g., "60%") or a **circular/linear progress bar**.
- Label: "Completion Rate"
- Calculated as: `(completed / totalTasks) × 100`

### Tasks Breakdown Table (below the cards)

A table listing all the tasks that match the filter, showing:

| Column | Description |
|---|---|
| Task Name | The task name |
| Status | Status badge (colored) |
| Assigned To | Employee name |
| Department | Employee's department name |
| Project | Project name or "—" |

### Empty State

If no tasks exist for the selected filters:
- "No tasks found for this period"
- "Try adjusting your date range or filters"

---

# EMPLOYEE SCREENS

---

## Screen 5: Employee — My Tasks (Main Screen)

**Stitch Prompt Context:** This is a mobile-first (but also works on desktop) screen for an employee to see their own assigned tasks for a selected date. It is simpler than the admin view — no advanced filters, just a date picker and their task list. The design should feel clean, focused, and action-oriented.

### Top Section — Single Filter

| # | Control | Type | Default |
|---|---|---|---|
| 1 | **Date Picker** | Single-date picker (calendar icon) | Today's date |

> [!IMPORTANT]
> **Employees have NO other filters.** No employee, department, status, or project filters. The backend automatically filters to show only their own tasks, excluding completed ones.

### Task List

Display tasks as **cards in a vertical list**. Sorted by **deadline (end time) ascending** — most urgent first.

**Each task card displays:**

| # | Field | Display Notes |
|---|---|---|
| 1 | **Task Name** | Primary text, bold |
| 2 | **Description** | Secondary text, truncated. Optional — may be empty |
| 3 | **Status Badge** | One of: `pending`, `in progress`, `postponed`. **Never `completed`** (completed tasks are hidden from this view) |
| 4 | **Project Name** | If assigned. Show "No Project" or hide if null |
| 5 | **Start Time** | Formatted datetime |
| 6 | **End Time (Deadline)** | Formatted datetime. Highlight if overdue |
| 7 | **Link** | Clickable icon/button if present, hidden if null |

> [!IMPORTANT]
> **Fields NOT shown to employees:** Created By, Assigned Employee (it's always them), Department (it's always theirs). These are redundant for the employee view.

### Task Card Interactions (Employee)

- **Status action button on each card** — a prominent button that moves the task to the NEXT status only:

| Current Status | Button Label | Button Style |
|---|---|---|
| `pending` | "Start Task" or "Mark In Progress" | Primary blue button |
| `in progress` | "Mark Complete" or "Complete" | Green button |
| `postponed` | *No action button* — employee cannot change postponed status. Show a label: "Postponed by admin" | Disabled / info text |
| `completed` | *(card is never shown)* | — |

- Employee can **only go one step forward**. There is no dropdown — just a single action button.
- After clicking, confirm with a small dialog or just update immediately with a toast.

### Postponed Task Behavior

- Tasks set to `postponed` by an admin **still appear** in the employee's daily list every day until they are completed by an admin.
- The card should clearly indicate it's postponed (distinct color, "Postponed by admin" label).
- The employee **cannot** change a postponed task's status.

### Empty State

If no tasks for the selected date:
- Illustration or icon (e.g., relaxing character, empty clipboard)
- Text: "No tasks for today!" or "You're all clear for [date]"

### Pagination

- Same as admin: 10 per page, `< 1 2 3 >` controls
- Show: "Showing X of Y tasks"

---

## Screen 6: Employee — Status Update Confirmation

**Stitch Prompt Context:** This is a small interaction — either an inline update with a toast notification, or a quick confirmation dialog.

### Option A: Inline (Recommended)

1. Employee taps "Start Task" button on a pending task card.
2. Button shows a brief loading spinner.
3. Card status badge updates from `pending` → `in progress`.
4. Toast notification at top/bottom: "Task status updated successfully"

### Option B: Confirmation Dialog

1. Employee taps "Mark Complete" button.
2. Small dialog: "Mark this task as completed?" with two buttons: "Cancel" | "Confirm"
3. On confirm: status updates, toast appears.

### Error States

- "Employees can only transition to the next status" — if somehow a skip is attempted
- "Only admin or operation users can postpone tasks" — if employee tries to set postponed (should not be possible via UI, but handle edge case)

---

# SHARED COMPONENTS

---

## Navigation

| Item | Visible to Admin/Op | Visible to Employee |
|---|---|---|
| Tasks (list) | ✅ | ✅ |
| Create Task | ✅ (button on task list page) | ❌ |
| Analytics | ✅ (sidebar link) | ❌ |

---

## Task Status History (Optional Detail View)

If you want to show a task's change history (e.g., in an expandable section on the task card):

| Field | Description |
|---|---|
| Status | The status it changed to |
| Changed At | Datetime of the change |
| Changed By | Name of the user who made the change, prefixed with role (e.g., "Admin: Ahmed") |
| Description | Auto-generated text (e.g., "Task created", "Status changed to in progress") |

This is shown as a **vertical timeline** inside the task card when expanded.

---

## API Data Shape Reference

### Task Object (what the API returns for each task)

```
{
  id                → unique task ID
  name              → "Design landing page mockup"
  description       → "Create 3 mockup variations..." (or null)
  startTime         → "2026-04-14T09:00:00.000Z"
  endTime           → "2026-04-14T17:00:00.000Z"
  link              → "https://figma.com/..." (or null)
  status            → "pending" | "in progress" | "postponed" | "completed"
  assignedTo.id     → employee ID
  assignedTo.user   → { id, name }
  assignedTo.department → { id, name }
  project           → { id, name } (or null)
  createdBy         → { id, name }
  history[]         → array of { status, changedAt, changedBy, changedByName, description }
  createdAt         → timestamp
  updatedAt         → timestamp
}
```

### List Response Shape

```
{
  totalPages  → number
  page        → current page number
  limit       → items per page
  results     → number of items in current page
  data        → array of task objects
}
```

### Analytics Response Shape

```
{
  totalTasks     → number
  completed      → number
  pending        → number
  inProgress     → number
  postponed      → number
  completionRate → number (0–100)
  tasks          → array of task objects
}
```

---

## Summary of All Screens

| # | Screen | Role | Purpose |
|---|---|---|---|
| 1 | Task List + Filters | Admin/Op | View all tasks with date, employee, department, status, project filters |
| 2 | Create Task Modal | Admin/Op | Create one or multiple tasks (bulk) |
| 3 | Status Update (inline) | Admin/Op | Change status to any forward state via dropdown |
| 4 | Analytics Dashboard | Admin/Op | View performance metrics with date range, employee, project filters |
| 5 | My Tasks | Employee | View own non-completed tasks for a date, single action button per card |
| 6 | Status Confirmation | Employee | Confirm status change (one step forward only) |
