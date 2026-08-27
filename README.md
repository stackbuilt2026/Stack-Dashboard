# Stack Built — Project Health Dashboard

A much simpler rebuild of the dashboard: a plain website (no server to
run, no terminal commands ever needed) that talks straight to your
Supabase database, hosted on Netlify — the same setup as the Gather app.
Same features as before: a Green/Yellow/Red health badge per home, tasks
that automatically unlock when a milestone finishes, the PM checklist,
and separate templates for single-family homes vs. apartments.

This file assumes no coding background and walks through every step.
It'll take about 20–30 minutes the first time, start to finish.

## What you'll need

- Your Supabase account (already set up — project ref `cmmncfcelwsiqbgnuvnh`)
- A free GitHub account (make one at [github.com](https://github.com) if you don't have one)
- A free Netlify account (you likely already have one from the Gather app)

## Step 1 — Set up the database (one time, ~2 minutes)

1. Go to [supabase.com](https://supabase.com) and open your project.
2. Click **SQL Editor** in the left sidebar.
3. Open `supabase-setup.sql` (included in this folder), select all, copy it.
4. Paste into the SQL Editor and click **Run**.

This creates all the tables, locks them down so only your team can access
them, and loads your 6 real active projects.

## Step 2 — Connect the website to your database (~2 minutes)

1. In Supabase, click the gear icon (**Settings**) in the bottom of the
   left sidebar, then **API**.
2. Under "Project API keys," copy the one labeled **anon** / **public**.
   (Not the "service_role" one — that one stays secret and isn't used here.)
3. Open `config.js` in this folder in any text editor (even Notepad).
4. Replace `PASTE_YOUR_ANON_PUBLIC_KEY_HERE` with the key you copied, save.

## Step 3 — Turn on "Sign in with Google" (~5 minutes)

1. Go to [Google Cloud Console](https://console.cloud.google.com/apis/credentials).
2. Click **Create Credentials → OAuth client ID**. Application type: **Web application**.
3. Under "Authorized redirect URIs," add exactly this:
   ```
   https://cmmncfcelwsiqbgnuvnh.supabase.co/auth/v1/callback
   ```
4. Click Create. Copy the **Client ID** and **Client Secret** it gives you.
5. Back in Supabase: **Authentication → Providers → Google**. Toggle it on,
   paste the Client ID and Client Secret, click **Save**.

That's the entire Google sign-in setup — Supabase handles the rest, so
there's no equivalent of the old app's separate auth code to maintain.

## Step 4 — Put the website on GitHub (no coding, ~5 minutes)

1. Go to [github.com/new](https://github.com/new), name the repository
   something like `stack-dashboard`, keep it **Private**, click **Create repository**.
2. On the new (empty) repo page, click **uploading an existing file**.
3. Drag every file and folder from this delivered folder into that page
   (everything except the `node_modules` folder, which shouldn't exist
   here anyway).
4. Scroll down, click **Commit changes**.

## Step 5 — Connect Netlify to that GitHub repo (~3 minutes)

1. Go to [app.netlify.com](https://app.netlify.com), click **Add new site
   → Import an existing project**.
2. Choose **GitHub**, authorize it if asked, pick the `stack-dashboard` repo.
3. Netlify will show build settings — leave everything as-is (this site
   needs no build step, that's already handled in `netlify.toml`) and
   click **Deploy**.
4. Wait about a minute. Netlify gives you a URL like
   `https://random-name-123.netlify.app` — click it to open the site
   (you can rename this to something nicer later in Netlify's site settings).

## Step 6 — Tell Supabase about your new website's address (~1 minute)

1. Copy your Netlify URL from the step above.
2. In Supabase: **Authentication → URL Configuration**.
3. Set **Site URL** to your Netlify URL.
4. Under **Redirect URLs**, add your Netlify URL too (e.g.
   `https://random-name-123.netlify.app/**`).
5. Save.

## Step 7 — Try it

Visit your Netlify URL, click **Sign in with Google**, sign in with your
`@stack.llc` account. You should land on the dashboard showing your 6
real projects.

## Making updates later

Whenever there's an update, I'll hand you a fresh copy of the changed
files. Open your GitHub repo, click **Add file → Upload files**, drag in
the new/changed files, and click **Commit changes**. Netlify notices the
change and redeploys automatically within a minute or two — no other
steps needed.

## What's different from the first version, and why

The first version was a full custom web application (Next.js) with its
own login system and its own server-side code, which meant real
programming concepts (databases, servers, deployment pipelines) at every
step. This version does the same job with far less moving pieces:

- **No server to deploy or keep running.** This is a "static" website —
  just files Netlify serves as-is. The website's own code, running in
  your browser, talks directly to Supabase.
- **No custom login system.** Supabase's built-in "Sign in with Google"
  replaces the custom code from before — same restriction to `@stack.llc`
  accounts, far less to maintain.
- **The database enforces the rules, not custom server code.** Row Level
  Security policies (set up by `supabase-setup.sql`) make sure only
  signed-in `@stack.llc` people can read or write anything, directly at
  the database level.
- Same event-driven task unlocking, same health scoring, same templates
  for single-family vs. apartment projects, same Schedule Source page for
  linking Ressio.

## Step 8 — Roles + live Ressio sync (the second SQL file)

This part came after the first launch. Paste
`step2-roles-and-sync-PRIVATE.sql` into the Supabase SQL Editor and click
**Run**, exactly like Step 1.

⚠️ That file contains a password, so unlike everything else here, **don't
upload it to GitHub** — run it, then delete it. (If it ends up there by
accident, just tell me and I'll issue a new one.)

What it turns on:

**A Team page.** A new tab appears in the top nav, visible only to
admins. It lists everyone who has signed in, with a dropdown to change
each person's role. That's what decides whose name a task shows up under
on the PM Checklist and in the daily email.

Two guardrails are built in, and they're enforced by the database itself
rather than just hidden in the page — so they hold even if someone
technical pokes at the site in their browser:

- Only admins can change roles. Nobody can promote themselves.
- Nobody can change their *own* role, admins included. That's what stops
  someone accidentally removing the last admin and locking everyone out.
  (If it ever needs doing, Supabase's **Table Editor → employees** can
  always override.)

The SQL also makes `danny@stack.llc` an admin. If you hadn't signed in
yet when you ran it, sign in once and then re-run just that one line.

**The Ressio sync plumbing.** Two database functions the daily sync job
calls. Worth knowing why they exist: the sync runs as a scheduled Claude
task, which isn't a signed-in employee, so it can't use the normal
`@stack.llc` rule. The usual shortcut is to hand such a job Supabase's
`service_role` key — but that key can read and write every table with no
restrictions. Instead the sync gets its own password that can do exactly
two things: read which milestones are linked to Ressio, and write
schedule dates back. If it ever leaked, that's the whole blast radius.

Once that's run, tell me and I'll create the scheduled task itself (it
lives in your Claude account, not in this website).

## The team, roles, and who owns what

**Roles.** Project Manager, Design, Leasing, Admin. Purchasing and
Superintendent were removed — Stack Built doesn't staff them, so that work
now belongs to whoever is PM on the job. Every task that used to be
Purchasing or Superintendent (12 of them) was moved to Project Manager,
in the templates and on the jobs already running.

**Several PMs, one per job.** The Team page has a "Project Managers by
Job" table. Whoever is set there gets that job's project-manager tasks on
their checklist and in their morning email. Design and Leasing tasks still
go to whoever holds that role, since there's one of each.

A job with nobody assigned shows up for *every* PM rather than
disappearing — unassigned work should be loud, not silent.

**Adding people without them signing in.** The Team page has an "Add
someone" form: name, sign-in email, reminders address (optional), role.
Their assignments work immediately, and when they eventually sign in with
Google they land on the record you already made rather than creating a
duplicate (matched on email).

**Who is allowed to sign in.** Anyone on an `@stack.llc` address, plus
anyone an admin has explicitly added to the team list. That second half
exists so crew without a company mailbox can still use the dashboard with
whatever Google account they already have. It is not "any Google account"
— someone has to be on the list first, and only an admin can add them.

The practical consequence: **new people must be added on the Team page
before they can sign in.** Previously any `@stack.llc` address let itself
in and became a Project Manager automatically. That auto-create is gone,
because with the list now acting as the gate, quietly adding whoever turns
up would defeat the point.

**Reminders to a different address.** Each person has an optional
"Reminders to" address. Leave it blank and their morning email goes to
their sign-in address; fill it in and it goes there instead. Nothing about
sign-in changes — it only redirects the mail.

**The top bar.** Portfolio, PM Checklist and Selections are the daily
pages. Schedule Source, Templates and Team are configuration — looked at
when something changes, not every day — so they live behind the **Setup**
menu. Team only appears there for admins.

**"My tasks" vs "Everyone."** The PM Checklist opens on your own work.
Admins open on the full list instead, since overseeing everyone is the
job. The rule deciding whose task is whose lives in two places — the
website and the database function that builds the emails — so if one
changes, change both, or the checklist and the morning email will
disagree.

## Adding and archiving jobs yourself

**Setup → Projects.** The top section lists jobs that exist in Ressio but
aren't on the dashboard yet. Pick whether each follows the single-family or
apartment process, click Add, and its milestones and tasks are built from
that template. Then link its milestones to the Ressio schedule on the
Schedule Source page.

The list is filtered to what's plausibly a real job — anything already
added, archived in Ressio, or still at Prospect stage is hidden, so you're
not scrolling past "Social Media" and "Safety Log" every time.

**Archiving** hides a finished or dead job from the dashboard. Nothing is
deleted — its tasks, selections and rendering all stay, and there's a
Restore button underneath.

One thing worth understanding: the dashboard **cannot call Ressio
directly.** It's a plain website talking to a database, and the Ressio
connection only exists inside an AI session. So the daily sync job writes
Ressio's project list into a table, and this page reads that. Worst case
the list is a day stale, which is fine for "which jobs could I add?" The
page shows when it last refreshed.

## Project Selections

A **Selections** tab holds every finish decision for a build in one place.
Pick a project and you get its selection sheet: 15 categories grouped into
Exterior, Kitchen & Bath, Flooring, and Interior Finishes, each an open box
you type into. Each one carries a prompt about what the trades actually
need — not just "Interior Paint" but a reminder to give walls, ceilings,
trim and doors, with brand, code and sheen.

Things worth knowing:

- **There's no save button.** A box saves when you click out of it, and a
  small "Saved" appears next to the label. That's one write per edit
  instead of one per keystroke, and nothing is lost because leaving the
  field is what commits it.
- **Everyone sees the same sheet.** It's one shared answer per project, not
  a personal copy, so whoever opens it gets the current decision.
- **The project list shows how far along each one is** (e.g. "4 of 15
  filled in"), so it's obvious at a glance which builds still need
  decisions.
- **Final rendering.** Each sheet has a spot to upload the rendering, and
  it displays right on the page. Re-uploading replaces the old one rather
  than piling up files.

The rendering images live in a **private** storage bucket, not a public
one. Public buckets are the easy default, but anyone who ever saw a URL
would keep access to it forever — and these are client-facing design
documents. Instead the app requests a short-lived link each time someone
with a valid `@stack.llc` login opens the page.

**Finished jobs move out of the way.** Once a project is complete (or
archived) it drops into a collapsed "Past projects" section at the bottom
of the Selections page, so the main list is only what's underway. Its
sheet still opens normally — selections are a reference document, and the
last thing you want is the finishes on a house you built last year being
hard to find. There's an Archive button on completed cards if you want one
gone from the Portfolio too, and a Restore next to anything archived.

**Adding or changing a category later** is a code change only — edit
`src/selections.js` and re-deploy. No database change is needed, because
selections are stored as one row per category rather than one column each.
The one rule: change a category's `label` freely, but don't change its
`key`, since that's what everything already typed is filed under.

## When a project finishes

A project is marked **Complete** automatically once both are true:

- every milestone has an actual finish date (i.e. every linked Ressio
  schedule item has hit 100%), and
- every task on it has been checked off.

At that moment its score is **frozen** at whatever it was that day, and the
card shows "Final score 62/100 · Completed Aug 26" instead of a live health
badge. Finished projects sort to the bottom of the Portfolio and drop out
of the Active count.

Freezing matters more than it sounds. The live score is measured against
*today* — so a finished project left running would drift further "behind"
every morning, and a build that closed out on time would slowly rot into a
red badge months after the keys were handed over. The frozen number is a
record of how the build actually finished.

**Correcting the finish date.** The date is derived from the last activity
in the app — the final milestone or the final task being ticked. That is
often a few days after the job really wrapped; nobody checks the last box
standing in the driveway. On a completed project an admin sees an "Actual
finish date" field in the completion banner. Changing it recalculates the
frozen score, and the correction sticks — the daily sync honours it instead
of stamping the derived guess back over it every morning.

Completion is a reflection of the data, never a one-way door: if someone
un-checks a task or clears a finish date, the stamp is removed and the
project goes back to being scored live. It's re-evaluated the instant
someone ticks the last box, and again on every daily sync.

## How the daily Ressio sync works

Every morning, a scheduled Claude task wakes up, reads each project's
current schedule from Ressio, and writes the dates back into the
dashboard. A few things worth understanding:

- **It only touches milestones you've linked** on the Schedule Source
  page. Link another one there and the next morning's sync picks it up
  automatically — nothing needs re-configuring.
- **The first sync after linking a milestone records Ressio's date as the
  baseline** — the "planned finish." After that, the baseline is frozen,
  and only a Ressio task reaching 100% moves the *actual* finish date.
  This is the bit that makes "15 days behind" mean anything: if
  re-scheduling in Ressio also moved the planned date, every project
  would always look perfectly on time.
- **It's once a day, not live to the second** — which matches the weekly
  team review and daily-digest rhythm anyway.

## Still to come

- **Daily task-due emails.** The same scheduled task can email each
  person their due, newly-unlocked, and overdue tasks each morning. Say
  the word and I'll add it.
- **Three projects have no schedule in Ressio yet** (Lot 17 Knoll
  Subdivision, Knoll Sub Phase 2, Elevate at 12th Phase 1). The sync will
  start tracking them the moment a schedule exists there and its
  milestones get linked on the Schedule Source page.
