const USER_ROLE = {
  ADMIN: 'ADMIN',
  EDITOR: 'EDITOR',
  VIEWER: 'VIEWER',
} as const;

type UserRole = (typeof USER_ROLE)[keyof typeof USER_ROLE];

const STAGE_TYPE = {
  ADMINISTRATIVA: 'ADMINISTRATIVA',
  REVISION: 'REVISIÓN',
  ACA: 'ACA',
  OPOSICION: 'OPOSICIÓN',
} as const;

type StageType = (typeof STAGE_TYPE)[keyof typeof STAGE_TYPE];

const CASE_STATUS = {
  ACTIVO: 'ACTIVO',
  CERRADO: 'CERRADO',
  CANCELADO: 'CANCELADO',
} as const;

type CaseStatus = (typeof CASE_STATUS)[keyof typeof CASE_STATUS];

const PERSON_ROLE = {
  TITULAR: 'TITULAR',
  COPROPIETARIO: 'COPROPIETARIO',
  REPRESENTANTE_LEGAL: 'REPRESENTANTE LEGAL',
} as const;

type PersonRole = (typeof PERSON_ROLE)[keyof typeof PERSON_ROLE];

interface PaginatedResponse<T> {
  items: T[];
  total: number;
  offset: number;
  limit: number;
}

interface User {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  is_active: boolean;
  created_at: string;
}

interface TokenResponse {
  access_token: string;
  token_type: string;
}

interface Person {
  id: string;
  first_name: string;
  last_name: string;
  dni: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  created_at: string;
  updated_at: string;
}

interface Location {
  id: string;
  lot: string;
  block: string;
  sector: string | null;
  area: number | null;
  observation: string | null;
}

interface StageStatus {
  id: string;
  name: string;
  stage_type: StageType;
  display_order: number;
  is_default: boolean;
  is_active: boolean;
}

interface Comment {
  id: string;
  text: string;
  author: User;
  created_at: string;
  updated_at: string;
}

interface CaseStage {
  id: string;
  stage_type: StageType;
  status: StageStatus;
  file_number: string | null;
  court: string | null;
  court_location: string | null;
  started_at: string;
  updated_at: string;
  comments: Comment[];
}

interface CasePerson {
  id: string;
  person: Person;
  role: PersonRole;
}

interface Case {
  id: string;
  code: string | null;
  file_number: string | null;
  court: string | null;
  court_location: string | null;
  case_status: CaseStatus;
  ordinal_text: string | null;
  location: Location;
  current_stage_type: StageType;
  persons: CasePerson[];
  stages: CaseStage[];
  created_at: string;
  updated_at: string;
}

interface DashboardStats {
  total_cases: number;
  cases_per_stage_type: Record<string, number>;
  cases_per_status: Record<string, number>;
  recent_cases: {
    id: string;
    code: string | null;
    current_stage_type: StageType;
    created_at: string;
  }[];
}

interface ReportTemplate {
  id: string;
  name: string;
  description: string | null;
  html_content: string;
  design_json: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export {
  type Case,
  type CasePerson,
  type CaseStage,
  CASE_STATUS,
  type CaseStatus,
  type Comment,
  type DashboardStats,
  type Location,
  type PaginatedResponse,
  type Person,
  PERSON_ROLE,
  type PersonRole,
  type ReportTemplate,
  STAGE_TYPE,
  type StageStatus,
  type StageType,
  type TokenResponse,
  type User,
  USER_ROLE,
  type UserRole,
};
