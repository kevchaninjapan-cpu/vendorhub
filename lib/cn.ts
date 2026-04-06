import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * cn()
 * - clsx: handles conditional logic (booleans, arrays, objects)
 * - tailwind-merge: resolves conflicting Tailwind classes
 *
 * Example:
 * cn("px-4", isActive && "bg-primary", className)
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}