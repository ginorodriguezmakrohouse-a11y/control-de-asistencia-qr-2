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
    const { error } = await supabase
      .from('attendance_records')
      .insert(recordToDb(rec));
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
};
