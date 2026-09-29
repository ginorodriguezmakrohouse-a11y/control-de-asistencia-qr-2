import React, { useState, useMemo } from 'react';
import { 
  Calendar, 
  Download, 
  Search, 
  Filter, 
  Clock, 
  AlertTriangle, 
  CheckCircle2, 
  Eye, 
  X, 
  TrendingUp,
  FileSpreadsheet
} from 'lucide-react';
import { AttendanceRecord, DailyEmployeeSummary, Employee } from '../../types/attendance';
import { 
  buildDailySummary, 
  formatDateSpanish, 
  formatMinutesToHours, 
  getMonthDates, 
  getTodayDateStr 
} from '../../utils/timeCalculations';

interface MonthlyReportProps {
  employees: Employee[];
  records: AttendanceRecord[];
}

export const MonthlyReport: React.FC<MonthlyReportProps> = ({ employees, records }) => {
  const today = getTodayDateStr();
  const currentYearMonth = today.slice(0, 7); // "YYYY-MM"
  const [selectedYearMonth, setSelectedYearMonth] = useState<string>(currentYearMonth);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedDept, setSelectedDept] = useState<string>('all');
  const [inspectEmployee, setInspectEmployee] = useState<Employee | null>(null);

  // Month dates
  const monthDates = useMemo(() => getMonthDates(selectedYearMonth), [selectedYearMonth]);

  // Aggregate monthly data for all employees
  const monthlyData = useMemo(() => {
    return employees.map(emp => {
      const dailySummaries = monthDates.map(date => buildDailySummary(emp, date, records));

      // Calculate totals
      const workDays = dailySummaries.filter(d => {
        // Exclude Sundays
        const dayOfWeek = new Date(d.date).getDay();
        return dayOfWeek !== 0;
      });

      const attendedDays = workDays.filter(d => d.status !== 'absent').length;
      const absentDays = workDays.filter(d => d.status === 'absent').length;
      const totalWorkMinutes = dailySummaries.reduce((sum, d) => sum + (d.effectiveWorkMinutes || 0), 0);
      const totalTardies = dailySummaries.filter(d => d.isTardy).length;
      const totalTardyMinutes = dailySummaries.reduce((sum, d) => sum + d.tardyMinutes, 0);

      // Overtime calculation: standard shift is 8h (480 min). Any daily work over 480 min counts as overtime
      const overtimeMinutes = dailySummaries.reduce((sum, d) => {
        const mins = d.effectiveWorkMinutes || 0;
        return mins > 480 ? sum + (mins - 480) : sum;
      }, 0);

      const attendanceRate = workDays.length > 0 
        ? Math.round((attendedDays / workDays.length) * 100) 
        : 100;

      return {
        employee: emp,
        dailySummaries,
        totalDaysInMonth: workDays.length,
        attendedDays,
        absentDays,
        totalWorkMinutes,
        overtimeMinutes,
        totalTardies,
        totalTardyMinutes,
        attendanceRate,
      };
    });
  }, [employees, monthDates, records]);

  // Filtered rows
  const filteredRows = useMemo(() => {
    return monthlyData.filter(r => {
      const term = searchTerm.toLowerCase();
      const matchesSearch = 
        r.employee.firstName.toLowerCase().includes(term) ||
        r.employee.lastName.toLowerCase().includes(term) ||
        r.employee.id.toLowerCase().includes(term);
      const matchesDept = selectedDept === 'all' || r.employee.department === selectedDept;
      return matchesSearch && matchesDept;
    });
  }, [monthlyData, searchTerm, selectedDept]);

  // Monthly KPIs
  const grandTotalMinutes = filteredRows.reduce((acc, r) => acc + r.totalWorkMinutes, 0);
  const grandTotalOvertime = filteredRows.reduce((acc, r) => acc + r.overtimeMinutes, 0);
  const totalTardiesMonth = filteredRows.reduce((acc, r) => acc + r.totalTardies, 0);
  const averageCompliance = filteredRows.length > 0 
    ? Math.round(filteredRows.reduce((acc, r) => acc + r.attendanceRate, 0) / filteredRows.length) 
    : 0;

  // Export to CSV
  const handleExportCSV = () => {
    const headers = [
      'Código',
      'Empleado',
      'Departamento',
      'Días Laborados',
      'Inasistencias',
      'Horas Totales',
      'Horas Extra',
      'Total Tardanzas',
      'Minutos de Retraso',
      'Tasa de Cumplimiento (%)',
    ];

    const rows = filteredRows.map(r => [
      `"${r.employee.id}"`,
      `"${r.employee.firstName} ${r.employee.lastName}"`,
      `"${r.employee.department}"`,
      `"${r.attendedDays}"`,
      `"${r.absentDays}"`,
      `"${formatMinutesToHours(r.totalWorkMinutes)}"`,
      `"${formatMinutesToHours(r.overtimeMinutes)}"`,
      `"${r.totalTardies}"`,
      `"${r.totalTardyMinutes}"`,
      `"${r.attendanceRate}%"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Reporte_Mensual_${selectedYearMonth}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const departments = Array.from(new Set(employees.map(e => e.department)));

  // Detailed modal data
  const inspectData = useMemo(() => {
    if (!inspectEmployee) return null;
    return monthlyData.find(m => m.employee.id === inspectEmployee.id);
  }, [inspectEmployee, monthlyData]);

  return (
    <div className="space-y-6">
      {/* Month Header & Controls */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5">
            <Calendar className="w-4 h-4 text-emerald-400" />
            <input
              type="month"
              value={selectedYearMonth}
              onChange={(e) => setSelectedYearMonth(e.target.value)}
              className="bg-transparent text-white text-xs font-mono font-bold focus:outline-none"
            />
          </div>

          <button
            onClick={() => setSelectedYearMonth(currentYearMonth)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${
              selectedYearMonth === currentYearMonth
                ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
            }`}
          >
            Mes Actual
          </button>

          <div>
            <h3 className="text-sm font-bold text-white">
              Cierre Mensual de Asistencia y Horas
            </h3>
            <p className="text-[11px] text-slate-400">
              Período: {selectedYearMonth} &bull; Liquidación de horas y puntualidad
            </p>
          </div>
        </div>

        <button
          onClick={handleExportCSV}
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-2 transition-all shadow-md shadow-emerald-500/20 w-fit"
        >
          <Download className="w-4 h-4" />
          Exportar Planilla CSV
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow">
          <div className="flex items-center justify-between text-emerald-400 mb-1">
            <span className="text-xs font-medium">Total Horas Mensuales</span>
            <Clock className="w-4 h-4" />
          </div>
          <p className="text-2xl font-black text-white">{formatMinutesToHours(grandTotalMinutes)}</p>
          <span className="text-[10px] text-slate-500">Horas trabajadas totales</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow">
          <div className="flex items-center justify-between text-cyan-400 mb-1">
            <span className="text-xs font-medium">Horas Extras Estimadas</span>
            <TrendingUp className="w-4 h-4" />
          </div>
          <p className="text-2xl font-black text-cyan-400">{formatMinutesToHours(grandTotalOvertime)}</p>
          <span className="text-[10px] text-slate-500">Excedente sobre jornada estándar</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow">
          <div className="flex items-center justify-between text-amber-400 mb-1">
            <span className="text-xs font-medium">Total Tardanzas del Mes</span>
            <AlertTriangle className="w-4 h-4" />
          </div>
          <p className="text-2xl font-black text-amber-400">{totalTardiesMonth}</p>
          <span className="text-[10px] text-slate-500">Incidencias de puntualidad</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow">
          <div className="flex items-center justify-between text-emerald-400 mb-1">
            <span className="text-xs font-medium">Cumplimiento Global</span>
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <p className="text-2xl font-black text-emerald-400">{averageCompliance}%</p>
          <span className="text-[10px] text-slate-500">Asistencia neta promedio</span>
        </div>
      </div>

      {/* Filter Row */}
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

      {/* Monthly Summary Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950 text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800">
              <tr>
                <th className="py-3.5 px-4">Empleado</th>
                <th className="py-3.5 px-3 text-center">Días Asistidos</th>
                <th className="py-3.5 px-3 text-center">Ausencias</th>
                <th className="py-3.5 px-3 text-center">Horas Normales</th>
                <th className="py-3.5 px-3 text-center">Horas Extra</th>
                <th className="py-3.5 px-3 text-center">Tardanzas</th>
                <th className="py-3.5 px-3 text-center">Cumplimiento</th>
                <th className="py-3.5 px-4 text-right">Detalle</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {filteredRows.map((r) => (
                <tr key={r.employee.id} className="hover:bg-slate-800/40 transition-colors">
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-3">
                      <img
                        src={r.employee.avatarUrl}
                        alt={r.employee.firstName}
                        className="w-9 h-9 rounded-xl object-cover border border-slate-700 shrink-0"
                      />
                      <div>
                        <p className="font-bold text-white text-xs">
                          {r.employee.firstName} {r.employee.lastName}
                        </p>
                        <p className="text-[10px] text-slate-400">
                          {r.employee.id} &bull; {r.employee.department}
                        </p>
                      </div>
                    </div>
                  </td>

                  <td className="py-3 px-3 text-center font-mono font-bold text-slate-200">
                    {r.attendedDays} / {r.totalDaysInMonth}
                  </td>

                  <td className="py-3 px-3 text-center">
                    {r.absentDays > 0 ? (
                      <span className="font-mono text-rose-400 font-bold bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/20">
                        {r.absentDays} días
                      </span>
                    ) : (
                      <span className="text-slate-500 font-mono">0</span>
                    )}
                  </td>

                  <td className="py-3 px-3 text-center">
                    <span className="font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded border border-emerald-500/20">
                      {formatMinutesToHours(r.totalWorkMinutes)}
                    </span>
                  </td>

                  <td className="py-3 px-3 text-center">
                    {r.overtimeMinutes > 0 ? (
                      <span className="font-mono font-bold text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/20">
                        +{formatMinutesToHours(r.overtimeMinutes)}
                      </span>
                    ) : (
                      <span className="text-slate-600 font-mono">-</span>
                    )}
                  </td>

                  <td className="py-3 px-3 text-center">
                    {r.totalTardies > 0 ? (
                      <span className="font-mono text-xs font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                        {r.totalTardies} ({r.totalTardyMinutes}m)
                      </span>
                    ) : (
                      <span className="text-emerald-400 font-mono font-bold">0</span>
                    )}
                  </td>

                  <td className="py-3 px-3 text-center">
                    <div className="flex flex-col items-center">
                      <span className="font-mono font-bold text-white">
                        {r.attendanceRate}%
                      </span>
                      <div className="w-14 bg-slate-800 h-1.5 rounded-full overflow-hidden mt-1">
                        <div
                          className={`h-full ${
                            r.attendanceRate >= 90
                              ? 'bg-emerald-400'
                              : r.attendanceRate >= 75
                              ? 'bg-amber-400'
                              : 'bg-rose-500'
                          }`}
                          style={{ width: `${r.attendanceRate}%` }}
                        />
                      </div>
                    </div>
                  </td>

                  <td className="py-3 px-4 text-right">
                    <button
                      onClick={() => setInspectEmployee(r.employee)}
                      className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-emerald-400 border border-slate-700 transition-all text-xs font-bold flex items-center gap-1 ml-auto"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Ver Ficha</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* INSPECTION MODAL: EMPLOYEE'S DETAILED MONTHLY TIMESHEET */}
      {inspectEmployee && inspectData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-4xl w-full p-6 shadow-2xl relative my-8 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800 shrink-0">
              <div className="flex items-center gap-3">
                <img
                  src={inspectEmployee.avatarUrl}
                  alt={inspectEmployee.firstName}
                  className="w-12 h-12 rounded-2xl object-cover border-2 border-emerald-400 shadow-md"
                />
                <div>
                  <h3 className="text-base font-bold text-white">
                    Ficha Mensual de Asistencia: {inspectEmployee.firstName} {inspectEmployee.lastName}
                  </h3>
                  <p className="text-xs text-slate-400">
                    {inspectEmployee.id} &bull; {inspectEmployee.department} &bull; {inspectEmployee.position} &bull; Mes: {selectedYearMonth}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setInspectEmployee(null)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Inspection KPI strip */}
            <div className="grid grid-cols-4 gap-3 my-4 shrink-0">
              <div className="bg-slate-950 border border-slate-800 p-3 rounded-xl text-center">
                <span className="text-[10px] text-slate-400 block">Días Laborados</span>
                <span className="text-base font-bold text-white font-mono">{inspectData.attendedDays} / {inspectData.totalDaysInMonth}</span>
              </div>
              <div className="bg-slate-950 border border-slate-800 p-3 rounded-xl text-center">
                <span className="text-[10px] text-slate-400 block">Horas Totales</span>
                <span className="text-base font-bold text-emerald-400 font-mono">{formatMinutesToHours(inspectData.totalWorkMinutes)}</span>
              </div>
              <div className="bg-slate-950 border border-slate-800 p-3 rounded-xl text-center">
                <span className="text-[10px] text-slate-400 block">Tardanzas</span>
                <span className="text-base font-bold text-amber-400 font-mono">{inspectData.totalTardies} ({inspectData.totalTardyMinutes}m)</span>
              </div>
              <div className="bg-slate-950 border border-slate-800 p-3 rounded-xl text-center">
                <span className="text-[10px] text-slate-400 block">Cumplimiento</span>
                <span className="text-base font-bold text-cyan-400 font-mono">{inspectData.attendanceRate}%</span>
              </div>
            </div>

            {/* Daily timeline table */}
            <div className="overflow-y-auto flex-1 pr-1 border border-slate-800 rounded-xl">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950 text-slate-400 sticky top-0 uppercase font-semibold border-b border-slate-800">
                  <tr>
                    <th className="py-2.5 px-3">Fecha</th>
                    <th className="py-2.5 px-2">Entrada</th>
                    <th className="py-2.5 px-2">Sal. Almuerzo</th>
                    <th className="py-2.5 px-2">Reg. Almuerzo</th>
                    <th className="py-2.5 px-2">Sal. Fin</th>
                    <th className="py-2.5 px-2 text-center">Horas</th>
                    <th className="py-2.5 px-3 text-right">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80">
                  {inspectData.dailySummaries.map((day) => {
                    const isSunday = new Date(day.date).getDay() === 0;
                    return (
                      <tr key={day.date} className={`hover:bg-slate-800/30 ${isSunday ? 'opacity-40 bg-slate-950/40' : ''}`}>
                        <td className="py-2.5 px-3 font-mono text-slate-300">
                          {day.date} {isSunday && <span className="text-[10px] text-slate-500">(Domingo)</span>}
                        </td>
                        <td className="py-2.5 px-2 font-mono">
                          {day.morningIn ? (
                            <span className={day.isTardy ? 'text-amber-400 font-bold' : 'text-emerald-400'}>
                              {day.morningIn.time.slice(0, 5)} {day.isTardy && `(+${day.tardyMinutes}m)`}
                            </span>
                          ) : '--:--'}
                        </td>
                        <td className="py-2.5 px-2 font-mono text-slate-300">
                          {day.lunchOut ? day.lunchOut.time.slice(0, 5) : '--:--'}
                        </td>
                        <td className="py-2.5 px-2 font-mono text-slate-300">
                          {day.lunchIn ? day.lunchIn.time.slice(0, 5) : '--:--'}
                        </td>
                        <td className="py-2.5 px-2 font-mono text-slate-300">
                          {day.shiftOut ? day.shiftOut.time.slice(0, 5) : '--:--'}
                        </td>
                        <td className="py-2.5 px-2 text-center font-mono font-bold text-white">
                          {formatMinutesToHours(day.effectiveWorkMinutes || 0)}
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          {day.status === 'completed' && <span className="text-purple-400">Completa</span>}
                          {day.status === 'present' && <span className="text-emerald-400">Presente</span>}
                          {day.status === 'on_lunch' && <span className="text-amber-400">Almuerzo</span>}
                          {day.status === 'absent' && (isSunday ? <span className="text-slate-600">Descanso</span> : <span className="text-rose-400">Ausente</span>)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="pt-4 border-t border-slate-800 flex justify-end shrink-0 mt-3">
              <button
                onClick={() => setInspectEmployee(null)}
                className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
