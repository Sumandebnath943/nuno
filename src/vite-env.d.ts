/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Optional TURN relay for players behind strict networks (mobile data): comma-separated turn: URLs. */
  readonly VITE_TURN_URLS?: string;
  readonly VITE_TURN_USERNAME?: string;
  readonly VITE_TURN_CREDENTIAL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
