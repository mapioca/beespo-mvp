import { useSyncExternalStore } from "react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ToastType = "success" | "error" | "info" | "warning" | "loading";

export interface ToastOptions {
  description?: string;
  duration?: number;
  id?: string;
}

export interface ToastItem {
  id: string;
  type: ToastType;
  message: string;
  description?: string;
  duration: number; // 0 = no auto-dismiss
  createdAt: number;
  paused: boolean;
  remaining: number; // ms remaining when paused
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MAX_VISIBLE = 3;
const MAX_BUFFER = 5;

const DEFAULT_DURATIONS: Record<ToastType, number> = {
  success: 3000,
  error: 5000,
  info: 4000,
  warning: 5000,
  loading: 0,
};

// ---------------------------------------------------------------------------
// Sanitize HTML entities
// ---------------------------------------------------------------------------

let textarea: HTMLTextAreaElement | null = null;

function sanitize(text: string): string {
  if (typeof document === "undefined") return text;
  if (!textarea) textarea = document.createElement("textarea");
  textarea.innerHTML = text;
  return textarea.value;
}

// ---------------------------------------------------------------------------
// Store internals
// ---------------------------------------------------------------------------

let toasts: ToastItem[] = [];
let count = 0;
const listeners = new Set<() => void>();
const timers = new Map<string, ReturnType<typeof setTimeout>>();

function genId(): string {
  count = (count + 1) % Number.MAX_SAFE_INTEGER;
  return `toast-${count}-${Date.now()}`;
}

function emit() {
  listeners.forEach((l) => l());
}

function startTimer(item: ToastItem) {
  if (item.duration <= 0) return;
  clearTimer(item.id);
  const timeout = setTimeout(() => {
    removeToast(item.id);
  }, item.remaining || item.duration);
  timers.set(item.id, timeout);
}

function clearTimer(id: string) {
  const t = timers.get(id);
  if (t) {
    clearTimeout(t);
    timers.delete(id);
  }
}

// ---------------------------------------------------------------------------
// Public store mutations (used by pill component)
// ---------------------------------------------------------------------------

export function removeToast(id: string) {
  clearTimer(id);
  toasts = toasts.filter((t) => t.id !== id);
  emit();
}

export function pauseToast(id: string) {
  toasts = toasts.map((t) => {
    if (t.id !== id || t.paused || t.duration <= 0) return t;
    clearTimer(id);
    const elapsed = Date.now() - t.createdAt;
    return { ...t, paused: true, remaining: Math.max(0, t.duration - elapsed) };
  });
  emit();
}

export function resumeToast(id: string) {
  toasts = toasts.map((t) => {
    if (t.id !== id || !t.paused) return t;
    const updated = { ...t, paused: false, createdAt: Date.now() };
    startTimer(updated);
    return updated;
  });
  emit();
}

// ---------------------------------------------------------------------------
// Core add function
// ---------------------------------------------------------------------------

function addToast(
  type: ToastType,
  message: string,
  opts?: ToastOptions,
): string {
  const id = opts?.id || genId();
  const duration = opts?.duration ?? DEFAULT_DURATIONS[type];
  const sanitized = sanitize(message);
  const description = opts?.description ? sanitize(opts.description) : undefined;

  // If a toast with this id already exists, update it in-place
  const existingIdx = toasts.findIndex((t) => t.id === id);
  if (existingIdx !== -1) {
    clearTimer(id);
    const updated: ToastItem = {
      ...toasts[existingIdx],
      type,
      message: sanitized,
      description,
      duration,
      remaining: duration,
      createdAt: Date.now(),
      paused: false,
    };
    toasts = [...toasts];
    toasts[existingIdx] = updated;
    startTimer(updated);
    emit();
    return id;
  }

  const item: ToastItem = {
    id,
    type,
    message: sanitized,
    description,
    duration,
    createdAt: Date.now(),
    paused: false,
    remaining: duration,
  };

  toasts = [item, ...toasts].slice(0, MAX_BUFFER);
  startTimer(item);
  emit();
  return id;
}

// ---------------------------------------------------------------------------
// Public imperative API
// ---------------------------------------------------------------------------

function success(message: string, opts?: ToastOptions) {
  return addToast("success", message, opts);
}

function error(message: string, opts?: ToastOptions) {
  return addToast("error", message, opts);
}

function info(message: string, opts?: ToastOptions) {
  return addToast("info", message, opts);
}

function warning(message: string, opts?: ToastOptions) {
  return addToast("warning", message, opts);
}

function loading(message: string, opts?: ToastOptions) {
  return addToast("loading", message, opts);
}

function dismiss(id?: string) {
  if (id) {
    removeToast(id);
  } else {
    toasts.forEach((t) => clearTimer(t.id));
    toasts = [];
    emit();
  }
}

async function promise<T>(
  p: Promise<T>,
  msgs: {
    loading: string;
    success: string | ((data: T) => string);
    error: string | ((err: unknown) => string);
  },
  opts?: Omit<ToastOptions, "duration">,
): Promise<T> {
  const id = opts?.id || genId();
  addToast("loading", msgs.loading, { ...opts, id });

  try {
    const result = await p;
    const msg =
      typeof msgs.success === "function" ? msgs.success(result) : msgs.success;
    addToast("success", msg, { ...opts, id });
    return result;
  } catch (err) {
    const msg =
      typeof msgs.error === "function" ? msgs.error(err) : msgs.error;
    addToast("error", msg, { ...opts, id });
    throw err;
  }
}

// ---------------------------------------------------------------------------
// The toast object — callable as toast() shorthand + methods
// ---------------------------------------------------------------------------

type ToastFn = {
  (message: string, opts?: ToastOptions): string;
  success: typeof success;
  error: typeof error;
  info: typeof info;
  warning: typeof warning;
  loading: typeof loading;
  promise: typeof promise;
  dismiss: typeof dismiss;
};

const toast: ToastFn = Object.assign(
  (message: string, opts?: ToastOptions) => info(message, opts),
  { success, error, info, warning, loading, promise, dismiss },
);

export { toast };

// ---------------------------------------------------------------------------
// React hook (useSyncExternalStore)
// ---------------------------------------------------------------------------

function subscribe(callback: () => void) {
  listeners.add(callback);
  return () => {
    listeners.delete(callback);
  };
}

function getSnapshot(): ToastItem[] {
  return toasts;
}

function getServerSnapshot(): ToastItem[] {
  return [];
}

export function useToastStore(): ToastItem[] {
  const items = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  return items.slice(0, MAX_VISIBLE);
}
