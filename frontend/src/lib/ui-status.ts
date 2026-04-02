export function getAsyncStatusClass(status: string): string {
  if (status === "completed") {
    return "border-emerald-300 text-emerald-700 dark:border-emerald-800 dark:text-emerald-300";
  }
  if (status === "failed") {
    return "border-red-300 text-red-700 dark:border-red-800 dark:text-red-300";
  }
  return "border-amber-300 text-amber-700 dark:border-amber-800 dark:text-amber-300";
}

export function getDifficultyClass(difficulty: string): string {
  if (difficulty === "hard") {
    return "border-red-300 text-red-700 dark:border-red-800 dark:text-red-300";
  }
  if (difficulty === "medium") {
    return "border-amber-300 text-amber-700 dark:border-amber-800 dark:text-amber-300";
  }
  return "border-emerald-300 text-emerald-700 dark:border-emerald-800 dark:text-emerald-300";
}

export function getGroundingClass(status: string): string {
  if (status === "well_grounded") {
    return "border-emerald-300 text-emerald-700 dark:border-emerald-800 dark:text-emerald-300";
  }
  if (status === "partially_grounded") {
    return "border-amber-300 text-amber-700 dark:border-amber-800 dark:text-amber-300";
  }
  return "border-red-300 text-red-700 dark:border-red-800 dark:text-red-300";
}
