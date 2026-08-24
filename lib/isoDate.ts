export function sanitizeIsoDateInput(text: string) {
  const cleaned = text.replace(/[^\d-]/g, "");
  const parts = cleaned.split("-");
  if (parts[0]) parts[0] = parts[0].slice(0, 4);
  if (parts[1]) parts[1] = parts[1].slice(0, 2);
  if (parts[2]) parts[2] = parts[2].slice(0, 2);
  return parts.slice(0, 3).join("-").slice(0, 10);
}
