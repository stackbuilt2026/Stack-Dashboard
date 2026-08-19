import { createClient } from "@supabase/supabase-js";

const cfg = window.STACK_DASHBOARD_CONFIG;
if (!cfg || !cfg.supabaseUrl || !cfg.supabaseAnonKey || cfg.supabaseAnonKey.includes("PASTE_YOUR")) {
  document.body.innerHTML =
    '<div style="font-family:system-ui;max-width:520px;margin:80px auto;padding:24px;border:1px solid #e2ddd4;border-radius:12px;">' +
    "<h2>Almost there</h2>" +
    "<p>This site needs its Supabase connection info before it will work. Open <code>config.js</code> and paste in your project's anon key (see the comment in that file for exactly where to find it).</p>" +
    "</div>";
  throw new Error("Missing Supabase config — see config.js");
}

export const supabase = createClient(cfg.supabaseUrl, cfg.supabaseAnonKey);
