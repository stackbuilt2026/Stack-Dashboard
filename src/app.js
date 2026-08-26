import { h, render } from "preact";
import { useState, useEffect, useCallback, useRef } from "preact/hooks";
import htm from "htm";
import { supabase } from "./supabase.js";
import * as api from "./api.js";
import { templatesFor, SINGLE_FAMILY_MILESTONES, SINGLE_FAMILY_TASKS, APARTMENT_MILESTONES, APARTMENT_TASKS } from "./templates.js";
import { scoreProject, deriveMilestones, deriveTasks, STATUS_META, ROLE_LABELS, ROLE_COLORS, fmt, fmtShort } from "./health.js";
import { SELECTION_CATEGORIES, ALL_SELECTION_KEYS } from "./selections.js";

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
// Status is the one place colour survives the black-and-white scheme. It is
// never colour alone: each badge carries a written label AND a distinct dot
// shape (circle / diamond / square), so it still reads in greyscale, in
// print, and for colourblind viewers.
function StatusBadge({ status }) {
  const meta = STATUS_META[status];
  return html`<span class="badge" style=${{ background: meta.soft, color: meta.ink }}>
    <span class=${"dot " + meta.shape} style=${{ background: meta.color }}></span>${meta.label}
  </span>`;
}

// Roles are monochrome — the written label carries the identity, so no
// colour is needed and the chrome stays black and white.
function RoleTag({ role }) {
  return html`<span class="role-tag">
    <span class="role-dot"></span>${ROLE_LABELS[role] ?? role}
  </span>`;
}

