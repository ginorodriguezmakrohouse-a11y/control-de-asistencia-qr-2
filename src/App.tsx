import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { QRScannerView } from './components/scanner/QRScannerView';
import { EmployeeManagement } from './components/employees/EmployeeManagement';
import { ReportsContainer } from './components/reports/ReportsContainer';
import { SettingsView } from './components/settings/SettingsView';
import { AttendanceRecord, Employee, SystemConfig } from './types/attendance';
import { SupabaseService } from './lib/supabaseService';
import { isSupabaseConfigured } from './lib/supabase';
import { migrateLocalStorageToSupabase } from "./lib/migrateLocalStorageToSupabase";
import { StorageService, DEFAULT_CONFIG } from './utils/storage';

export default function App() {
  const [activeTab, setActiveTab] = useState<'scanner' | 'employees' | 'reports' | 'settings'>('scanner');

  // Persistent data states
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [config, setConfig] = useState<SystemConfig>(DEFAULT_CONFIG);
  const [isLoaded, setIsLoaded] = useState<boolean>(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Initialize: migrate localStorage -> Supabase once, then load from Supabase.
  // IMPORTANTE: todo camino (éxito o error) debe terminar con setIsLoaded(true),
  // si no la app queda en pantalla de carga infinita / blanca.
  useEffect(() => {
    let cancelled = false;

    const timeoutId = window.setTimeout(() => {
      if (cancelled) return; // modo local / ya resuelto: no hacer nada
      console.warn('Tiempo de espera agotado al conectar con Supabase, usando datos locales.');
      setEmployees(StorageService.getEmployees());
      setRecords(StorageService.getRecords());
      setConfig(StorageService.getConfig());
      setLoadError('No se pudo conectar con Supabase a tiempo (¿URL incorrecta, proyecto pausado o sin red?). Mostrando datos locales.');
      setIsLoaded(true);
    }, 15000);

    (async () => {
      if (!isSupabaseConfigured) {
        // Modo sin backend: usar datos locales para que la app sea utilizable en desarrollo
        clearTimeout(timeoutId);
        setEmployees(StorageService.getEmployees());
        setRecords(StorageService.getRecords());
        setConfig(StorageService.getConfig());
        setLoadError('No hay conexión con Supabase (faltan VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY). Mostrando datos locales.');
        setIsLoaded(true);
        return;
      }
      try {
        await migrateLocalStorageToSupabase();
        const loadedEmployees = await SupabaseService.getEmployees();
        const loadedRecords = await SupabaseService.getRecords();
        const loadedConfig = await SupabaseService.getConfig();
        if (!cancelled) {
          setEmployees(loadedEmployees || []);
          setRecords(loadedRecords || []);
          setConfig(loadedConfig);
        }
      } catch (err: any) {
        console.error('Error cargando datos de Supabase:', err);
        if (!cancelled) {
          setLoadError(`Error al conectar con Supabase: ${err?.message || err}. Verifica las credenciales y el schema (supabase/schema.sql).`);
          setEmployees(StorageService.getEmployees());
          setRecords(StorageService.getRecords());
          setConfig(StorageService.getConfig());
        }
      } finally {
        clearTimeout(timeoutId);
        if (!cancelled) setIsLoaded(true);
      }
    })();

    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
    };
  }, []);

  // Handlers for state & persistence
  const handleAddRecord = async (record: AttendanceRecord) => {
    // Registro en Supabase PRIMERO: si falla, se propaga el error para que el
    // escáner NO cierre la ventana del lector y permita reintentar.
    if (isSupabaseConfigured) {
      await SupabaseService.addRecord(record);
    }
    // Solo persistir localmente y pintar en pantalla cuando el dato quedó
    // registrado correctamente. Se deduplica por (empleado+tipo+fecha) para
    // que un mismo movimiento no aparezca varias veces en la lista en
    // memoria aunque el evento llegue duplicado.
    StorageService.addRecord(record);
    setRecords(prev => {
      const dupIdx = prev.findIndex(
        r =>
          r.employeeId === record.employeeId &&
          r.type === record.type &&
          r.date === record.date
      );
      if (dupIdx !== -1) {
        const next = [...prev];
        next[dupIdx] = record; // reemplaza en vez de duplicar
        return next;
      }
      return [record, ...prev];
    });
  };

  const handleAddEmployee = async (emp: Employee) => {
    const updated = [emp, ...employees];
    setEmployees(updated);
    StorageService.saveEmployees(updated);
    if (isSupabaseConfigured) {
      try { await SupabaseService.saveEmployee(emp); }
      catch (err) { console.error('Error guardando empleado:', err); }
    }
  };

  const handleUpdateEmployee = (emp: Employee) => {
    const updated = employees.map(e => e.id === emp.id ? emp : e);
    setEmployees(updated);
    StorageService.saveEmployees(updated);
    if (isSupabaseConfigured) {
      SupabaseService.saveEmployee(emp).catch(err => console.error('Error actualizando empleado:', err));
    }
  };

  const handleDeleteEmployee = (id: string) => {
    const updated = employees.filter(e => e.id !== id);
    setEmployees(updated);
    StorageService.saveEmployees(updated);
    if (isSupabaseConfigured) {
      SupabaseService.deleteEmployee(id).catch(err => console.error('Error eliminando empleado:', err));
    }
  };

  const handleUpdateConfig = (newConfig: SystemConfig) => {
    setConfig(newConfig);
    StorageService.saveConfig(newConfig);
    if (isSupabaseConfigured) {
      SupabaseService.saveConfig(newConfig).catch(err => console.error('Error guardando config:', err));
    }
  };

  const handleToggleSound = () => {
    const newConfig = { ...config, soundEnabled: !config.soundEnabled };
    setConfig(newConfig);
    StorageService.saveConfig(newConfig);
    if (isSupabaseConfigured) {
      SupabaseService.saveConfig(newConfig).catch(err => console.error('Error guardando config:', err));
    }
  };

  const handleResetData = async () => {
    StorageService.resetToDefault();
    if (isSupabaseConfigured) {
      try {
        await SupabaseService.clearRecords();
        await SupabaseService.saveEmployees(StorageService.getEmployees());
        await SupabaseService.saveConfig(StorageService.getConfig());
        const resetEmps = await SupabaseService.getEmployees();
        const resetRecs = await SupabaseService.getRecords();
        const resetCfg = await SupabaseService.getConfig();
        setEmployees(resetEmps || []);
        setRecords(resetRecs || []);
        setConfig(resetCfg || DEFAULT_CONFIG);
        return;
      } catch (err) {
        console.error('Error al reiniciar datos en Supabase:', err);
      }
    }
    setEmployees(StorageService.getEmployees());
    setRecords([]);
    setConfig(StorageService.getConfig());
  };

  const handleClearRecordsOnly = () => {
    setRecords([]);
    StorageService.saveRecords([]);
    if (isSupabaseConfigured) {
      SupabaseService.clearRecords().catch(err => console.error('Error limpiando registros:', err));
    }
  };

  const handleRestoreBackup = (
    newEmployees: Employee[],
    newRecords: AttendanceRecord[],
    newConfig: SystemConfig
  ) => {
    setEmployees(newEmployees);
    setRecords(newRecords);
    setConfig(newConfig);
    StorageService.saveEmployees(newEmployees);
    StorageService.saveRecords(newRecords);
    StorageService.saveConfig(newConfig);
    if (isSupabaseConfigured) {
      Promise.all([
        SupabaseService.saveEmployees(newEmployees),
        SupabaseService.saveRecords(newRecords),
        SupabaseService.saveConfig(newConfig),
      ]).catch(err => console.error('Error restaurando backup:', err));
    }
  };

  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs text-slate-400 font-mono">Cargando sistema de control de asistencia...</p>
        </div>
      </div>
    );
  }

  const activeEmployeesCount = employees.filter(e => e.active).length;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-emerald-500 selection:text-slate-950">
      {/* Top Application Header */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        config={config}
        onToggleSound={handleToggleSound}
        activeEmployeesCount={activeEmployeesCount}
      />

      {loadError && (
        <div className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-4">
          <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-300 flex items-start gap-2">
            <span aria-hidden>⚠️</span>
            <div>
              <p>{loadError}</p>
              <button onClick={() => setLoadError(null)} className="mt-1 text-xs underline text-amber-200">Cerrar</button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {activeTab === 'scanner' && (
          <QRScannerView
            employees={employees}
            records={records}
            config={config}
            onAddRecord={handleAddRecord}
          />
        )}

        {activeTab === 'employees' && (
          <EmployeeManagement
            employees={employees}
            config={config}
            onAddEmployee={handleAddEmployee}
            onUpdateEmployee={handleUpdateEmployee}
            onDeleteEmployee={handleDeleteEmployee}
          />
        )}

        {activeTab === 'reports' && (
          <ReportsContainer
            employees={employees}
            records={records}
          />
        )}

        {activeTab === 'settings' && (
          <SettingsView
            config={config}
            onUpdateConfig={handleUpdateConfig}
            employees={employees}
            records={records}
            onResetData={handleResetData}
            onClearRecordsOnly={handleClearRecordsOnly}
            onRestoreBackup={handleRestoreBackup}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950 py-4 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p>
            {config.companyName || 'MakroHouse'} &bull; Sistema de Control de Asistencia QR &copy; {new Date().getFullYear()}
          </p>
          <p className="font-mono text-[11px] text-slate-600">
            Terminal RR.HH &bull; Marcaciones: Entrada, Salida Almuerzo, Entrada Almuerzo, Salida Trabajo
          </p>
        </div>
      </footer>
    </div>
  );
}
