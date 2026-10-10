/// <reference types="vite/client" />

/**
 * Ambient declarations for the Tauri bridge.
 *
 * `@tauri-apps/api` is imported lazily by `@/hooks/useTauri` so the same bundle
 * runs in a plain browser during UI development. These globals only exist when
 * the code is executing inside the Tauri WebView.
 */
interface Window {
  __TAURI_INTERNALS__?: unknown;
}
