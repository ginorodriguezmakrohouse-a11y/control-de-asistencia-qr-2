import { supabase, isSupabaseConfigured } from './supabase';
import { StorageService } from '../utils/storage';
import { employeeToDb, recordToDb, configToDb } from './mappers';

const MIGRATION_FLAG = 'makro_migration_done_v1';

// Sube datos locales (localStorage) a Supabase UNA sola vez por navegador.
export async function migrateLocalStorageToSupabase(): Promise<boolean> {
  if (!isSupabaseConfigured) return false;
  if (localStorage.getItem(MIGRATION_FLAG) === 'true') return false;

  const employees = StorageService.getEmployees();
  const records = StorageService.getRecords();
  const config = StorageService.getConfig();

  const empRows = employees.map(employeeToDb);
  const recRows = records.map(recordToDb);

  const { error: e1 } = await supabase.from('employees').upsert(empRows, { onConflict: 'id' });
  if (e1) console.error('Migración empleados falló:', e1.message);
  const { error: e2 } = await supabase.from('attendance_records').upsert(recRows, { onConflict: 'id' });
  if (e2) console.error('Migración registros falló:', e2.message);
  const { error: e3 } = await supabase.from('system_config').upsert(configToDb(config), { onConflict: 'id' });
  if (e3) console.error('Migración config falló:', e3.message);

  localStorage.setItem(MIGRATION_FLAG, 'true');
  return true;
}