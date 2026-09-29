import { supabase } from './supabase';
import { StorageService } from '../utils/storage';

export async function migrateLocalStorageToSupabase() {
  const employees = StorageService.getEmployees();
  const records = StorageService.getRecords();
  for (const e of employees) {
    await supabase.from('employees').upsert({
      id: e.id, qr_payload: e.qrPayload, document_id: e.documentId,
      first_name: e.firstName, last_name: e.lastName, email: e.email,
      phone: e.phone, department: e.department, position: e.position,
      avatar_url: e.avatarUrl, active: e.active, schedule: JSON.stringify(e.schedule),
    }, { onConflict: 'id' });
  }
  for (const r of records) {
    await supabase.from('attendance_records').upsert({
      id: r.id, employee_id: r.employeeId, employee_name: r.employeeName,
      employee_document: r.employeeDocument, department: r.department,
      avatar_url: r.avatarUrl, type: r.type, timestamp: r.timestamp,
      date: r.date, time: r.time, is_late: r.isLate,
      delay_minutes: r.delayMinutes, terminal_name: r.terminalName,
    }, { onConflict: 'id' });
  }
  const config = StorageService.getConfig();
  await supabase.from('system_config').upsert({
    id: 'default', company_name: config.companyName,
    company_rut: config.companyRut,
    default_schedule: JSON.stringify(config.defaultSchedule),
    sound_enabled: config.soundEnabled, auto_detect_event: config.autoDetectEvent,
    allow_manual_type_override: config.allowManualTypeOverride,
    super_user_pin: config.superUserPin,
  }, { onConflict: 'id' });
  return { employees: employees.length, records: records.length };
}