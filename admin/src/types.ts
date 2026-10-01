export type Role = 'owner' | 'moderator' | 'support' | 'editor';
export type Row = Record<string, unknown> & { id?: string; version?: string };
export type Resource =
  | 'users'
  | 'hosts'
  | 'properties'
  | 'bookings'
  | 'tickets'
  | 'reports'
  | 'faq_items'
  | 'guides'
  | 'guide_categories'
  | 'articles'
  | 'courses'
  | 'course_steps'
  | 'legal_documents'
  | 'errors'
  | 'limits'
  | 'cleanup'
  | 'audit'
  | 'members';
export type PageData = { rows: Row[]; total: number; page: number; pageSize: number };
export type Detail = { record: Row; related: Record<string, unknown> };
export type AdminSession = {
  user: { id: string; email: string };
  role: Role;
  mfaRequired: boolean;
};
export type Field = {
  key: string;
  label: string;
  type?: 'text' | 'textarea' | 'number' | 'checkbox' | 'select' | 'url';
  options?: string[];
  required?: boolean;
};
export type ResourceConfig = {
  title: string;
  singular: string;
  description: string;
  roles: Role[];
  columns: { key: string; label: string; type?: 'status' | 'date' | 'money' }[];
  statuses?: string[];
  fields?: Field[];
  group: 'operations' | 'content' | 'system';
};
