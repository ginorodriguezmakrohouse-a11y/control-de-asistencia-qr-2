import type { Employee, AttendanceRecord, SystemConfig, WorkSchedule } from '../types/attendance';

// ---- snake_case (Supabase) <-> camelCase (TypeScript) mappers ----

const DEFAULT_SCHEDULE: WorkSchedule = {
  entryTime: '08:00',
  lunchStartTime: '13:00',
  lunchEndTime: '14:00',
  exitTime: '17:00',
  toleranceMinutes: 15,
  lunchDurationMinutes: 60,
};

function parseSchedule(raw: any): WorkSchedule {
  if (!raw) return { ...DEFAULT_SCHEDULE };
  let obj = raw;
  if (typeof raw === 'string') {
    try { obj = JSON.parse(raw); } catch { return { ...DEFAULT_SCHEDULE }; }
  }
  // Accept both camelCase and snake_case stored JSON
  return {
    entryTime: obj.entry_time ?? obj.entryTime ?? DEFAULT_SCHEDULE.entryTime,
    lunchStartTime: obj.lunch_start_time ?? obj.lunchStartTime ?? DEFAULT_SCHEDULE.lunchStartTime,
    lunchEndTime: obj.lunch_end_time ?? obj.lunchEndTime ?? DEFAULT_SCHEDULE.lunchEndTime,
    exitTime: obj.exit_time ?? obj.exitTime ?? DEFAULT_SCHEDULE.exitTime,
    toleranceMinutes: obj.tolerance_minutes ?? obj.toleranceMinutes ?? DEFAULT_SCHEDULE.toleranceMinutes,
    lunchDurationMinutes: obj.lunch_duration_minutes ?? obj.lunchDurationMinutes ?? DEFAULT_SCHEDULE.lunchDurationMinutes,
  };
}

export function employeeFromDb(row: any): Employee {
  return {
    id: row.id,
    qrPayload: row.qr_payload ?? '',
    documentId: row.document_id ?? '',
    firstName: row.first_name ?? '',
    lastName: row.last_name ?? '',
    email: row.email ?? '',
    phone: row.phone ?? '',
    department: row.department ?? '',
    position: row.position ?? '',
    avatarUrl: row.avatar_url ?? '',
    active: row.active ?? true,
    schedule: parseSchedule(row.schedule),
    createdAt: row.created_at ?? new Date().toISOString(),
  };
}

export function employeeToDb(emp: Employee): any {
  return {
    id: emp.id,
    qr_payload: emp.qrPayload,
    document_id: emp.documentId,
    first_name: emp.firstName,
    last_name: emp.lastName,
    email: emp.email,
    phone: emp.phone,
    department: emp.department,
    position: emp.position,
    avatar_url: emp.avatarUrl,
    active: emp.active,
    schedule: emp.schedule,
  };
}

export function recordFromDb(row: any): AttendanceRecord {
  return {
    id: row.id,
    employeeId: row.employee_id,
    employeeName: row.employee_name,
    employeeDocument: row.employee_document,
    department: row.department ?? '',
    avatarUrl: row.avatar_url ?? '',
    type: row.type,
    timestamp: row.timestamp,
    date: row.date,
    time: row.time,
    isLate: row.is_late ?? false,
    delayMinutes: row.delay_minutes ?? 0,
    terminalName: row.terminal_name ?? '',
    notes: row.notes ?? undefined,
  };
}

export function recordToDb(rec: AttendanceRecord): any {
  return {
    id: rec.id,
    employee_id: rec.employeeId,
    employee_name: rec.employeeName,
    employee_document: rec.employeeDocument,
    department: rec.department,
    avatar_url: rec.avatarUrl,
    type: rec.type,
    timestamp: rec.timestamp,
    date: rec.date,
    time: rec.time,
    is_late: rec.isLate,
    delay_minutes: rec.delayMinutes,
    terminal_name: rec.terminalName,
    notes: rec.notes ?? null,
  };
}

export function configFromDb(row: any): SystemConfig {
  return {
    companyName: row.company_name ?? 'MakroHouse Corp',
    companyRut: row.company_rut ?? '',
    defaultSchedule: parseSchedule(row.default_schedule),
    soundEnabled: row.sound_enabled ?? true,
    autoDetectEvent: row.auto_detect_event ?? true,
    allowManualTypeOverride: row.allow_manual_type_override ?? false,
    superUserPin: row.super_user_pin ?? '1234',
  };
}

export function configToDb(cfg: SystemConfig): any {
  return {
    id: 'default',
    company_name: cfg.companyName,
    company_rut: cfg.companyRut,
    default_schedule: cfg.defaultSchedule,
    sound_enabled: cfg.soundEnabled,
    auto_detect_event: cfg.autoDetectEvent,
    allow_manual_type_override: cfg.allowManualTypeOverride,
    super_user_pin: cfg.superUserPin,
  };
}
