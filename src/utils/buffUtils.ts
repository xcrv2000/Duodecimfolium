/**
 * Buff utility functions
 */

/**
 * Replace template placeholders in buff description
 * @param description Raw description with placeholders like {level}
 * @param level The buff level to replace {level} with
 * @returns Formatted description
 */
export function formatBuffDescription(description: string, level: number): string {
  return description.replace(/\{level\}/g, level.toString());
}