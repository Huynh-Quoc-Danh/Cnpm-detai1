/// <reference types="vite/client" />
declare module "*.css";
declare module 'virtual:offline-sites' {
  import type { HeritageSite, LocalizedText } from './types';
  /** Seed sites with narration stripped (offline fallback). */
  export const sites: HeritageSite[];
  /** ~30 s preview text keyed by site id ("1") or exhibit id ("s1-e2"). */
  export const previews: Record<string, LocalizedText>;
}
