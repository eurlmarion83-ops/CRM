// Valeurs "enum" applicatives (SQLite ne supporte pas les enums natifs dans Prisma).
// Centralisées ici pour rester la seule source de vérité et faciliter une
// migration vers PostgreSQL (où ces unions pourraient devenir de vrais enums Prisma).

export const ROLES = ["PATIENT", "PRACTITIONER", "SECRETARY", "ADMIN"] as const;
export type Role = (typeof ROLES)[number];

export const MOTIF_TYPES = ["CABINET", "DOMICILE", "VIDEO"] as const;
export type MotifType = (typeof MOTIF_TYPES)[number];

export const AVAILABILITY_VISIBILITY = ["PUBLIC", "INTERNAL"] as const;
export type AvailabilityVisibility = (typeof AVAILABILITY_VISIBILITY)[number];

export const APPOINTMENT_STATUS = [
  "CONFIRMED",
  "CANCELLED",
  "COMPLETED",
  "NO_SHOW",
] as const;
export type AppointmentStatus = (typeof APPOINTMENT_STATUS)[number];

export const TELECONSULTATION_STATUS = [
  "SCHEDULED",
  "WAITING_ROOM",
  "ACTIVE",
  "ENDED",
] as const;
export type TeleconsultationStatus = (typeof TELECONSULTATION_STATUS)[number];

export const REMINDER_CHANNEL = ["SMS", "EMAIL"] as const;
export type ReminderChannel = (typeof REMINDER_CHANNEL)[number];

export const REMINDER_KIND = [
  "CONFIRMATION",
  "REMINDER_J1",
  "REMINDER_H1",
  "CANCELLATION",
] as const;
export type ReminderKind = (typeof REMINDER_KIND)[number];

export const DAYS_OF_WEEK = [
  "Dimanche",
  "Lundi",
  "Mardi",
  "Mercredi",
  "Jeudi",
  "Vendredi",
  "Samedi",
] as const;

export const ROLE_LABELS: Record<Role, string> = {
  PATIENT: "Patient",
  PRACTITIONER: "Praticien",
  SECRETARY: "Secrétaire",
  ADMIN: "Administrateur",
};

export const MOTIF_TYPE_LABELS: Record<MotifType, string> = {
  CABINET: "Cabinet",
  DOMICILE: "Visite à domicile",
  VIDEO: "Téléconsultation",
};
