import { supabase } from "./supabase.js";

export async function getCurrentSession() {
  const { data } = await supabase.auth.getSession();
  return data.session;
}

export function onAuthChange(cb) {
  const { data } = supabase.auth.onAuthStateChange((_event, session) => cb(session));
  return () => data.subscription.unsubscribe();
}

export async function signInWithGoogle() {
  await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: window.location.origin + window.location.pathname },
  });
}

export async function signOut() {
  await supabase.auth.signOut();
}

// Called once right after sign-in. Looks the person up by email and
// returns their record. It deliberately does NOT create one: the team list
// is now the gate on who may use the dashboard, so an address nobody has
// added is refused rather than quietly granted access. Admins add people
// on the Team page.
//
// Matching is on email, which is why someone added ahead of time keeps
// their role and job assignments when they first sign in.
export async function ensureEmployeeRecord(session) {
  const email = (session.user.email || "").toLowerCase();
  const { data, error } = await supabase.from("employees").select("*").ilike("email", email).maybeSingle();
  if (error) throw error;
  if (!data) throw new Error("not on the team list");
  return data;
}

export async function getProjects() {
  const { data: projects, error } = await supabase.from("projects").select("*").eq("archived", false);
  if (error) throw error;
  const { data: milestones } = await supabase.from("project_milestones").select("*");
  const { data: tasks } = await supabase.from("task_instances").select("*");
  return projects.map((p) => ({
    project: p,
    milestones: (milestones ?? []).filter((m) => m.project_id === p.id),
    tasks: (tasks ?? []).filter((t) => t.project_id === p.id),
  }));
}

export async function getProjectDetail(id) {
  const { data: project } = await supabase.from("projects").select("*").eq("id", id).single();
  const { data: milestones } = await supabase.from("project_milestones").select("*").eq("project_id", id).order("order");
  const { data: tasks } = await supabase.from("task_instances").select("*").eq("project_id", id);
  return { project, milestones: milestones ?? [], tasks: tasks ?? [] };
}

export async function getAllTasksWithProjects() {
  const { data: tasks } = await supabase.from("task_instances").select("*");
  const { data: milestones } = await supabase.from("project_milestones").select("*");
  const { data: projects } = await supabase.from("projects").select("*").eq("archived", false);
  return { tasks: tasks ?? [], milestones: milestones ?? [], projects: projects ?? [] };
}

export async function toggleTaskComplete(taskId, done, employeeId, projectId) {
  const { error } = await supabase
    .from("task_instances")
    .update({ completed_at: done ? new Date().toISOString() : null, completed_by_id: done ? employeeId : null })
    .eq("id", taskId);
  if (error) throw error;
  // Re-check completion straight away, so ticking the last box stamps the
  // project done (and un-ticking one un-stamps it) rather than waiting for
  // the next morning's sync.
  if (projectId) await refreshProjectCompletion(projectId);
}

// Marks a project complete — and freezes its score — once every milestone
// has an actual finish date and every task is checked off. Safe to call any
// time: if the project isn't finished (or stops being finished) it just
// clears the stamp.
export async function refreshProjectCompletion(projectId) {
  const { data, error } = await supabase.rpc("refresh_my_project_completion", { p_project_id: projectId });
  if (error) throw error;
  return data;
}

export async function getEmployees() {
  const { data, error } = await supabase.from("employees").select("*").order("name");
  if (error) throw error;
  return data ?? [];
}

// Adds someone who hasn't signed in yet. When they later sign in with
// Google, ensureEmployeeRecord matches on email and they land on THIS row
// — keeping the role and any job assignments already set for them.
export async function addEmployee({ name, email, role, notifyEmail }) {
  const { error } = await supabase.from("employees").insert({
    id: "emp_" + crypto.randomUUID(),
    name: name.trim(),
    email: email.trim().toLowerCase(),
    notify_email: notifyEmail?.trim() ? notifyEmail.trim().toLowerCase() : null,
    role,
    created_at: new Date().toISOString(),
  });
  if (error) throw error;
}

// Where this person's reminders go, when that differs from the address
// that identifies them. Blank means "same as their main address".
export async function setNotifyEmail(employeeId, notifyEmail) {
  const { error } = await supabase.from("employees")
    .update({ notify_email: notifyEmail?.trim() ? notifyEmail.trim().toLowerCase() : null })
    .eq("id", employeeId);
  if (error) throw error;
}

export async function removeEmployee(employeeId) {
  const { error } = await supabase.from("employees").delete().eq("id", employeeId);
  if (error) throw error;
}

export async function setProjectManager(projectId, employeeId) {
  const { error } = await supabase
    .from("projects").update({ project_manager_id: employeeId || null }).eq("id", projectId);
  if (error) throw error;
}

// Only succeeds for an admin changing someone else's role — enforced by
// the database itself, not just by hiding the dropdown, so it holds even
// if someone pokes at the site's code in their browser.
export async function updateEmployeeRole(employeeId, role) {
  const { error } = await supabase.from("employees").update({ role }).eq("id", employeeId);
  if (error) throw error;
}

export async function updateMilestone(milestoneId, fields) {
  const { error } = await supabase.from("project_milestones").update(fields).eq("id", milestoneId);
  if (error) throw error;
}

// ---------- Project selections ----------

export async function getAllSelections() {
  const { data, error } = await supabase.from("project_selections").select("project_id, key, value");
  if (error) throw error;
  return data ?? [];
}

export async function getProjectSelections(projectId) {
  const { data, error } = await supabase.from("project_selections").select("*").eq("project_id", projectId);
  if (error) throw error;
  const byKey = {};
  for (const row of data ?? []) byKey[row.key] = row;
  return byKey;
}

// One row per (project, category), created on first save. The unique
// constraint on (project_id, key) is what makes upsert safe here — two
// people saving the same field can't produce duplicate rows.
export async function saveSelection(projectId, key, value, employeeId) {
  const { error } = await supabase.from("project_selections").upsert(
    {
      id: "sel_" + projectId + "_" + key,
      project_id: projectId,
      key,
      value,
      updated_at: new Date().toISOString(),
      updated_by_id: employeeId,
    },
    { onConflict: "project_id,key" }
  );
  if (error) throw error;
}

// ---------- Rendering image ----------

export async function uploadRendering(projectId, file) {
  // Keyed by project id, so re-uploading replaces the old rendering rather
  // than piling up orphaned files in the bucket.
  const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
  const path = `${projectId}/rendering.${ext}`;
  const { error } = await supabase.storage
    .from("renderings")
    .upload(path, file, { upsert: true, contentType: file.type });
  if (error) throw error;

  const { error: e2 } = await supabase.from("projects").update({ rendering_path: path }).eq("id", projectId);
  if (e2) throw e2;
  return path;
}

// The bucket is private, so the image is fetched through a short-lived
// signed link rather than a permanent public URL.
export async function getRenderingUrl(path) {
  if (!path) return null;
  const { data, error } = await supabase.storage.from("renderings").createSignedUrl(path, 3600);
  if (error) return null;
  return data.signedUrl;
}

export async function removeRendering(projectId, path) {
  if (path) await supabase.storage.from("renderings").remove([path]);
  const { error } = await supabase.from("projects").update({ rendering_path: null }).eq("id", projectId);
  if (error) throw error;
}
