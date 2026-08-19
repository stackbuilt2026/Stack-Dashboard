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

// Called once right after sign-in. Creates the employee's own row if it's
// their first time (defaulting to PROJECT_MANAGER — an admin can change
// this later directly in Supabase's Table Editor), otherwise just reads
// their existing row. RLS only allows a user to insert/update their own
// row (matched by email), so this can't be used to create or edit anyone
// else's account.
export async function ensureEmployeeRecord(session) {
  const email = session.user.email;
  const { data: existing } = await supabase.from("employees").select("*").eq("email", email).maybeSingle();
  if (existing) return existing;

  const row = {
    id: "emp_" + crypto.randomUUID(),
    email,
    name: session.user.user_metadata?.full_name || session.user.user_metadata?.name || email,
    role: "PROJECT_MANAGER",
    created_at: new Date().toISOString(),
  };
  const { data, error } = await supabase.from("employees").insert(row).select().single();
  if (error) throw error;
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

export async function toggleTaskComplete(taskId, done, employeeId) {
  const { error } = await supabase
    .from("task_instances")
    .update({ completed_at: done ? new Date().toISOString() : null, completed_by_id: done ? employeeId : null })
    .eq("id", taskId);
  if (error) throw error;
}

export async function updateMilestone(milestoneId, fields) {
  const { error } = await supabase.from("project_milestones").update(fields).eq("id", milestoneId);
  if (error) throw error;
}
