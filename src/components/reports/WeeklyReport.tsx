import React, { useState, useMemo } from 'react';
import { 
  Calendar, 
  Download, 
  ChevronLeft, 
  ChevronRight, 
  Filter, 
  Search, 
  Clock, 
  CheckCircle, 
  AlertTriangle,
  TrendingUp
} from 'lucide-react';
import { AttendanceRecord, Employee } from '../../types/attendance';
import { 
  buildDailySummary, 
  formatDateSpanish, 
  formatMinutesToHours, 
  getTodayDateStr, 
  getWeekDates 
} from '../../utils/timeCalculations';

interface WeeklyReportProps {
  employees: Employee[];
  records: AttendanceRecord[];
}

const DAY_NAMES = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

export const WeeklyReport: React.FC<WeeklyReportProps> = ({ employees, records }) => {
  const [anchorDate, setAnchorDate] = useState<string>(getTodayDateStr());
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedDept, setSelectedDept] = useState<string>('all');

  // Compute week dates (Monday - Sunday)
  const weekDates = useMemo(() => getWeekDates(anchorDate), [anchorDate]);

  // Navigate week
  const handleShiftWeek = (direction: number) => {
    const [y, m, d] = anchorDate.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    date.setDate(date.getDate() + (direction * 7));
    const ny = date.getFullYear();
    const nm = String(date.getMonth() + 1).padStart(2, '0');
    const nd = String(date.getDate()).padStart(2, '0');
    setAnchorDate(`${ny}-${nm}-${nd}`);
  };

  // Build matrix data
  const weeklyData = useMemo(() => {
    return employees.map(emp => {
      const days = weekDates.map(date => {
        const summary = buildDailySummary(emp, date, records);
        return summary;
      });

      const daysAttended = days.filter(d => d.status !== 'absent').length;
      const totalMinutes = days.reduce((sum, d) => sum + (d.effectiveWorkMinutes || 0), 0);
      const totalTardies = days.filter(d => d.isTardy).length;
      const totalTardyMinutes = days.reduce((sum, d) => sum + d.tardyMinutes, 0);

      return {
        employee: emp,
        days,
        daysAttended,
        totalMinutes,
        totalTardies,
        totalTardyMinutes,
      };
    });
  }, [employees, weekDates, records]);

  // Filtered rows
  const filteredRows = useMemo(() => {
    return weeklyData.filter(row => {
      const term = searchTerm.toLowerCase();
      const matchesSearch = 
        row.employee.firstName.toLowerCase().includes(term) ||
        row.employee.lastName.toLowerCase().includes(term) ||
        row.employee.id.toLowerCase().includes(term);
      const matchesDept = selectedDept === 'all' || row.employee.department === selectedDept;
      return matchesSearch && matchesDept;
    });
  }, [weeklyData, searchTerm, selectedDept]);

  // Weekly KPIs
  const grandTotalMinutes = filteredRows.reduce((acc, r) => acc + r.totalMinutes, 0);
  const totalWeeklyTardies = filteredRows.reduce((acc, r) => acc + r.totalTardies, 0);
  const perfectAttendanceCount = filteredRows.filter(r => r.daysAttended >= 5 && r.totalTardies === 0).length;

  // Export to CSV
  const handleExportCSV = () => {
    const headers = [
      'Código',
      'Empleado',
      'Departamento',
      ...weekDates.map((d, i) => `${DAY_NAMES[i]} (${d.slice(5)})`),
      'Días Asistidos',
      'Total Horas',
      'Tardanzas Semanales',
    ];

    const rows = filteredRows.map(r => [
      `"${r.employee.id}"`,
      `"${r.employee.firstName} ${r.employee.lastName}"`,
      `"${r.employee.department}"`,
      ...r.days.map(d => {
        if (d.status === 'absent') return '"Ausente"';
        const hrs = formatMinutesToHours(d.effectiveWorkMinutes || 0);
        return `"${hrs}${d.isTardy ? ` (Tardanza +${d.tardyMinutes}m)` : ''}"`;
      }),
      `"${r.daysAttended}/7"`,
      `"${formatMinutesToHours(r.totalMinutes)}"`,
      `"${r.totalTardies}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Reporte_Semanal_${weekDates[0]}_a_${weekDates[6]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const departments = Array.from(new Set(employees.map(e => e.department)));

  return (
    <div className="space-y-6">
      {/* Header with week navigation */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 bg-slate-950 border border-slate-800 rounded-xl p-1">
            <button
              onClick={() => handleShiftWeek(-1)}
              className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-all"
              title="Semana anterior"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-white text-xs font-mono font-bold px-3 py-1">
              {weekDates[0]} &bull; {weekDates[6]}
            </span>
            <button
              onClick={() => handleShiftWeek(1)}
              className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-all"
              title="Semana siguiente"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <button
            onClick={() => setAnchorDate(getTodayDateStr())}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded-xl text-xs font-bold transition-all"
          >
            Semana Actual
          </button>

          <div>
            <h3 className="text-sm font-bold text-white">
              Reporte Semanal Consolidado
            </h3>
            <p className="text-[11px] text-slate-400">
              Lunes {weekDates[0].slice(5)} al Domingo {weekDates[6].slice(5)}
            </p>
          </div>
        </div>

        <button
          onClick={handleExportCSV}
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-2 transition-all shadow-md shadow-emerald-500/20 w-fit"
        >
          <Download className="w-4 h-4" />
          Exportar CSV (Excel)
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow">
          <div className="flex items-center justify-between text-emerald-400 mb-1">
            <span className="text-xs font-medium">Horas Totales Semanales</span>
            <Clock className="w-4 h-4" />
          </div>
          <p className="text-2xl font-black text-white">{formatMinutesToHours(grandTotalMinutes)}</p>
          <span className="text-[10px] text-slate-500">Tiempo computado en la plantilla</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow">
          <div className="flex items-center justify-between text-amber-400 mb-1">
            <span className="text-xs font-medium">Tardanzas en la Semana</span>
            <AlertTriangle className="w-4 h-4" />
          </div>
          <p className="text-2xl font-black text-amber-400">{totalWeeklyTardies}</p>
          <span className="text-[10px] text-slate-500">Eventos de retraso detectados</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow">
          <div className="flex items-center justify-between text-cyan-400 mb-1">
            <span className="text-xs font-medium">Asistencia Impecable</span>
            <CheckCircle className="w-4 h-4" />
          </div>
          <p className="text-2xl font-black text-cyan-400">{perfectAttendanceCount} empleados</p>
          <span className="text-[10px] text-slate-500">Sin faltas ni tardanzas</span>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3.5 shadow-xl flex flex-wrap items-center justify-between gap-3">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por empleado o código..."
            className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
          />
        </div>

        <select
          value={selectedDept}
          onChange={(e) => setSelectedDept(e.target.value)}
          className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-emerald-500"
        >
          <option value="all">Todos los Departamentos</option>
          {departments.map(d => (
            <option key={d} value={d}>{d}</option>
          ))}
        </select>
      </div>

      {/* Weekly Matrix Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950 text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800">
              <tr>
                <th className="py-3.5 px-4 min-w-[180px]">Empleado</th>
                {weekDates.map((d, i) => (
                  <th key={d} className="py-3.5 px-2 text-center min-w-[80px]">
                    <div>{DAY_NAMES[i]}</div>
                    <div className="text-[10px] font-mono text-slate-500 font-normal">{d.slice(5)}</div>
                  </th>
                ))}
                <th className="py-3.5 px-3 text-center">Días Asist.</th>
                <th className="py-3.5 px-3 text-center">Total Horas</th>
                <th className="py-3.5 px-3 text-center">Tardanzas</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {filteredRows.map((row) => (
                <tr key={row.employee.id} className="hover:bg-slate-800/40 transition-colors">
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2.5">
                      <img
                        src={row.employee.avatarUrl}
                        alt={row.employee.firstName}
                        className="w-8 h-8 rounded-lg object-cover border border-slate-700 shrink-0"
                      />
                      <div>
                        <p className="font-bold text-white text-xs">
                          {row.employee.firstName} {row.employee.lastName}
                        </p>
                        <p className="text-[10px] text-slate-400">{row.employee.department}</p>
                      </div>
                    </div>
                  </td>

                  {/* 7 Days */}
                  {row.days.map((d) => {
                    const isSunday = new Date(d.date).getDay() === 0;
                    return (
                      <td key={d.date} className="py-2.5 px-2 text-center">
                        {d.status === 'absent' ? (
                          isSunday ? (
                            <span className="text-[11px] text-slate-600 font-mono">-</span>
                          ) : (
                            <span className="inline-block px-1.5 py-0.5 rounded text-[10px] bg-rose-500/10 text-rose-400 border border-rose-500/20">
                              Aus
                            </span>
                          )
                        ) : (
                          <div className="inline-flex flex-col items-center">
                            <span className="font-mono text-[11px] font-bold text-white">
                              {formatMinutesToHours(d.effectiveWorkMinutes || 0)}
                            </span>
                            {d.isTardy && (
                              <span className="text-[9px] text-amber-400 font-bold">
                                +{d.tardyMinutes}m
                              </span>
                            )}
                          </div>
                        )}
                      </td>
                    );
                  })}

                  {/* Days count */}
                  <td className="py-3 px-3 text-center font-mono font-bold text-slate-200">
                    {row.daysAttended} / 7
                  </td>

                  {/* Total hours */}
                  <td className="py-3 px-3 text-center">
                    <span className="font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded border border-emerald-500/20">
                      {formatMinutesToHours(row.totalMinutes)}
                    </span>
                  </td>

                  {/* Tardies */}
                  <td className="py-3 px-3 text-center">
                    {row.totalTardies > 0 ? (
                      <span className="font-mono text-xs font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                        {row.totalTardies} ({row.totalTardyMinutes}m)
                      </span>
                    ) : (
                      <span className="font-mono text-xs text-emerald-400 font-bold">0</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
