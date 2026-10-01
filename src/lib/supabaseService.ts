import { supabase } from './supabase';
import type { Employee, AttendanceRecord, SystemConfig } from '../types/attendance';
import {
  employeeFromDb, employeeToDb,
  recordFromDb, recordToDb,
  configFromDb, configToDb,
} from './mappers';

const BATCH_SIZE = 200;

// Config por defecto cuando la fila 'default' aún no existe en system_config
async function getConfigFallback(): Promise<SystemConfig> {
  const { data } = await supabase.from('system_config').select('*').eq('id', 'default').maybeSingle();
  return configFromDb(data ?? {});
}

export const SupabaseService = {
  // Devuelve TODOS los empleados (incluidos inactivos): la UI de gestión
  // necesita verlos y el escáner debe poder avisar "DESACTIVADO" en vez de
  // "código no reconocido".
  async getEmployees(): Promise<Employee[]> {
    const { data, error } = await supabase
      .from('employees')
      .select('*')
      .order('last_name');
    if (error) throw error;
    return (data || []).map(employeeFromDb);
  },

  async saveEmployee(emp: Employee): Promise<void> {
    const { error } = await supabase
      .from('employees')
      .upsert(employeeToDb(emp), { onConflict: 'id' });
    if (error) throw error;
  },

  async deleteEmployee(id: string): Promise<void> {
    const { error } = await supabase.from('employees').delete().eq('id', id);
    if (error) throw error;
  },

  async saveEmployees(emps: Employee[]): Promise<void> {
    const rows = emps.map(employeeToDb);
    for (let i = 0; i < rows.length; i += BATCH_SIZE) {
      const { error } = await supabase
        .from('employees')
        .upsert(rows.slice(i, i + BATCH_SIZE), { onConflict: 'id' });
      if (error) throw error;
    }
  },

  async getRecords(): Promise<AttendanceRecord[]> {
    const { data, error } = await supabase
      .from('attendance_records')
      .select('*')
      .order('timestamp', { ascending: false })
      .limit(5000);
    if (error) throw error;
    return (data || []).map(recordFromDb);
  },

  async addRecord(rec: AttendanceRecord): Promise<void> {
    // onConflict:'employee_id,type,date' respeta el índice único
    // uq_records_employee_type_date: si ya existe un movimiento del mismo
    // tipo para ese empleado ese día, Supabase ignora la fila en vez de
    // duplicarla (evita el registro múltiple incluso con peticiones
    // concurrentes desde varias pestañas/terminales).
    const { error } = await supabase
      .from('attendance_records')
      .upsert(recordToDb(rec), {
        onConflict: 'employee_id,type,date',
        ignoreDuplicates: true,
      });
    if (error) throw error;
  },

  async saveRecords(records: AttendanceRecord[]): Promise<void> {
    if (!records.length) return;
    const rows = records.map(recordToDb);
    for (let i = 0; i < rows.length; i += BATCH_SIZE) {
      const { error } = await supabase
        .from('attendance_records')
        .upsert(rows.slice(i, i + BATCH_SIZE), { onConflict: 'id' });
      if (error) throw error;
    }
  },

  // Borra SOLO los registros de asistencia (empleados y config se conservan).
  async clearRecords(): Promise<void> {
    const { error } = await supabase.from('attendance_records').delete().neq('id', '');
    if (error) throw error;
  },

  async getConfig(): Promise<SystemConfig> {
    const { data, error } = await supabase
      .from('system_config')
      .select('*')
      .eq('id', 'default')
      .maybeSingle();
    if (error) throw error;
    if (!data) {
      // Fila inexistente: crearla con valores por defecto del schema
      const { error: insErr } = await supabase
        .from('system_config')
        .upsert({ id: 'default' });
      if (insErr) throw insErr;
      return getConfigFallback();
    }
    return configFromDb(data);
  },

  async saveConfig(cfg: SystemConfig): Promise<void> {
    const { error } = await supabase
      .from('system_config')
      .upsert(configToDb(cfg), { onConflict: 'id' });
    if (error) throw error;
  },

  // ---- QR diario por colaborador ----
  // Guarda/actualiza el payload del QR de un empleado para una fecha.
  // onConflict:'employee_id,qr_date' respeta el índice único
  // uq_daily_qr_employee_date: no puede haber dos códigos distintos
  // para el mismo empleado el mismo día.
  async saveDailyQr(employeeId: string, qrDate: string, payload: string): Promise<void> {
    const { error } = await supabase
      .from('daily_qr_codes')
      .upsert(
        { employee_id: employeeId, qr_date: qrDate, payload },
        { onConflict: 'employee_id,qr_date' }
      );
    if (error) throw error;
  },

  async getDailyQrCodes(qrDate?: string): Promise<
    { employee_id: string; qr_date: string; payload: string; created_at: string }[]
  > {
    let query = supabase
      .from('daily_qr_codes')
      .select('employee_id, qr_date, payload, created_at')
      .order('qr_date', { ascending: false })
      .limit(5000);
    if (qrDate) query = query.eq('qr_date', qrDate);
    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  },
};
