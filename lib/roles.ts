// Roles from day one. Enforced server-side, not just hidden buttons.
export const ROLES = [
  "super_admin",
  "president",
  "committee_head",
  "event_manager",
  "communication_manager",
  "volunteer",
  "student",
] as const;

export type Role = (typeof ROLES)[number];

export const ROLE_LABEL_AR: Record<Role, string> = {
  super_admin: "مدير عام",
  president: "رئيس الاتحاد",
  committee_head: "رئيس لجنة",
  event_manager: "مسؤول فعاليات",
  communication_manager: "مسؤول تواصل",
  volunteer: "متطوع",
  student: "طالب",
};

// Who can open /communication (campaigns + audience lists)
export const COMMUNICATION_ROLES: Role[] = [
  "super_admin",
  "president",
  "communication_manager",
  "committee_head",
];

// Who can open /admin (faculties, departments, managers)
export const ADMIN_ROLES: Role[] = ["super_admin", "president"];

// Academic years (fixed list, student must choose one)
export const ACADEMIC_YEARS = [
  "الأولى",
  "الثانية",
  "الثالثة",
  "الرابعة",
  "الخامسة",
  "السادسة",
] as const;
