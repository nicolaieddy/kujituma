export const buildProfileSearchUrl = (platform: string, form: { full_name: string; influence_type: string; sector: string; notes: string }) => {
  const parts: string[] = [`site:${platform}`, `"${form.full_name.trim()}"`];
  if (form.influence_type && form.influence_type !== "Other") parts.push(form.influence_type);
  if (form.sector) parts.push(`"${form.sector}"`);
  if (form.notes) parts.push(form.notes.substring(0, 50).trim());
  return `https://www.google.com/search?q=${encodeURIComponent(parts.join(" "))}`;
};
