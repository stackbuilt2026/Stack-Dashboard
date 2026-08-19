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

## Still to come

- **Live Ressio sync + daily task-due emails.** Same plan as before: a
  scheduled Claude task reads your Ressio schedule once a day and writes
  the results straight into Supabase (using its REST API with a
  `service_role` key, which never appears anywhere in this website's
  files), then emails each employee their due tasks. I'll set this up
  once the site above is live — just say the word.
- **Changing someone's role** (e.g. promoting someone to Admin) isn't a
  button in the app yet — for now, do it directly in Supabase's **Table
  Editor → employees → role** column. A proper admin screen can be added
  later if it'd help.
