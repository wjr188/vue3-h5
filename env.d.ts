/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_FAQ_URL: string
  readonly VITE_FAQ_TTL?: string // 秒
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
