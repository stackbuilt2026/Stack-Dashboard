import { h, render } from "preact";
import { useState, useEffect, useCallback } from "preact/hooks";
import htm from "htm";
import { supabase } from "./supabase.js";
import * as api from "./api.js";
import { templatesFor, SINGLE_FAMILY_MILESTONES, SINGLE_FAMILY_TASKS, APARTMENT_MILESTONES, APARTMENT_TASKS } from "./templates.js";
import { scoreProject, deriveMilestones, deriveTasks, STATUS_META, ROLE_LABELS, ROLE_COLORS, fmt, fmtShort } from "./health.js";

const html = htm.bind(h);

// ---------- tiny hash router ----------
function useRoute() {
  const parse = () => window.location.hash.replace(/^#\/?/, "") || "";
  const [route, setRoute] = useState(parse());
  useEffect(() => {
    const onHash = () => setRoute(parse());
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);
  return route;
}
function navigate(path) {
  window.location.hash = "#/" + path;
}

// ---------- shared bits ----------
function StatusBadge({ status }) {
  const meta = STATUS_META[status];
  return html`<span class="badge" style=${{ background: meta.soft, color: meta.color }}>
    <span class="dot" style=${{ background: meta.color }}></span>${meta.label}
  </span>`;
}

function RoleTag({ role }) {
  return html`<span class="role-tag" style=${{ color: ROLE_COLORS[role] }}>
    <span class="role-dot" style=${{ background: ROLE_COLORS[role] }}></span>${ROLE_LABELS[role] ?? role}
  </span>`;
}

function Nav({ employee }) {
  const route = useRoute();
  const tab = (path, label) =>
    html`<a href=${"#/" + path} class="nav-tab ${route === path || (path === "" && route === "") ? "active" : ""}">${label}</a>`;
  return html`
    <div class="topbar">
      <div>
        <div class="brand">Stack Built</div>
        <div class="brand-sub">Project Health Dashboard</div>
      </div>
      <div class="nav-tabs">
        ${tab("", "Portfolio")}
        ${tab("checklist", "PM Checklist")}
        ${tab("templates", "Templates")}
        ${tab("schedule", "Schedule Source")}
      </div>
      <div class="who">
        <span>${employee?.name ?? ""}</span>
        <a href="#" onClick=${(e) => { e.preventDefault(); api.signOut(); }}>Sign out</a>
      </div>
    </div>
  `;
}

// ---------- Login ----------
function Login() {
  return html`
    <div class="login-wrap">
      <div class="surface login-card">
        <div class="brand">Stack Built</div>
        <div class="brand-sub">Project Health Dashboard</div>
        <button class="btn-primary" onClick=${() => api.signInWithGoogle()}>Sign in with Google</button>
        <div class="ink-muted" style=${{ fontSize: "12px", marginTop: "10px" }}>
          Only ${"@stack.llc"} accounts can sign in.
        </div>
      </div>
    </div>
  `;
}

// ---------- Portfolio ----------
function Portfolio() {
  const [rows, setRows] = useState(null);
  useEffect(() => { api.getProjects().then(setRows); }, []);
  if (!rows) return html`<div class="loading">Loading projects…</div>`;

  const scored = rows
    .map((r) => ({ ...r, health: scoreProject(r.milestones, r.tasks) }))
    .sort((a, b) => a.health.score - b.health.score);

  const counts = { green: 0, yellow: 0, red: 0 };
  scored.forEach((s) => counts[s.health.status]++);
  const totalOverdue = scored.reduce((sum, s) => sum + s.health.overdue.length, 0);

  return html`
    <div>
      <div class="stat-row">
        <div class="stat-tile"><div class="stat-num">${scored.length}</div><div class="stat-label">Active Projects</div></div>
        <div class="stat-tile"><div class="stat-num" style=${{ color: "var(--good)" }}>${counts.green}</div><div class="stat-label">On Track</div></div>
        <div class="stat-tile"><div class="stat-num" style=${{ color: "var(--warning)" }}>${counts.yellow}</div><div class="stat-label">At Risk</div></div>
        <div class="stat-tile"><div class="stat-num" style=${{ color: "var(--critical)" }}>${counts.red}</div><div class="stat-label">Behind</div></div>
      </div>
      ${totalOverdue > 0 && html`
        <div class="alert-banner">
          <strong>${totalOverdue}</strong> overdue task${totalOverdue === 1 ? "" : "s"} across the portfolio — check the PM Checklist before this week's review.
        </div>
      `}
      <div class="section-label">Projects · Worst health first</div>
      <div class="card-grid">
        ${scored.map((s) => {
          const current = s.health.current;
          const nextTask = s.health.derivedTasks.find((t) => t.status === "ACTIVE");
          return html`
            <a class="project-card" href=${"#/project/" + s.project.id}>
              <div class="project-card-head">
                <div>
                  <div class="project-name">${s.project.name}</div>
                  <div class="ink-muted project-sub">${s.project.client} · ${s.project.type === "APARTMENT" ? "Apartment / Multifamily" : "Single-Family Home"}</div>
                </div>
                <${StatusBadge} status=${s.health.status} />
              </div>
              <div class="project-current">Currently: <strong>${current?.name}</strong></div>
              <div class="project-metrics">
                <span style=${{ color: s.health.varianceDays > 0 ? "var(--critical)" : "var(--good)" }}>
                  ${s.health.varianceDays > 0 ? `${s.health.varianceDays}d behind` : `${Math.abs(s.health.varianceDays)}d ahead`}
                </span>
                <span class="ink-muted">${s.health.completionPct}% tasks complete</span>
              </div>
              <div class="progress-track"><div class="progress-fill" style=${{ width: s.health.completionPct + "%", background: STATUS_META[s.health.status].color }}></div></div>
              ${nextTask && html`
                <div class="project-next">
                  <span class="ink-muted">Next up: ${nextTask.title.length > 34 ? nextTask.title.slice(0, 34) + "…" : nextTask.title}</span>
                  <${RoleTag} role=${nextTask.role} />
                </div>
              `}
            </a>
          `;
        })}
      </div>
    </div>
  `;
}

// ---------- Project detail ----------
function ProjectDetail({ id, employee }) {
  const [data, setData] = useState(null);
  const reload = useCallback(() => api.getProjectDetail(id).then(setData), [id]);
  useEffect(() => { reload(); }, [reload]);
  if (!data || !data.project) return html`<div class="loading">Loading…</div>`;

  const health = scoreProject(data.milestones, data.tasks);
  const tasksByTrigger = {};
  health.derivedTasks.forEach((t) => {
    (tasksByTrigger[t.trigger_key] ??= []).push(t);
  });

  async function onToggle(task) {
    await api.toggleTaskComplete(task.id, task.status !== "DONE", employee.id);
    reload();
  }

  return html`
    <div>
      <a href="#/" class="back-link">← Back to portfolio</a>
      <div class="surface panel">
        <div class="detail-head">
          <div>
            <div class="project-name" style=${{ fontSize: "20px" }}>${data.project.name}</div>
            <div class="ink-muted">${data.project.client} · ${data.project.type === "APARTMENT" ? "Apartment / Multifamily" : "Single-Family Home"} · Started ${fmt(data.project.start_date)}</div>
          </div>
          <${StatusBadge} status=${health.status} />
        </div>
        <div class="metric-row">
          <div><div class="ink-muted metric-label">Health Score</div><div class="metric-value">${health.score}/100</div></div>
          <div><div class="ink-muted metric-label">Schedule</div><div class="metric-value" style=${{ color: health.varianceDays > 0 ? "var(--critical)" : "var(--good)" }}>${health.varianceDays > 0 ? `${health.varianceDays}d behind` : `${Math.abs(health.varianceDays)}d ahead`}</div></div>
          <div><div class="ink-muted metric-label">Tasks Complete</div><div class="metric-value">${health.completionPct}%</div></div>
          <div><div class="ink-muted metric-label">Overdue</div><div class="metric-value" style=${{ color: health.overdue.length ? "var(--critical)" : undefined }}>${health.overdue.length}</div></div>
        </div>
        ${health.deductions.length > 0 && html`
          <div class="why-box">
            <div class="why-title">Why this status:</div>
            <ul>${health.deductions.map((d) => html`<li>${d.label} (−${d.points} pts)</li>`)}</ul>
          </div>
        `}
      </div>

      <div class="surface panel">
        <div class="panel-title">Milestone Schedule</div>
        <div class="timeline">
          ${health.derivedMilestones.map((m) => html`
            <div class="timeline-row">
              <span class="timeline-dot" style=${{ background: m.status === "DONE" ? "var(--good)" : m.status === "ACTIVE" ? "var(--accent)" : "var(--gridline)" }}></span>
              <div>
                <div class="timeline-name">${m.name} ${!m.ressio_line_item_id && html`<span class="ink-muted" style=${{ fontWeight: 400, fontSize: "12px" }}> · not linked to Ressio yet</span>`} ${m.status === "ACTIVE" && html`<span class="in-progress-pill">In progress</span>`}</div>
                <div class="ink-muted timeline-dates">
                  ${m.status === "DONE" ? html`Planned ${fmtShort(m.planned_finish)} · Done ${fmtShort(m.actual_finish)}` : html`Planned finish ${fmtShort(m.planned_finish)}`}
                  ${m.status === "ACTIVE" && html` · <span style=${{ color: "var(--critical)" }}>${(() => { const v = Math.round((Date.now() - new Date(m.planned_finish).getTime()) / 86400000); return v > 0 ? `${v}d behind` : `${Math.abs(v)}d ahead`; })()}</span>`}
                </div>
              </div>
            </div>
          `)}
        </div>
      </div>

      <div class="surface panel">
        <div class="panel-title">Tasks by Triggering Milestone</div>
        ${health.derivedMilestones.map((m) => {
          const list = tasksByTrigger[m.key] ?? [];
          if (!list.length) return null;
          return html`
            <div class="task-group">
              <div class="task-group-label">Triggered by: ${m.name}</div>
              ${list.map((t) => html`
                <label class="task-row ${t.status === "ACTIVE" && t.dueDate && Date.now() > t.dueDate ? "overdue" : ""} ${t.status === "LOCKED" ? "locked" : ""}">
                  <input type="checkbox" checked=${t.status === "DONE"} disabled=${t.status === "LOCKED"} onChange=${() => onToggle(t)} />
                  <div class="task-body">
                    <div class="task-title">${t.title} ${t.critical && html`<span class="long-lead">long-lead</span>`}</div>
                    <div class="ink-muted task-meta">
                      ${t.deliverable}
                      ${t.status === "LOCKED" ? " · locked until milestone completes" : t.dueDate ? html` · due ${fmtShort(t.dueDate)}${t.status === "ACTIVE" && Date.now() > t.dueDate ? html` · <span style=${{ color: "var(--critical)" }}>overdue</span>` : ""}` : ""}
                    </div>
                  </div>
                  <${RoleTag} role=${t.role} />
                </label>
              `)}
            </div>
          `;
        })}
      </div>
    </div>
  `;
}

// ---------- Checklist ----------
function Checklist({ employee }) {
  const [state, setState] = useState(null);
  const [roleFilter, setRoleFilter] = useState("All");
  const [hideCompleted, setHideCompleted] = useState(true);
  const reload = useCallback(() => api.getAllTasksWithProjects().then(setState), []);
  useEffect(() => { reload(); }, [reload]);
  if (!state) return html`<div class="loading">Loading…</div>`;

  const rows = [];
  state.projects.forEach((p) => {
    const milestones = state.milestones.filter((m) => m.project_id === p.id);
    const tasks = state.tasks.filter((t) => t.project_id === p.id);
    const derivedM = deriveMilestones(milestones);
    const derivedT = deriveTasks(tasks, derivedM);
    derivedT.filter((t) => t.status !== "LOCKED").forEach((t) => rows.push({ ...t, project: p }));
  });

  const filtered = rows
    .filter((t) => roleFilter === "All" || t.role === roleFilter)
    .filter((t) => !hideCompleted || t.status !== "DONE")
    .sort((a, b) => (a.dueDate?.getTime() ?? Infinity) - (b.dueDate?.getTime() ?? Infinity));

  async function onToggle(t) {
    await api.toggleTaskComplete(t.id, t.status !== "DONE", employee.id);
    reload();
  }

  return html`
    <div>
      <div class="checklist-controls">
        <select onChange=${(e) => setRoleFilter(e.target.value)}>
          <option>All</option>
          ${Object.keys(ROLE_LABELS).map((r) => html`<option value=${r}>${ROLE_LABELS[r]}</option>`)}
        </select>
        <label class="hide-completed"><input type="checkbox" checked=${hideCompleted} onChange=${(e) => setHideCompleted(e.target.checked)} /> Hide completed</label>
        <span class="ink-muted" style=${{ marginLeft: "auto" }}>${filtered.length} tasks</span>
      </div>
      <div class="surface checklist-panel">
        ${filtered.map((t) => html`
          <label class="task-row ${t.status === "ACTIVE" && t.dueDate && Date.now() > t.dueDate ? "overdue" : ""}">
            <input type="checkbox" checked=${t.status === "DONE"} onChange=${() => onToggle(t)} />
            <div class="task-body">
              <div class="task-title">${t.title}</div>
              <div class="ink-muted task-meta">
                ${t.project.name} · ${t.deliverable} ${t.dueDate ? html`· due ${fmtShort(t.dueDate)}` : ""}
                ${t.status === "ACTIVE" && t.dueDate && Date.now() > t.dueDate ? html` · <span style=${{ color: "var(--critical)" }}>overdue</span>` : ""}
              </div>
            </div>
            <${RoleTag} role=${t.role} />
          </label>
        `)}
        ${filtered.length === 0 && html`<div class="empty">Nothing here.</div>`}
      </div>
    </div>
  `;
}

// ---------- Templates (read-only) ----------
function Templates() {
  const [type, setType] = useState("SINGLE_FAMILY");
  const t = templatesFor(type);
  return html`
    <div>
      <div class="checklist-controls">
        <button class="pill-btn ${type === "SINGLE_FAMILY" ? "active" : ""}" onClick=${() => setType("SINGLE_FAMILY")}>Single-Family</button>
        <button class="pill-btn ${type === "APARTMENT" ? "active" : ""}" onClick=${() => setType("APARTMENT")}>Apartment</button>
      </div>
      <div class="surface panel">
        <div class="panel-title">Milestones</div>
        ${t.milestones.map((m) => html`<div class="template-row"><strong>${m.name}</strong><span class="ink-muted"> · ${m.durationDays} day template duration</span></div>`)}
      </div>
      <div class="surface panel">
        <div class="panel-title">Tasks</div>
        ${t.tasks.map((task) => html`
          <div class="template-row" style=${{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px" }}>
            <div>
              <div>${task.title} ${task.critical && html`<span class="long-lead">long-lead</span>`}</div>
              <div class="ink-muted" style=${{ fontSize: "12px" }}>Triggered by "${task.triggerKey}" · ${task.leadTimeDays}d lead time</div>
            </div>
            <${RoleTag} role=${task.role} />
          </div>
        `)}
      </div>
      <div class="ink-muted" style=${{ fontSize: "12px", padding: "8px 2px" }}>
        This page is read-only — it shows what every NEW project is built from. To change it, edit <code>src/templates.js</code> in the code and re-deploy. Existing projects already have their own copy of these rows and aren't affected.
      </div>
    </div>
  `;
}

// ---------- Schedule Source ----------
function ScheduleSource() {
  const [rows, setRows] = useState(null);
  const reload = useCallback(() => api.getProjects().then(setRows), []);
  useEffect(() => { reload(); }, [reload]);
  if (!rows) return html`<div class="loading">Loading…</div>`;

  async function saveField(milestoneId, field, value) {
    await api.updateMilestone(milestoneId, { [field]: value });
    reload();
  }

  return html`
    <div>
      <div class="ink-muted" style=${{ fontSize: "13px", marginBottom: "12px" }}>
        Point a milestone at the Ressio schedule task whose completion represents it, or edit dates by hand for anything not yet in Ressio. The daily Ressio sync (once set up) fills these in automatically for linked milestones.
      </div>
      ${rows.map(({ project, milestones }) => html`
        <div class="surface panel">
          <div class="panel-title">${project.name}</div>
          <table class="schedule-table">
            <thead><tr><th>Milestone</th><th>Ressio Line Item ID</th><th>Planned Finish</th><th>Actual Finish</th></tr></thead>
            <tbody>
              ${[...milestones].sort((a, b) => a.order - b.order).map((m) => html`
                <tr>
                  <td>${m.name}</td>
                  <td><input class="cell-input" value=${m.ressio_line_item_id ?? ""} placeholder="not linked"
                    onChange=${(e) => saveField(m.id, "ressio_line_item_id", e.target.value || null)} /></td>
                  <td><input class="cell-input" type="date" value=${m.planned_finish ? m.planned_finish.slice(0, 10) : ""}
                    onChange=${(e) => saveField(m.id, "planned_finish", e.target.value)} /></td>
                  <td><input class="cell-input" type="date" value=${m.actual_finish ? m.actual_finish.slice(0, 10) : ""}
                    onChange=${(e) => saveField(m.id, "actual_finish", e.target.value || null)} /></td>
                </tr>
              `)}
            </tbody>
          </table>
        </div>
      `)}
    </div>
  `;
}

// ---------- App shell ----------
function AppShell() {
  const [session, setSession] = useState(undefined); // undefined = loading
  const [employee, setEmployee] = useState(null);
  const route = useRoute();

  useEffect(() => {
    api.getCurrentSession().then((s) => setSession(s ?? null));
    return api.onAuthChange((s) => setSession(s));
  }, []);

  useEffect(() => {
    if (session) {
      const email = session.user.email || "";
      if (!email.endsWith("@stack.llc")) {
        alert("Only @stack.llc accounts can use this dashboard.");
        api.signOut();
        return;
      }
      api.ensureEmployeeRecord(session).then(setEmployee);
    } else {
      setEmployee(null);
    }
  }, [session]);

  if (session === undefined) return html`<div class="loading">Loading…</div>`;
  if (!session) return html`<${Login} />`;
  if (!employee) return html`<div class="loading">Setting up your account…</div>`;

  let body;
  if (route === "" ) body = html`<${Portfolio} />`;
  else if (route === "checklist") body = html`<${Checklist} employee=${employee} />`;
  else if (route === "templates") body = html`<${Templates} />`;
  else if (route === "schedule") body = html`<${ScheduleSource} />`;
  else if (route.startsWith("project/")) body = html`<${ProjectDetail} id=${route.slice("project/".length)} employee=${employee} />`;
  else body = html`<${Portfolio} />`;

  return html`
    <${Nav} employee=${employee} />
    <div class="page-body">${body}</div>
  `;
}

render(html`<${AppShell} />`, document.getElementById("root"));
