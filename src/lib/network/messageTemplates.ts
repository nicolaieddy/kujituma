export const DEFAULT_TEMPLATES: Record<string, string> = {
  birthday: "Happy Birthday, {name}! Wishing you an amazing day! 🎂",
  follow_up: "Hi {name}, just checking in. Would love to catch up soon!",
  custom_event: "Hi {name}, thinking of you today. Hope all is well!",
};

export const EVENT_TYPE_LABELS: Record<string, string> = {
  birthday: "Birthday",
  follow_up: "Follow-up",
  custom_event: "Custom Event",
};

export function fillTemplate(template: string, contactName: string): string {
  const firstName = contactName.split(" ")[0];
  return template.replace(/\{name\}/g, firstName);
}

export function buildWhatsAppUrl(phone: string, message: string): string {
  const cleaned = phone.replace(/[^0-9]/g, "");
  return `https://wa.me/${cleaned}?text=${encodeURIComponent(message)}`;
}
