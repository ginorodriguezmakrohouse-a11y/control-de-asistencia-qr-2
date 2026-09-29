import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { QRScannerView } from './components/scanner/QRScannerView';
import { EmployeeManagement } from './components/employees/EmployeeManagement';
import { ReportsContainer } from './components/reports/ReportsContainer';
import { SettingsView } from './components/settings/SettingsView';
import { AttendanceRecord, Employee, SystemConfig } from './types/attendance';
import { SupabaseService } from './lib/supabaseService';
import { migrateLocalStorageToSupabase } from "./lib/migrateLocalStorageToSupabase";

export default function App() {
  const [activeTab, setActiveTab] = useState<'scanner' | 'employees' | 'reports' | 'settings'>('scanner');
  
  // Persistent data states
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [config, setConfig] = useState<SystemConfig>({} as SystemConfig);
  const [isLoaded, setIsLoaded] = useState<boolean>(false);

  // Initialize from localStorage → migrate to Supabase first
  useEffect(() => {
    (async () => {
      await migrateLocalStorageToSupabase();
      const loadedEmployees = await SupabaseService.getEmployees();
      const loadedRecords = await SupabaseService.getRecords();
      const loadedConfig = await SupabaseService.getConfig();
      setEmployees(loadedEmployees || []);
      setRecords(loadedRecords || []);
      setConfig(loadedConfig);
      setIsLoaded(true);
    })();
  }, []);

  // Handlers for state & persistence
  const handleAddRecord = async (record: AttendanceRecord) => {
    await SupabaseService.addRecord(record);
    setRecords(prev => [record, ...prev]);
  };

  const handleAddEmployee = async (emp: Employee) => {
      const updated = [emp, ...employees];
      setEmployees(updated);
      await SupabaseService.saveEmployees(updated);
    };

  const handleUpdateEmployee = (emp: Employee) => {
    const updated = employees.map(e => e.id === emp.id ? emp : e);
    setEmployees(updated);
    SupabaseService.saveEmployees(updated);
  };

  const handleDeleteEmployee = (id: string) => {
    const updated = employees.filter(e => e.id !== id);
    setEmployees(updated);
    SupabaseService.saveEmployees(updated);
  };

  const handleUpdateConfig = (newConfig: SystemConfig) => {
    setConfig(newConfig);
    SupabaseService.saveConfig(newConfig);
  };

  const handleToggleSound = () => {
    const newConfig = { ...config, soundEnabled: !config.soundEnabled };
    setConfig(newConfig);
    SupabaseService.saveConfig(newConfig);
  };

  const handleResetData = async () => {
    await SupabaseService.resetToDefault();
    const resetEmps = await SupabaseService.getEmployees();
    const resetRecs = await SupabaseService.getRecords();
    const resetCfg = await SupabaseService.getConfig();
    setEmployees(resetEmps || []);
    setRecords(resetRecs || []);
    setConfig(resetCfg || ({} as SystemConfig));
  };

  const handleClearRecordsOnly = () => {
    setRecords([]);
    SupabaseService.saveRecords([]);
  };

  const handleRestoreBackup = (
    newEmployees: Employee[],
    newRecords: AttendanceRecord[],
    newConfig: SystemConfig
  ) => {
    setEmployees(newEmployees);
    setRecords(newRecords);
    setConfig(newConfig);
    SupabaseService.saveEmployees(newEmployees);
    SupabaseService.saveRecords(newRecords);
    SupabaseService.saveConfig(newConfig);
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
