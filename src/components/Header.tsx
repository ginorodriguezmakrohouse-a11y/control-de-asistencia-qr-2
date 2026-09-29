import React, { useState, useEffect } from 'react';
import { 
  QrCode, 
  Users, 
  BarChart3, 
  Settings, 
  Clock, 
  ShieldCheck, 
  Building2,
  Volume2,
  VolumeX
} from 'lucide-react';
import { SystemConfig } from '../types/attendance';
import { formatDateSpanish, getCurrentTimeStr, getTodayDateStr } from '../utils/timeCalculations';

interface HeaderProps {
  activeTab: 'scanner' | 'employees' | 'reports' | 'settings';
  setActiveTab: (tab: 'scanner' | 'employees' | 'reports' | 'settings') => void;
  config: SystemConfig;
  onToggleSound: () => void;
  activeEmployeesCount: number;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  config,
  onToggleSound,
  activeEmployeesCount,
}) => {
  const [timeStr, setTimeStr] = useState(getCurrentTimeStr());
  const todayDateStr = getTodayDateStr();

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeStr(getCurrentTimeStr());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <header className="bg-slate-900 border-b border-slate-800 text-white sticky top-0 z-40 shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          {/* Logo & Brand */}
          <div className="flex items-center space-x-3">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-emerald-500 via-teal-500 to-cyan-500 flex items-center justify-center shadow-md shadow-emerald-500/20 ring-2 ring-emerald-400/30">
              <QrCode className="w-6 h-6 text-slate-950 font-bold stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-extrabold text-lg tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-300 bg-clip-text text-transparent">
                  {config.companyName || 'MakroHouse'}
                </span>
                <span className="px-2 py-0.5 text-[10px] font-bold tracking-wider uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-full">
                  Asistencia QR
                </span>
              </div>
              <p className="text-xs text-slate-400 flex items-center gap-1.5 mt-0.5">
                <Building2 className="w-3.5 h-3.5 text-slate-500" />
                <span>Control de Personal RR.HH</span>
                <span className="text-slate-600">•</span>
                <span className="text-emerald-400 font-medium">{activeEmployeesCount} empleados activos</span>
              </p>
            </div>
          </div>

          {/* Center: Live Digital Clock */}
          <div className="hidden md:flex flex-col items-center justify-center px-4 py-1.5 bg-slate-950/70 border border-slate-800/80 rounded-xl">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-emerald-400 animate-pulse" />
              <span className="font-mono text-xl font-bold tracking-widest text-emerald-400">
                {timeStr}
              </span>
            </div>
            <span className="text-[11px] text-slate-400 capitalize">
              {formatDateSpanish(todayDateStr)}
            </span>
          </div>

          {/* Navigation Controls */}
          <div className="flex items-center space-x-2">
            {/* Sound toggle button */}
            <button
              onClick={onToggleSound}
              title={config.soundEnabled ? 'Silenciar sonidos de escáner' : 'Activar sonidos de escáner'}
              className={`p-2.5 rounded-lg border transition-all ${
                config.soundEnabled 
                  ? 'bg-slate-800/80 border-slate-700 text-emerald-400 hover:bg-slate-700' 
                  : 'bg-slate-800/40 border-slate-800 text-slate-500 hover:text-slate-300'
              }`}
            >
              {config.soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex space-x-1 border-t border-slate-800/80 pt-2 pb-2 overflow-x-auto scrollbar-none">
          <button
            onClick={() => setActiveTab('scanner')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all whitespace-nowrap ${
              activeTab === 'scanner'
                ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/25 ring-1 ring-emerald-400'
                : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <QrCode className="w-4 h-4" />
            <span>Terminal RR.HH (Escáner QR)</span>
            {activeTab === 'scanner' && (
              <span className="w-2 h-2 rounded-full bg-slate-950 animate-ping ml-1" />
            )}
          </button>

          <button
            onClick={() => setActiveTab('employees')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all whitespace-nowrap ${
              activeTab === 'employees'
                ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/25 ring-1 ring-emerald-400'
                : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Personal & Carnets QR</span>
            <span className="text-[11px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-300 font-mono">
              {activeEmployeesCount}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('reports')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all whitespace-nowrap ${
              activeTab === 'reports'
                ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/25 ring-1 ring-emerald-400'
                : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            <span>Reportes (Día / Sem / Mes)</span>
          </button>

          <button
            onClick={() => setActiveTab('settings')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all whitespace-nowrap ${
              activeTab === 'settings'
                ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/25 ring-1 ring-emerald-400'
                : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Settings className="w-4 h-4" />
            <span>Configuración (Super Usuario)</span>
            <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
          </button>
        </div>
      </div>
    </header>
  );
};
