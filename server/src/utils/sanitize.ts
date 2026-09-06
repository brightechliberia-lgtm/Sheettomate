export function stripHtml(value: string): string {
  return value.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
}

export const passwordSchemaMessage =
  'Password must be at least 8 characters and include a letter and a number';
