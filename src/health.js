// Pure, stateless derivation: given a project's raw milestones + tasks
// (just plannedFinish/actualFinish dates and completedAt checkmarks), work
// out what's locked/active/done, what's overdue, and the health score —
// fresh, every time, from the source dates. Nothing here is written back
// to the database; the database only ever stores the raw facts (a
// milestone's actual finish date, a task's completed-at timestamp). That
// avoids an entire category of bugs where a "cached status" column goes
// stale — there's simply no cached status to go stale.

export function addDays(date, n) {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

export function dayDiff(a, b) {
  return Math.round((a.getTime() - b.getTime()) / 86400000);
}

export function fmt(d) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export function fmtShort(d) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

// Returns milestones sorted by order, each with a derived `status`
// ("DONE" | "ACTIVE" | "UPCOMING") — DONE if actualFinish is set, the
// first non-done one is ACTIVE (that's "what we're currently working
// on"), everything after that is UPCOMING.
export function deriveMilestones(milestones) {
  const sorted = [...milestones].sort((a, b) => a.order - b.order);
  let activeAssigned = false;
  return sorted.map((m) => {
    let status;
    if (m.actual_finish) status = "DONE";
    else if (!activeAssigned) {
      status = "ACTIVE";
      activeAssigned = true;
    } else status = "UPCOMING";
    return { ...m, status };
  });
}

// Returns tasks with derived `status` ("LOCKED" | "ACTIVE" | "DONE") and
// `dueDate` — unlocked once the milestone that triggers them is DONE,
// due leadTimeDays after that milestone's actual finish.
export function deriveTasks(tasks, derivedMilestones) {
  const byKey = new Map(derivedMilestones.map((m) => [m.key, m]));
  return tasks.map((t) => {
    const trigger = byKey.get(t.trigger_key);
    const unlocked = trigger?.status === "DONE";
    const done = !!t.completed_at;
    const status = !unlocked ? "LOCKED" : done ? "DONE" : "ACTIVE";
    const dueDate = unlocked && trigger.actual_finish ? addDays(trigger.actual_finish, t.lead_time_days) : null;
    return { ...t, status, dueDate };
  });
}

// A finished project's score is frozen at what it was the day it finished.
// Without this, the live score keeps measuring against today — so a build
// that closed out on time would drift further "behind" every morning and
// eventually show red long after the keys were handed over.
export function scoreCompletedProject(project) {
  const status = project.final_status ?? "green";
  const meta = STATUS_META[status];
  return {
    score: project.final_score ?? 100,
    status,
    isComplete: true,
    completedAt: project.completed_at,
    label: meta.label,
    varianceDays: 0,
    completionPct: 100,
    overdue: [],
    overdueCritical: [],
    deductions: [],
    current: null,
    derivedMilestones: [],
    derivedTasks: [],
  };
}

export function scoreProject(milestones, tasks, now = new Date()) {
  const derivedMilestones = deriveMilestones(milestones);
  const derivedTasks = deriveTasks(tasks, derivedMilestones);

  const current = derivedMilestones.find((m) => m.status === "ACTIVE") ?? derivedMilestones[derivedMilestones.length - 1];
  const varianceDays = current ? dayDiff(now, new Date(current.planned_finish)) : 0;

  const activeTasks = derivedTasks.filter((t) => t.status !== "LOCKED");
  const overdue = activeTasks.filter((t) => t.status === "ACTIVE" && t.dueDate && now > t.dueDate);
  const overdueCritical = overdue.filter((t) => t.critical);

  const doneCount = activeTasks.filter((t) => t.status === "DONE").length;
  const completionPct = activeTasks.length ? Math.round((doneCount / activeTasks.length) * 100) : 100;

  let score = 100;
  const deductions = [];
  if (varianceDays > 0) {
    const d = Math.min(varianceDays * 5, 45);
    score -= d;
    deductions.push({ label: `${varianceDays} day${varianceDays === 1 ? "" : "s"} behind schedule`, points: d });
  }
  if (overdue.length) {
    const d = Math.min(overdue.length * 8, 40);
    score -= d;
    deductions.push({ label: `${overdue.length} overdue task${overdue.length === 1 ? "" : "s"}`, points: d });
  }
  if (overdueCritical.length) {
    score -= 10;
    deductions.push({ label: `${overdueCritical.length} overdue long-lead item${overdueCritical.length === 1 ? "" : "s"}`, points: 10 });
  }
  score = Math.max(0, Math.min(100, score));
  const status = score >= 80 ? "green" : score >= 55 ? "yellow" : "red";

  return {
    score, status, varianceDays, current, overdue, overdueCritical, completionPct, deductions,
    derivedMilestones, derivedTasks,
  };
}

// `color` is the vivid dot/fill; `ink` is the readable text step (the vivid
// amber is far too low-contrast to set text in). `shape` gives each status a
// second, non-colour channel — see StatusBadge in app.js.
export const STATUS_META = {
  green:  { label: "On Track", color: "var(--good)",     soft: "var(--good-soft)",     ink: "var(--good-ink)",     shape: "shape-green" },
  yellow: { label: "At Risk",  color: "var(--warning)",  soft: "var(--warning-soft)",  ink: "var(--warning-ink)",  shape: "shape-yellow" },
  red:    { label: "Behind",   color: "var(--critical)", soft: "var(--critical-soft)", ink: "var(--critical-ink)", shape: "shape-red" },
};

// Stack Built doesn't staff Purchasing or Superintendent — that work sits
// with whoever is PM on the job, so those roles were folded into
// PROJECT_MANAGER rather than left as empty buckets nobody fills.
export const ROLE_LABELS = {
  PROJECT_MANAGER: "Project Manager",
  DESIGN: "Design",
  LEASING: "Leasing",
  ADMIN: "Admin",
};

// Kept only because older code imports it; the role chips render
// monochrome, so these values aren't used for anything visible.
export const ROLE_COLORS = {
  PROJECT_MANAGER: "#2a78d6",
  DESIGN: "#4a3aa7",
  LEASING: "#e87ba4",
  ADMIN: "#52514e",
};
