import React, { useState } from 'react';
import { 
  Settings, 
  Building2, 
  Clock, 
  Volume2, 
  VolumeX, 
  Database, 
  Download, 
  Upload, 
  Check, 
  ShieldCheck,
  Trash2
} from 'lucide-react';
import { AttendanceRecord, Employee, SystemConfig } from '../../types/attendance';
import { DailyQrModule } from './DailyQrModule';

interface SettingsViewProps {
  config: SystemConfig;
  onUpdateConfig: (config: SystemConfig) => void;
  employees: Employee[];
  records: AttendanceRecord[];
  onClearRecordsOnly: () => void;
  onRestoreBackup: (employees: Employee[], records: AttendanceRecord[], config: SystemConfig) => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  config,
  onUpdateConfig,
  employees,
  records,
  onClearRecordsOnly,
  onRestoreBackup,
}) => {
  const [formData, setFormData] = useState<SystemConfig>(config);
  const [savedSuccess, setSavedSuccess] = useState<boolean>(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateConfig(formData);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  const handleExportBackup = () => {
    const backupData = {
      timestamp: new Date().toISOString(),
      companyName: config.companyName,
      employees,
      records,
      config,
    };
    const jsonStr = JSON.stringify(backupData, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `backup_asistencia_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const parsed = JSON.parse(content);
        if (parsed.employees && parsed.records && parsed.config) {
          onRestoreBackup(parsed.employees, parsed.records, parsed.config);
          alert('¡Copia de seguridad restaurada correctamente!');
        } else {
          alert('El archivo no contiene un formato de respaldo válido.');
        }
      } catch (err) {
        alert('Error al leer el archivo JSON.');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 bg-emerald-500/20 text-emerald-400 rounded-lg">
              <Settings className="w-5 h-5" />
            </span>
            <h2 className="text-xl font-bold text-white">
              Configuración del Sistema (Super Usuario)
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Personaliza los datos corporativos, tolerancias de tardanza por defecto y respaldos de la base de datos.
          </p>
        </div>

        <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 bg-amber-500/10 text-amber-300 border border-amber-500/30 rounded-xl text-xs font-semibold">
          <ShieldCheck className="w-4 h-4 text-amber-400" />
          Modo Administrador
        </span>
      </div>

      {/* Main Settings Form */}
      <form onSubmit={handleSubmit} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
        
        {/* Company info */}
        <div>
          <h3 className="text-sm font-bold text-white flex items-center gap-2 mb-3">
            <Building2 className="w-4 h-4 text-emerald-400" />
            Datos de la Empresa
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-400 block mb-1">
                Nombre de la Empresa o Razón Social
              </label>
              <input
                type="text"
                value={formData.companyName}
                onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                required
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-400 block mb-1">
                Identificación Fiscal / RUC / RUT
              </label>
              <input
                type="text"
                value={formData.companyRut}
                onChange={(e) => setFormData({ ...formData, companyRut: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
              />
            </div>
          </div>
        </div>

        {/* Default Schedule & Tolerances */}
        <div className="pt-4 border-t border-slate-800">
          <h3 className="text-sm font-bold text-white flex items-center gap-2 mb-3">
            <Clock className="w-4 h-4 text-emerald-400" />
            Horario Laboral Predeterminado & Tolerancia
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <label className="text-[11px] text-slate-400 block mb-1">Hora Entrada Mañana</label>
              <input
                type="time"
                value={formData.defaultSchedule.entryTime}
                onChange={(e) => setFormData({
                  ...formData,
                  defaultSchedule: { ...formData.defaultSchedule, entryTime: e.target.value }
                })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-white font-mono"
              />
            </div>

            <div>
              <label className="text-[11px] text-slate-400 block mb-1">Salida a Almuerzo</label>
              <input
                type="time"
                value={formData.defaultSchedule.lunchStartTime}
                onChange={(e) => setFormData({
                  ...formData,
                  defaultSchedule: { ...formData.defaultSchedule, lunchStartTime: e.target.value }
                })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-white font-mono"
              />
            </div>

            <div>
              <label className="text-[11px] text-slate-400 block mb-1">Salida de Jornada</label>
              <input
                type="time"
                value={formData.defaultSchedule.exitTime}
                onChange={(e) => setFormData({
                  ...formData,
                  defaultSchedule: { ...formData.defaultSchedule, exitTime: e.target.value }
                })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-white font-mono"
              />
            </div>

            <div>
              <label className="text-[11px] text-slate-400 block mb-1">Tolerancia de Tardanza (min)</label>
              <input
                type="number"
                min="0"
                max="60"
                value={formData.defaultSchedule.toleranceMinutes}
                onChange={(e) => setFormData({
                  ...formData,
                  defaultSchedule: { ...formData.defaultSchedule, toleranceMinutes: parseInt(e.target.value, 10) || 0 }
                })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-white font-mono"
              />
            </div>
          </div>
          <p className="text-[11px] text-slate-500 mt-2">
            Nota: Si un empleado marca después de la hora oficial más los minutos de tolerancia, se computa automáticamente como tardanza en los reportes.
          </p>
        </div>

        {/* Audio and Behavior */}
        <div className="pt-4 border-t border-slate-800">
          <h3 className="text-sm font-bold text-white flex items-center gap-2 mb-3">
            <Volume2 className="w-4 h-4 text-emerald-400" />
            Comportamiento del Terminal Escáner
          </h3>
          <div className="space-y-3">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.soundEnabled}
                onChange={(e) => setFormData({ ...formData, soundEnabled: e.target.checked })}
                className="rounded border-slate-800 text-emerald-500 focus:ring-emerald-400"
              />
              <span className="text-xs text-slate-300">
                Emitir sonidos acústicos al escanear (Chime de éxito para marcación puntual, alerta para tardanza, zumbador para error)
              </span>
            </label>

            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.autoDetectEvent}
                onChange={(e) => setFormData({ ...formData, autoDetectEvent: e.target.checked })}
                className="rounded border-slate-800 text-emerald-500 focus:ring-emerald-400"
              />
              <span className="text-xs text-slate-300">
                Habilitar Auto-Detección inteligente del tipo de marcación (Entrada Mañana &rarr; Salida Almuerzo &rarr; Regreso &rarr; Salida)
              </span>
            </label>
          </div>
        </div>

        {/* Save button */}
        <div className="pt-4 border-t border-slate-800 flex items-center justify-end gap-3">
          {savedSuccess && (
            <span className="text-xs text-emerald-400 flex items-center gap-1 font-semibold animate-fade-in">
              <Check className="w-4 h-4" />
              ¡Configuración guardada!
            </span>
          )}
          <button
            type="submit"
            className="px-6 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-xl shadow-md shadow-emerald-500/20 transition-all active:scale-95"
          >
            Guardar Cambios
          </button>
        </div>
      </form>

      {/* Database Maintenance & Backups */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <Database className="w-4 h-4 text-emerald-400" />
          Mantenimiento de Datos & Copias de Seguridad
        </h3>
        <p className="text-xs text-slate-400">
          Actualmente hay <strong className="text-white">{employees.length} empleados</strong> registrados y <strong className="text-white">{records.length} eventos de asistencia</strong> en la base de datos local.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
          {/* Download JSON Backup */}
          <button
            onClick={handleExportBackup}
            className="p-3 bg-slate-950 hover:bg-slate-800 border border-slate-800 rounded-xl text-left flex items-center gap-3 transition-all"
          >
            <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-lg shrink-0">
              <Download className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-bold text-white">Descargar Respaldo JSON</p>
              <p className="text-[10px] text-slate-400">Exporta empleados y marcaciones completas</p>
            </div>
          </button>

          {/* Import JSON Backup */}
          <label className="p-3 bg-slate-950 hover:bg-slate-800 border border-slate-800 rounded-xl text-left flex items-center gap-3 cursor-pointer transition-all">
            <div className="p-2 bg-cyan-500/20 text-cyan-400 rounded-lg shrink-0">
              <Upload className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-bold text-white">Restaurar Respaldo JSON</p>
              <p className="text-[10px] text-slate-400">Cargar un archivo .json previo</p>
            </div>
            <input
              type="file"
              accept=".json"
              onChange={handleImportBackup}
              className="hidden"
            />
          </label>
        </div>

        {/* Danger zone actions */}
        <div className="pt-4 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-3">
          <button
            onClick={() => {
              if (window.confirm('¿Seguro que deseas vaciar todos los registros de marcación? Los empleados se conservarán.')) {
                onClearRecordsOnly();
              }
            }}
            className="px-3.5 py-2 bg-rose-950/40 hover:bg-rose-950/80 border border-rose-800/60 text-rose-300 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all"
          >
            <Trash2 className="w-3.5 h-3.5 text-rose-400" />
            Limpiar Solo Registros de Marcación
          </button>
        </div>
      </div>

      {/* Módulo de generación de QR diarios por colaborador */}
      <DailyQrModule employees={employees} />
    </div>
  );
};
