import { toast } from "sonner";
import { ApiError } from "./api";

const FRIENDLY: Record<string, string> = {
  LLM_QUOTA_EXCEEDED: "AI providers are busy right now. Please try again shortly.",
  LLM_UNAVAILABLE: "AI service is temporarily unavailable. Please try again.",
  RATE_LIMITED: "You've reached the hourly limit. Please slow down and try again later.",
  GENERATION_INVALID: "AI returned an invalid response. Please try again.",
  UNAUTHORIZED: "Session expired. Please log in again.",
};

function formatRetry(seconds: number | null | undefined): string {
  if (!seconds || seconds <= 0) return "";
  if (seconds < 60) return ` (retry in ${seconds}s)`;
  const minutes = Math.ceil(seconds / 60);
  return ` (retry in ~${minutes} min)`;
}

export interface ErrorToastOptions {
  fallback?: string;
  onRetry?: () => void;
}

export function showErrorToast(error: unknown, options: ErrorToastOptions = {}): void {
  const { fallback = "Something went wrong", onRetry } = options;

  if (error instanceof ApiError) {
    const friendly = FRIENDLY[error.code] ?? error.message ?? fallback;
    const message = friendly + formatRetry(error.retryAfter);
    toast.error(message, {
      duration: 8000,
      action: onRetry && error.retryAfter !== null
        ? { label: "Retry", onClick: onRetry }
        : undefined,
    });
    return;
  }

  toast.error(error instanceof Error ? error.message : fallback);
}