function Nav({ employee }) {
  const route = useRoute();
  const tab = (path, label) =>
    html`<a href=${"#/" + path} class="nav-tab ${route === path || (path === "" && route === "") ? "active" : ""}">${label}</a>`;
  return html`
    <div class="topbar">
      <a class="brand-mark" href="#/">
        <img class="brand-logo" src="assets/logo-black.png" alt="Stack Built" />
        <span class="brand-divider"></span>
        <span class="brand-sub">Project Health</span>
      </a>
      <div class="nav-tabs">
        ${tab("", "Portfolio")}
        ${tab("checklist", "PM Checklist")}
        ${tab("templates", "Templates")}
        ${tab("schedule", "Schedule Source")}
        ${tab("selections", "Selections")}
        ${employee?.role === "ADMIN" && tab("team", "Team")}
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
      <div class="login-card">
        <img class="login-logo" src="assets/logo-black.png" alt="Stack Built" />
        <div class="login-title">Project Health Dashboard</div>
        <div class="login-sub">Sign in to see where every build stands.</div>
        <button class="btn-primary" onClick=${() => api.signInWithGoogle()}>Sign in with Google</button>
        <div class="login-note">Restricted to ${"@stack.llc"} accounts.</div>
      </div>
      <div class="login-footer">The Foundry · Logan, Utah</div>
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
        <div class="stat-tile"><div class="stat-num">${counts.green}</div><div class="stat-label"><span class="stat-swatch" style=${{ background: "var(--good)" }}></span>On Track</div></div>
        <div class="stat-tile"><div class="stat-num">${counts.yellow}</div><div class="stat-label"><span class="stat-swatch" style=${{ background: "var(--warning)" }}></span>At Risk</div></div>
        <div class="stat-tile"><div class="stat-num">${counts.red}</div><div class="stat-label"><span class="stat-swatch" style=${{ background: "var(--critical)" }}></span>Behind</div></div>
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
                <span style=${{ color: s.health.varianceDays > 0 ? "var(--critical-ink)" : "var(--good-ink)" }}>
                  ${s.health.varianceDays > 0 ? `${s.health.varianceDays}d behind` : `${Math.abs(s.health.varianceDays)}d ahead`}
                </span>
                <span class="ink-muted">${s.health.completionPct}% tasks complete</span>
              </div>
              <div class="progress-track"><div class="progress-fill" style=${{ width: s.health.completionPct + "%" }}></div></div>
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
          <div><div class="ink-muted metric-label">Schedule</div><div class="metric-value" style=${{ color: health.varianceDays > 0 ? "var(--critical-ink)" : "var(--good-ink)" }}>${health.varianceDays > 0 ? `${health.varianceDays}d behind` : `${Math.abs(health.varianceDays)}d ahead`}</div></div>
          <div><div class="ink-muted metric-label">Tasks Complete</div><div class="metric-value">${health.completionPct}%</div></div>
          <div><div class="ink-muted metric-label">Overdue</div><div class="metric-value" style=${{ color: health.overdue.length ? "var(--critical-ink)" : undefined }}>${health.overdue.length}</div></div>
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
                  ${m.status === "ACTIVE" && html` · <span style=${{ color: "var(--critical-ink)" }}>${(() => { const v = Math.round((Date.now() - new Date(m.planned_finish).getTime()) / 86400000); return v > 0 ? `${v}d behind` : `${Math.abs(v)}d ahead`; })()}</span>`}
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
                      ${t.status === "LOCKED" ? " · locked until milestone completes" : t.dueDate ? html` · due ${fmtShort(t.dueDate)}${t.status === "ACTIVE" && Date.now() > t.dueDate ? html` · <span style=${{ color: "var(--critical-ink)" }}>overdue</span>` : ""}` : ""}
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
                ${t.status === "ACTIVE" && t.dueDate && Date.now() > t.dueDate ? html` · <span style=${{ color: "var(--critical-ink)" }}>overdue</span>` : ""}
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

// ---------- Selections: pick a project ----------
function SelectionsIndex() {
  const [state, setState] = useState(null);
  useEffect(() => {
    Promise.all([api.getProjects(), api.getAllSelections()]).then(([rows, sels]) => setState({ rows, sels }));
  }, []);
  if (!state) return html`<div class="loading">Loading projects…</div>`;

  const filledByProject = {};
  for (const s of state.sels) {
    if ((s.value ?? "").trim()) (filledByProject[s.project_id] ??= new Set()).add(s.key);
  }
  const total = ALL_SELECTION_KEYS.length;

  return html`
    <div>
      <div class="ink-muted" style=${{ fontSize: "13px", marginBottom: "14px" }}>
        Every selection for a build, in one place. Pick a project to open its selection sheet.
      </div>
      <div class="card-grid">
        ${state.rows.map(({ project }) => {
          const done = filledByProject[project.id]?.size ?? 0;
          const pct = Math.round((done / total) * 100);
          return html`
            <a class="project-card" href=${"#/selections/" + project.id}>
              <div class="project-card-head">
                <div>
                  <div class="project-name">${project.name}</div>
                  <div class="ink-muted project-sub">${project.client} · ${project.type === "APARTMENT" ? "Apartment / Multifamily" : "Single-Family Home"}</div>
                </div>
                ${project.rendering_path && html`<span class="role-tag">Rendering</span>`}
              </div>
              <div class="project-metrics">
                <span>${done} of ${total} filled in</span>
                <span class="ink-muted">${pct}%</span>
              </div>
              <div class="progress-track"><div class="progress-fill" style=${{ width: pct + "%" }}></div></div>
            </a>
          `;
        })}
      </div>
    </div>
  `;
}

// ---------- Selections: one project's sheet ----------
function SelectionField({ projectId, item, initial, employee }) {
  const [value, setValue] = useState(initial?.value ?? "");
  const [state, setState] = useState("idle"); // idle | saving | saved | error
  const savedRef = useRef(initial?.value ?? "");

  // Saves when you click away rather than on every keystroke — one write
  // per edit instead of dozens, and nothing is lost because leaving the
  // field is what commits it.
  async function commit() {
    if (value === savedRef.current) return;
    setState("saving");
    try {
      await api.saveSelection(projectId, item.key, value, employee.id);
      savedRef.current = value;
      setState("saved");
      setTimeout(() => setState((s) => (s === "saved" ? "idle" : s)), 2200);
    } catch (e) {
      setState("error");
    }
  }

  return html`
    <div class="selection-field">
      <div class="selection-head">
        <label class="selection-label" for=${"sel-" + item.key}>${item.label}</label>
        <span class=${"save-flag " + state}>
          ${state === "saving" ? "Saving…" : state === "saved" ? "Saved" : state === "error" ? "Not saved — try again" : ""}
        </span>
      </div>
      <div class="selection-hint">${item.hint}</div>
      <textarea id=${"sel-" + item.key} class="selection-input" rows="3"
        placeholder="Type the selection here…"
        value=${value}
        onInput=${(e) => setValue(e.target.value)}
        onBlur=${commit}></textarea>
    </div>
  `;
}

function ProjectSelections({ id, employee }) {
  const [project, setProject] = useState(null);
  const [byKey, setByKey] = useState(null);
  const [renderUrl, setRenderUrl] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState(null);

  const load = useCallback(async () => {
    const detail = await api.getProjectDetail(id);
    setProject(detail.project);
    setByKey(await api.getProjectSelections(id));
    setRenderUrl(await api.getRenderingUrl(detail.project?.rendering_path));
  }, [id]);
  useEffect(() => { load(); }, [load]);

  if (!project || !byKey) return html`<div class="loading">Loading selections…</div>`;

  async function onPickFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadError(null);
    if (!file.type.startsWith("image/")) { setUploadError("That file isn't an image."); return; }
    if (file.size > 15 * 1024 * 1024) { setUploadError("That image is over 15 MB — please use a smaller file."); return; }
    setUploading(true);
    try {
      await api.uploadRendering(id, file);
      await load();
    } catch (err) {
      setUploadError(err.message || String(err));
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  async function onRemove() {
    setUploading(true);
    try { await api.removeRendering(id, project.rendering_path); await load(); }
    finally { setUploading(false); }
  }

  const filled = ALL_SELECTION_KEYS.filter((k) => (byKey[k]?.value ?? "").trim()).length;

  return html`
    <div>
      <a href="#/selections" class="back-link">← All projects</a>

      <div class="surface panel">
        <div class="detail-head">
          <div>
            <div class="project-name" style=${{ fontSize: "20px" }}>${project.name}</div>
            <div class="ink-muted">${project.client} · Selections</div>
          </div>
          <span class="role-tag">${filled} of ${ALL_SELECTION_KEYS.length} filled in</span>
        </div>
      </div>

      <div class="surface panel">
        <div class="panel-title">Final Rendering</div>
        ${renderUrl
          ? html`
            <div class="rendering-wrap">
              <img class="rendering-img" src=${renderUrl} alt=${"Final rendering — " + project.name} />
            </div>
            <div class="rendering-actions">
              <label class="pill-btn">
                Replace image
                <input type="file" accept="image/*" onChange=${onPickFile} style=${{ display: "none" }} />
              </label>
              <button class="pill-btn" onClick=${onRemove} disabled=${uploading}>Remove</button>
            </div>
          `
          : html`
            <label class="rendering-drop">
              <div class="rendering-drop-title">${uploading ? "Uploading…" : "Add the final rendering"}</div>
              <div class="ink-muted" style=${{ fontSize: "12.5px", marginTop: "4px" }}>
                JPG, PNG or WEBP · up to 15 MB
              </div>
              <input type="file" accept="image/*" onChange=${onPickFile} style=${{ display: "none" }} />
            </label>
          `}
        ${uploadError && html`<div class="alert-banner" style=${{ marginTop: "12px", marginBottom: 0 }}>${uploadError}</div>`}
      </div>

      ${SELECTION_CATEGORIES.map((group) => html`
        <div class="surface panel">
          <div class="panel-title">${group.group}</div>
          ${group.items.map((item) => html`
            <${SelectionField} projectId=${id} item=${item} initial=${byKey[item.key]} employee=${employee} />
          `)}
        </div>
      `)}

      <div class="ink-muted" style=${{ fontSize: "12px", padding: "0 2px 8px" }}>
        Selections save when you click out of a box — there's no separate save button. Everyone signed in sees the same sheet, so it's always the current answer.
      </div>
    </div>
  `;
}

// ---------- Team (admin only) ----------
function Team({ employee }) {
  const [rows, setRows] = useState(null);
  const [error, setError] = useState(null);
  const [savingId, setSavingId] = useState(null);
  const reload = useCallback(() => api.getEmployees().then(setRows), []);
  useEffect(() => { reload(); }, [reload]);
  if (!rows) return html`<div class="loading">Loading team…</div>`;

  async function changeRole(person, role) {
    setSavingId(person.id);
    setError(null);
    try {
      await api.updateEmployeeRole(person.id, role);
      await reload();
    } catch (e) {
      setError(e.message || String(e));
      await reload(); // snap the dropdown back to what the database actually says
    } finally {
      setSavingId(null);
    }
  }

  return html`
    <div>
      <div class="ink-muted" style=${{ fontSize: "13px", marginBottom: "12px" }}>
        Everyone who has signed in shows up here. Changing someone's role changes which tasks land under their name on the PM Checklist and in their daily email. New people start as Project Manager until you change them.
      </div>
      ${error && html`<div class="alert-banner">${error}</div>`}
      <div class="surface panel">
        <table class="schedule-table">
          <thead><tr><th>Name</th><th>Email</th><th>Role</th></tr></thead>
          <tbody>
            ${rows.map((p) => {
              const isSelf = p.id === employee.id;
              return html`
                <tr>
                  <td>${p.name}</td>
                  <td class="ink-muted">${p.email}</td>
                  <td>
                    ${isSelf
                      ? html`<span>${ROLE_LABELS[p.role] ?? p.role} <span class="ink-muted" style=${{ fontSize: "12px" }}>· that's you</span></span>`
                      : html`<select class="cell-input" disabled=${savingId === p.id}
                          value=${p.role} onChange=${(e) => changeRole(p, e.target.value)}>
                          ${Object.keys(ROLE_LABELS).map((r) => html`<option value=${r} selected=${r === p.role}>${ROLE_LABELS[r]}</option>`)}
                        </select>`}
                  </td>
                </tr>
              `;
            })}
          </tbody>
        </table>
      </div>
      <div class="ink-muted" style=${{ fontSize: "12px", padding: "0 2px" }}>
        You can't change your own role here — that's deliberate, so nobody can accidentally remove the last admin and lock everyone out. If you ever need to change your own, do it in Supabase under Table Editor → employees.
      </div>
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

  // Stamp the current page onto <body> so the stylesheet can pick which
  // Stack Built photo sits behind it (see "Page backdrops" in style.css).
  const pageKey = !session
    ? "login"
    : route.startsWith("project/")
      ? "project"
      : route.startsWith("selections")
        ? "selections"
        : ["checklist", "templates", "schedule", "team"].includes(route)
          ? route
          : "portfolio";
  useEffect(() => {
    document.body.dataset.page = pageKey;
  }, [pageKey]);

  if (session === undefined) return html`<div class="loading">Loading…</div>`;
  if (!session) return html`<${Login} />`;
  if (!employee) return html`<div class="loading">Setting up your account…</div>`;

  let body;
  if (route === "" ) body = html`<${Portfolio} />`;
  else if (route === "checklist") body = html`<${Checklist} employee=${employee} />`;
  else if (route === "templates") body = html`<${Templates} />`;
  else if (route === "schedule") body = html`<${ScheduleSource} />`;
  else if (route === "selections") body = html`<${SelectionsIndex} />`;
  else if (route.startsWith("selections/")) body = html`<${ProjectSelections} id=${route.slice("selections/".length)} employee=${employee} />`;
  else if (route === "team") body = employee.role === "ADMIN"
    ? html`<${Team} employee=${employee} />`
    : html`<div class="loading">The Team page is admin-only.</div>`;
  else if (route.startsWith("project/")) body = html`<${ProjectDetail} id=${route.slice("project/".length)} employee=${employee} />`;
  else body = html`<${Portfolio} />`;

  return html`
    <${Nav} employee=${employee} />
    <div class="page-body">${body}</div>
  `;
}

render(html`<${AppShell} />`, document.getElementById("root"));
