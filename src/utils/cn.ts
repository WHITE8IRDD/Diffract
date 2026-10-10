import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Class-name helper used by every UI component (shadcn convention):
 * merge conditional class lists and de-duplicate Tailwind utilities.
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
