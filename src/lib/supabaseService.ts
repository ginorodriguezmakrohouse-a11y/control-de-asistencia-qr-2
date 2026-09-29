import { supabase } from './supabase';
import type { Employee, AttendanceRecord, SystemConfig } from '../types/attendance';

export const SupabaseService = {
  async getEmployees(): Promise<Employee[]> {
    const { data, error } = await supabase.from('employees').select('*').eq('active', true);
    if (error) throw error;
    return (data || []) as Employee[];
  },
  async saveEmployee(emp: Employee): Promise<void> {
    const { error } = await supabase.from('employees').upsert(emp);
    if (error) throw error;
  },
  async saveEmployees(emps: Employee[]): Promise<void> {
    for (const emp of emps) {
      const { error } = await supabase.from('employees').upsert(emp);
      if (error) throw error;
    }
  },
  async getRecords(): Promise<AttendanceRecord[]> {
    const { data, error } = await supabase.from('attendance_records').select('*').order('timestamp', { ascending: false }).limit(500);
    if (error) throw error;
    return (data || []) as AttendanceRecord[];
  },
  async addRecord(rec: AttendanceRecord): Promise<void> {
    const { error } = await supabase.from('attendance_records').insert(rec);
    if (error) throw error;
  },
  async saveRecords(records: AttendanceRecord[]): Promise<void> {
    for (const r of records) {
      const { error } = await supabase.from('attendance_records').insert(r);
      if (error) throw error;
    }
  },
  async resetToDefault(): Promise<void> {
    const { error } = await supabase.from('attendance_records').delete();
    if (error) throw error;
  },
  async getConfig(): Promise<SystemConfig> {
    const { data, error } = await supabase.from('system_config').select('*').limit(1).single();
    if (error) throw error;
    return (data || {}) as SystemConfig;
  },
  async saveConfig(cfg: SystemConfig): Promise<void> {
    const { error } = await supabase.from('system_config').upsert(cfg);
    if (error) throw error;
  }
};
