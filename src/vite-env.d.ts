/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

/** Commit e data da publicação, gravados na hora do build (vite.config.ts). */
declare const __APP_BUILD__: { sha: string; builtAt: string };

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_ANON_KEY: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
