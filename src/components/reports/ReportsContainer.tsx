import React, { useState } from 'react';
import { Calendar, BarChart3, CalendarDays, FileText } from 'lucide-react';
import { AttendanceRecord, Employee } from '../../types/attendance';
import { DailyReport } from './DailyReport';
import { WeeklyReport } from './WeeklyReport';
import { MonthlyReport } from './MonthlyReport';

interface ReportsContainerProps {
  employees: Employee[];
  records: AttendanceRecord[];
}

export const ReportsContainer: React.FC<ReportsContainerProps> = ({ employees, records }) => {
  const [reportType, setReportType] = useState<'daily' | 'weekly' | 'monthly'>('daily');

  return (
    <div className="space-y-6">
      {/* Sub-navigation for Reports */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-2 shadow-xl flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center space-x-1">
          <button
            onClick={() => setReportType('daily')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              reportType === 'daily'
                ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/25'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Calendar className="w-4 h-4" />
            <span>Reporte Diario</span>
          </button>

          <button
            onClick={() => setReportType('weekly')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              reportType === 'weekly'
                ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/25'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <CalendarDays className="w-4 h-4" />
            <span>Reporte Semanal</span>
          </button>

          <button
            onClick={() => setReportType('monthly')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              reportType === 'monthly'
                ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/25'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Reporte Mensual</span>
          </button>
        </div>

        <div className="px-3 py-1 text-xs text-slate-400 font-medium hidden sm:flex items-center gap-1.5">
          <BarChart3 className="w-3.5 h-3.5 text-emerald-400" />
          <span>Informes de Asistencia & Horas Trabajadas</span>
        </div>
      </div>

      {/* Render active report */}
      {reportType === 'daily' && (
        <DailyReport employees={employees} records={records} />
      )}
      {reportType === 'weekly' && (
        <WeeklyReport employees={employees} records={records} />
      )}
      {reportType === 'monthly' && (
        <MonthlyReport employees={employees} records={records} />
      )}
    </div>
  );
};
