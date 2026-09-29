import React, { useState, useMemo } from 'react';
import { 
  Calendar, 
  Download, 
  Search, 
  Filter, 
  Users, 
  CheckCircle2, 
  Coffee, 
  LogOut, 
  AlertTriangle, 
  Clock, 
  ChevronLeft, 
  ChevronRight
} from 'lucide-react';
import { AttendanceRecord, Employee } from '../../types/attendance';
import { 
  buildDailySummary, 
  formatDateSpanish, 
  formatMinutesToHours, 
  getTodayDateStr 
} from '../../utils/timeCalculations';

interface DailyReportProps {
  employees: Employee[];
  records: AttendanceRecord[];
}

export const DailyReport: React.FC<DailyReportProps> = ({ employees, records }) => {
  const [selectedDate, setSelectedDate] = useState<string>(getTodayDateStr());
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [departmentFilter, setDepartmentFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Navigate dates
  const handleShiftDate = (days: number) => {
    const [y, m, d] = selectedDate.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    date.setDate(date.getDate() + days);
    const ny = date.getFullYear();
    const nm = String(date.getMonth() + 1).padStart(2, '0');
    const nd = String(date.getDate()).padStart(2, '0');
    setSelectedDate(`${ny}-${nm}-${nd}`);
  };

  // Build daily summaries for all active employees
  const dailySummaries = useMemo(() => {
    return employees.map(emp => buildDailySummary(emp, selectedDate, records));
  }, [employees, selectedDate, records]);

  // Compute metrics
  const totalEmployees = employees.length;
  const presentCount = dailySummaries.filter(s => s.status === 'present').length;
  const onLunchCount = dailySummaries.filter(s => s.status === 'on_lunch').length;
  const completedCount = dailySummaries.filter(s => s.status === 'completed').length;
  const absentCount = dailySummaries.filter(s => s.status === 'absent').length;
  const tardyCount = dailySummaries.filter(s => s.isTardy).length;

  // Filtered rows
  const filteredSummaries = useMemo(() => {
    return dailySummaries.filter(s => {
      const term = searchTerm.toLowerCase();
      const matchesSearch = 
        s.employee.firstName.toLowerCase().includes(term) ||
        s.employee.lastName.toLowerCase().includes(term) ||
        s.employee.id.toLowerCase().includes(term) ||
        s.employee.documentId.toLowerCase().includes(term);

      const matchesDept = departmentFilter === 'all' || s.employee.department === departmentFilter;
      const matchesStatus = statusFilter === 'all' || s.status === statusFilter || (statusFilter === 'tardy' && s.isTardy);

      return matchesSearch && matchesDept && matchesStatus;
    });
  }, [dailySummaries, searchTerm, departmentFilter, statusFilter]);

  // Export to CSV
  const handleExportCSV = () => {
    const headers = [
      'Código',
      'DNI',
      'Empleado',
      'Departamento',
      'Cargo',
      'Horario Entrada',
      'Entrada Mañana',
      'Puntualidad',
      'Salida Almuerzo',
      'Entrada Almuerzo',
      'Tiempo Almuerzo (min)',
      'Salida Fin',
      'Horas Trabajadas',
      'Estado',
    ];

    const rows = filteredSummaries.map(s => [
      `"${s.employee.id}"`,
      `"${s.employee.documentId}"`,
      `"${s.employee.firstName} ${s.employee.lastName}"`,
      `"${s.employee.department}"`,
      `"${s.employee.position}"`,
      `"${s.employee.schedule.entryTime}"`,
      `"${s.morningIn ? s.morningIn.time : '--'}"`,
      `"${s.isTardy ? `Tardanza (+${s.tardyMinutes}m)` : (s.morningIn ? 'Puntual' : 'Sin registro')}"`,
      `"${s.lunchOut ? s.lunchOut.time : '--'}"`,
      `"${s.lunchIn ? s.lunchIn.time : '--'}"`,
      `"${s.lunchDurationMinutes || 0}"`,
      `"${s.shiftOut ? s.shiftOut.time : '--'}"`,
      `"${formatMinutesToHours(s.effectiveWorkMinutes || 0)}"`,
      `"${s.status}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Reporte_Diario_${selectedDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const departments = Array.from(new Set(employees.map(e => e.department)));

  return (
    <div className="space-y-6">
      {/* Date Header & Controls */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 bg-slate-950 border border-slate-800 rounded-xl p-1">
            <button
              onClick={() => handleShiftDate(-1)}
              className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-all"
              title="Día anterior"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-transparent text-white text-xs font-mono font-bold px-2 py-1 focus:outline-none"
            />
            <button
              onClick={() => handleShiftDate(1)}
              className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-all"
              title="Día siguiente"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <button
            onClick={() => setSelectedDate(getTodayDateStr())}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${
              selectedDate === getTodayDateStr()
                ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
            }`}
          >
            Hoy
          </button>

          <div>
            <h3 className="text-sm font-bold text-white capitalize">
              {formatDateSpanish(selectedDate)}
            </h3>
            <p className="text-[11px] text-slate-400">Auditoría diaria de 4 marcaciones</p>
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

      {/* KPI Counters */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-xs font-medium">Total Personal</span>
            <Users className="w-4 h-4 text-slate-500" />
          </div>
          <p className="text-2xl font-black text-white">{totalEmployees}</p>
          <span className="text-[10px] text-slate-500">Plantilla asignada</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow">
          <div className="flex items-center justify-between text-emerald-400 mb-1">
            <span className="text-xs font-medium">Presentes</span>
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <p className="text-2xl font-black text-emerald-400">{presentCount}</p>
          <span className="text-[10px] text-slate-500">Laborando ahora</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow">
          <div className="flex items-center justify-between text-amber-400 mb-1">
            <span className="text-xs font-medium">En Almuerzo</span>
            <Coffee className="w-4 h-4" />
          </div>
          <p className="text-2xl font-black text-amber-400">{onLunchCount}</p>
          <span className="text-[10px] text-slate-500">Pausa comida activa</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow">
          <div className="flex items-center justify-between text-purple-400 mb-1">
            <span className="text-xs font-medium">Jornada Fin</span>
            <LogOut className="w-4 h-4" />
          </div>
          <p className="text-2xl font-black text-purple-400">{completedCount}</p>
          <span className="text-[10px] text-slate-500">Salida completada</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow">
          <div className="flex items-center justify-between text-rose-400 mb-1">
            <span className="text-xs font-medium">Ausentes</span>
            <AlertTriangle className="w-4 h-4" />
          </div>
          <p className="text-2xl font-black text-rose-400">{absentCount}</p>
          <span className="text-[10px] text-slate-500">Sin marcación hoy</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow">
          <div className="flex items-center justify-between text-amber-400 mb-1">
            <span className="text-xs font-medium">Tardanzas</span>
            <Clock className="w-4 h-4" />
          </div>
          <p className="text-2xl font-black text-amber-400">{tardyCount}</p>
          <span className="text-[10px] text-slate-500">Fuera de tolerancia</span>
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
            placeholder="Buscar por empleado, código o documento..."
            className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={departmentFilter}
            onChange={(e) => setDepartmentFilter(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-emerald-500"
          >
            <option value="all">Todos los Departamentos</option>
            {departments.map(d => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-emerald-500"
          >
            <option value="all">Todos los Estados</option>
            <option value="present">En Turno (Presente)</option>
            <option value="on_lunch">En Almuerzo</option>
            <option value="completed">Jornada Finalizada</option>
            <option value="absent">Ausente</option>
            <option value="tardy">Con Tardanza</option>
          </select>
        </div>
      </div>

      {/* Detailed Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950 text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800">
              <tr>
                <th className="py-3.5 px-4">Empleado</th>
                <th className="py-3.5 px-3">1. Entrada Mañana</th>
                <th className="py-3.5 px-3">2. Salida Almuerzo</th>
                <th className="py-3.5 px-3">3. Regreso Almuerzo</th>
                <th className="py-3.5 px-3">4. Salida Fin</th>
                <th className="py-3.5 px-3 text-center">T. Almuerzo</th>
                <th className="py-3.5 px-3 text-center">Horas Laboradas</th>
                <th className="py-3.5 px-4 text-right">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {filteredSummaries.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-500">
                    No hay registros de asistencia para los filtros seleccionados.
                  </td>
                </tr>
              ) : (
                filteredSummaries.map((s) => (
                  <tr key={s.employee.id} className="hover:bg-slate-800/40 transition-colors">
                    {/* Employee Profile */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <img
                          src={s.employee.avatarUrl}
                          alt={s.employee.firstName}
                          className="w-9 h-9 rounded-xl object-cover border border-slate-700 shrink-0"
                        />
                        <div>
                          <p className="font-bold text-white text-xs">
                            {s.employee.firstName} {s.employee.lastName}
                          </p>
                          <p className="text-[10px] text-slate-400">
                            {s.employee.id} &bull; {s.employee.department}
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* 1. Morning In */}
                    <td className="py-3 px-3">
                      {s.morningIn ? (
                        <div>
                          <span className="font-mono font-bold text-white text-xs bg-slate-950 px-2 py-1 rounded border border-slate-800">
                            {s.morningIn.time.slice(0, 5)}
                          </span>
                          {s.isTardy ? (
                            <span className="block mt-1 text-[10px] font-bold text-amber-400">
                              +{s.tardyMinutes}m tardanza
                            </span>
                          ) : (
                            <span className="block mt-1 text-[10px] font-medium text-emerald-400">
                              Puntual
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-600 font-mono">--:--</span>
                      )}
                    </td>

                    {/* 2. Lunch Out */}
                    <td className="py-3 px-3">
                      {s.lunchOut ? (
                        <span className="font-mono font-bold text-amber-300 bg-amber-500/10 px-2 py-1 rounded border border-amber-500/20">
                          {s.lunchOut.time.slice(0, 5)}
                        </span>
                      ) : (
                        <span className="text-slate-600 font-mono">--:--</span>
                      )}
                    </td>

                    {/* 3. Lunch In */}
                    <td className="py-3 px-3">
                      {s.lunchIn ? (
                        <span className="font-mono font-bold text-sky-300 bg-sky-500/10 px-2 py-1 rounded border border-sky-500/20">
                          {s.lunchIn.time.slice(0, 5)}
                        </span>
                      ) : (
                        <span className="text-slate-600 font-mono">--:--</span>
                      )}
                    </td>

                    {/* 4. Shift Out */}
                    <td className="py-3 px-3">
                      {s.shiftOut ? (
                        <span className="font-mono font-bold text-purple-300 bg-purple-500/10 px-2 py-1 rounded border border-purple-500/20">
                          {s.shiftOut.time.slice(0, 5)}
                        </span>
                      ) : (
                        <span className="text-slate-600 font-mono">--:--</span>
                      )}
                    </td>

                    {/* Lunch Duration */}
                    <td className="py-3 px-3 text-center">
                      {s.lunchDurationMinutes ? (
                        <span className="font-mono text-slate-300">
                          {s.lunchDurationMinutes} min
                        </span>
                      ) : (
                        <span className="text-slate-600 font-mono">-</span>
                      )}
                    </td>

                    {/* Effective Hours */}
                    <td className="py-3 px-3 text-center">
                      <span className="font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded border border-emerald-500/20">
                        {formatMinutesToHours(s.effectiveWorkMinutes || 0)}
                      </span>
                    </td>

                    {/* Status Badge */}
                    <td className="py-3 px-4 text-right">
                      {s.status === 'completed' && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                          Jornada Completa
                        </span>
                      )}
                      {s.status === 'on_lunch' && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                          En Almuerzo
                        </span>
                      )}
                      {s.status === 'present' && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                          Presente
                        </span>
                      )}
                      {s.status === 'absent' && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                          Ausente
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
