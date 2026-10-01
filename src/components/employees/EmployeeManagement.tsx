import React, { useState } from 'react';
import { 
  Users, 
  UserPlus, 
  Search, 
  Edit3, 
  Trash2, 
  QrCode, 
  Check, 
  X, 
  ShieldAlert, 
  Printer, 
  Filter, 
  Clock, 
  Briefcase,
  AlertCircle
} from 'lucide-react';
import { Employee, SystemConfig } from '../../types/attendance';
import { EmployeeBadgeModal } from './EmployeeBadgeModal';
import { normalizeAvatarUrl, initialsAvatarDataUrl, isNonDirectImageUrl } from '../../utils/avatar';

interface EmployeeManagementProps {
  employees: Employee[];
  config: SystemConfig;
  onAddEmployee: (emp: Employee) => void;
  onUpdateEmployee: (emp: Employee) => void;
  onDeleteEmployee: (id: string) => void;
}

const DEPARTMENTS = [
  'Operaciones',
  'Recursos Humanos',
  'Tecnología',
  'Logística',
  'Ventas',
  'Finanzas',
  'Mantenimiento',
  'Administración',
];

const PRESET_AVATARS = [
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&h=200&fit=crop&crop=faces',
  'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=200&h=200&fit=crop&crop=faces',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop&crop=faces',
  'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=200&h=200&fit=crop&crop=faces',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&h=200&fit=crop&crop=faces',
  'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=200&h=200&fit=crop&crop=faces',
  'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=200&h=200&fit=crop&crop=faces',
  'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=200&h=200&fit=crop&crop=faces',
];

export const EmployeeManagement: React.FC<EmployeeManagementProps> = ({
  employees,
  config,
  onAddEmployee,
  onUpdateEmployee,
  onDeleteEmployee,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDept, setSelectedDept] = useState<string>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [selectedBadgeEmployee, setSelectedBadgeEmployee] = useState<Employee | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    id: '',
    documentId: '',
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    department: 'Operaciones',
    position: '',
    avatarUrl: PRESET_AVATARS[0],
    active: true,
    entryTime: config.defaultSchedule.entryTime,
    lunchStartTime: config.defaultSchedule.lunchStartTime,
    lunchEndTime: config.defaultSchedule.lunchEndTime,
    exitTime: config.defaultSchedule.exitTime,
    toleranceMinutes: config.defaultSchedule.toleranceMinutes,
  });

  const [formError, setFormError] = useState<string | null>(null);

  // Filter employees
  const filtered = employees.filter(emp => {
    const matchesSearch = 
      emp.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.documentId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.position.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDept = selectedDept === 'all' || emp.department === selectedDept;
    return matchesSearch && matchesDept;
  });

  const openCreateModal = () => {
    // Generate next EMP code
    const highestId = employees.reduce((max, e) => {
      const match = e.id.match(/\d+/);
      const num = match ? parseInt(match[0], 10) : 1000;
      return num > max ? num : max;
    }, 1000);
    const nextCode = `EMP-${highestId + 1}`;

    setEditingEmployee(null);
    setFormData({
      id: nextCode,
      documentId: '',
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      department: 'Operaciones',
      position: '',
      avatarUrl: PRESET_AVATARS[Math.floor(Math.random() * PRESET_AVATARS.length)],
      active: true,
      entryTime: config.defaultSchedule.entryTime,
      lunchStartTime: config.defaultSchedule.lunchStartTime,
      lunchEndTime: config.defaultSchedule.lunchEndTime,
      exitTime: config.defaultSchedule.exitTime,
      toleranceMinutes: config.defaultSchedule.toleranceMinutes,
    });
    setFormError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (emp: Employee) => {
    setEditingEmployee(emp);
    setFormData({
      id: emp.id,
      documentId: emp.documentId,
      firstName: emp.firstName,
      lastName: emp.lastName,
      email: emp.email,
      phone: emp.phone,
      department: emp.department,
      position: emp.position,
      avatarUrl: emp.avatarUrl,
      active: emp.active,
      entryTime: emp.schedule.entryTime,
      lunchStartTime: emp.schedule.lunchStartTime,
      lunchEndTime: emp.schedule.lunchEndTime,
      exitTime: emp.schedule.exitTime,
      toleranceMinutes: emp.schedule.toleranceMinutes,
    });
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.firstName.trim() || !formData.lastName.trim() || !formData.documentId.trim()) {
      setFormError('Por favor completa el nombre, apellido y documento de identidad.');
      return;
    }

    if (editingEmployee) {
      const updated: Employee = {
        ...editingEmployee,
        documentId: formData.documentId.trim(),
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim(),
        department: formData.department,
        position: formData.position.trim(),
        avatarUrl: formData.avatarUrl,
        active: formData.active,
        schedule: {
          entryTime: formData.entryTime,
          lunchStartTime: formData.lunchStartTime,
          lunchEndTime: formData.lunchEndTime,
          exitTime: formData.exitTime,
          toleranceMinutes: Number(formData.toleranceMinutes) || 15,
          lunchDurationMinutes: config.defaultSchedule.lunchDurationMinutes,
        },
      };
      onUpdateEmployee(updated);
    } else {
      // Check for duplicate ID or document
      if (employees.some(e => e.id.toLowerCase() === formData.id.toLowerCase())) {
        setFormError(`El código ${formData.id} ya existe.`);
        return;
      }
      const newEmp: Employee = {
        id: formData.id.trim(),
        qrPayload: `QR-${formData.id.trim()}`,
        documentId: formData.documentId.trim(),
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim(),
        department: formData.department,
        position: formData.position.trim(),
        avatarUrl: formData.avatarUrl,
        active: formData.active,
        schedule: {
          entryTime: formData.entryTime,
          lunchStartTime: formData.lunchStartTime,
          lunchEndTime: formData.lunchEndTime,
          exitTime: formData.exitTime,
          toleranceMinutes: Number(formData.toleranceMinutes) || 15,
          lunchDurationMinutes: config.defaultSchedule.lunchDurationMinutes,
        },
        createdAt: new Date().toISOString(),
      };
      onAddEmployee(newEmp);
    }

    setIsModalOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 bg-emerald-500/20 text-emerald-400 rounded-lg">
              <Users className="w-5 h-5" />
            </span>
            <h2 className="text-xl font-bold text-white">
              Administración de Personal (Super Usuarios)
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Gestiona el catálogo de empleados, asignación de turnos, generación de carnets corporativos e impresión de códigos QR.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setSelectedBadgeEmployee(employees[0] || null)}
            className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-bold flex items-center gap-2 transition-all"
          >
            <Printer className="w-4 h-4 text-emerald-400" />
            Imprimir Carnets
          </button>

          <button
            onClick={openCreateModal}
            className="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-xl text-xs font-bold flex items-center gap-2 transition-all shadow-md shadow-emerald-500/20 active:scale-95"
          >
            <UserPlus className="w-4 h-4" />
            Nuevo Empleado
          </button>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por nombre, DNI, código o cargo..."
            className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="w-4 h-4 text-slate-500" />
          <select
            value={selectedDept}
            onChange={(e) => setSelectedDept(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-emerald-500 w-full sm:w-auto"
          >
            <option value="all">Todos los Departamentos</option>
            {DEPARTMENTS.map(d => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Employees Table / Cards */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950 text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800">
              <tr>
                <th className="py-3.5 px-4">Empleado</th>
                <th className="py-3.5 px-4">Código / DNI</th>
                <th className="py-3.5 px-4">Departamento / Cargo</th>
                <th className="py-3.5 px-4">Horario Asignado</th>
                <th className="py-3.5 px-4">Estado</th>
                <th className="py-3.5 px-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-500">
                    No se encontraron empleados con los criterios de búsqueda.
                  </td>
                </tr>
              ) : (
                filtered.map((emp) => (
                  <tr key={emp.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <img
                          src={normalizeAvatarUrl(emp.avatarUrl)}
                          onError={(e) => { const t = e.currentTarget as HTMLImageElement; if (!t.dataset.fallback) { t.dataset.fallback = '1'; t.src = initialsAvatarDataUrl(emp.firstName); } }}
                          alt={emp.firstName}
                          className="w-10 h-10 rounded-xl object-cover border border-slate-700 shrink-0"
                        />
                        <div>
                          <p className="font-bold text-white text-sm">
                            {emp.firstName} {emp.lastName}
                          </p>
                          <p className="text-[11px] text-slate-400">{emp.email}</p>
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <span className="font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                        {emp.id}
                      </span>
                      <p className="text-[11px] text-slate-400 font-mono mt-1">
                        DNI: {emp.documentId}
                      </p>
                    </td>

                    <td className="py-3.5 px-4">
                      <p className="font-semibold text-slate-200">{emp.department}</p>
                      <p className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                        <Briefcase className="w-3 h-3 text-slate-500" />
                        {emp.position}
                      </p>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-1 text-slate-300 font-mono">
                        <Clock className="w-3.5 h-3.5 text-emerald-400" />
                        <span>{emp.schedule.entryTime} - {emp.schedule.exitTime}</span>
                      </div>
                      <p className="text-[10px] text-slate-500 mt-0.5">
                        Almuerzo: {emp.schedule.lunchStartTime} &bull; Tol: {emp.schedule.toleranceMinutes}m
                      </p>
                    </td>

                    <td className="py-3.5 px-4">
                      {emp.active ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                          <Check className="w-3 h-3" /> Activo
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-rose-500/20 text-rose-400 border border-rose-500/30">
                          <X className="w-3 h-3" /> Inactivo
                        </span>
                      )}
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => setSelectedBadgeEmployee(emp)}
                          title="Ver y generar carnet QR"
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-emerald-400 border border-slate-700 transition-all"
                        >
                          <QrCode className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => openEditModal(emp)}
                          title="Editar datos del empleado"
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-all"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => {
                            if (window.confirm(`¿Seguro que deseas eliminar a ${emp.firstName} ${emp.lastName}?`)) {
                              onDeleteEmployee(emp.id);
                            }
                          }}
                          title="Eliminar empleado"
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-950/60 text-rose-400 border border-slate-700 hover:border-rose-800 transition-all"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* CREATE / EDIT EMPLOYEE MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-xl w-full p-6 shadow-2xl relative my-8">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Users className="w-5 h-5 text-emerald-400" />
                {editingEmployee ? 'Editar Empleado' : 'Registrar Nuevo Empleado'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {formError && (
              <div className="mt-4 p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-400 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="mt-4 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-400 block mb-1">
                    Código de Empleado (ID) *
                  </label>
                  <input
                    type="text"
                    value={formData.id}
                    disabled={!!editingEmployee}
                    onChange={(e) => setFormData({ ...formData, id: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-mono disabled:opacity-50"
                    required
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-400 block mb-1">
                    DNI / Documento de Identidad *
                  </label>
                  <input
                    type="text"
                    value={formData.documentId}
                    onChange={(e) => setFormData({ ...formData, documentId: e.target.value })}
                    placeholder="Ej. 10458921"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-mono"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-400 block mb-1">
                    Nombres *
                  </label>
                  <input
                    type="text"
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                    placeholder="Ej. Carlos Andrés"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                    required
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-400 block mb-1">
                    Apellidos *
                  </label>
                  <input
                    type="text"
                    value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                    placeholder="Ej. Mendoza Flores"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-400 block mb-1">
                    Departamento
                  </label>
                  <select
                    value={formData.department}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                  >
                    {DEPARTMENTS.map(d => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-400 block mb-1">
                    Cargo / Puesto de Trabajo
                  </label>
                  <input
                    type="text"
                    value={formData.position}
                    onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                    placeholder="Ej. Supervisor de Planta"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-400 block mb-1">
                    Correo Electrónico
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="correo@makrohouse.com"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-400 block mb-1">
                    Teléfono
                  </label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="+51 987 654 321"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                  />
                </div>
              </div>

              {/* Photo Avatar Selector */}
              <div>
                <label className="text-[11px] font-bold text-slate-400 block mb-1">
                  Foto de Perfil (selecciona una o ingresa URL)
                </label>
                <div className="flex items-center gap-2 mb-2 overflow-x-auto pb-1">
                  {PRESET_AVATARS.map((url, i) => (
                    <button
                      type="button"
                      key={i}
                      onClick={() => setFormData({ ...formData, avatarUrl: url })}
                      className={`relative shrink-0 rounded-xl overflow-hidden border-2 transition-all ${
                        formData.avatarUrl === url ? 'border-emerald-400 scale-105' : 'border-slate-800 opacity-60'
                      }`}
                    >
                      <img src={url} alt="preset" className="w-10 h-10 object-cover" />
                    </button>
                  ))}
                </div>
                <input
                  type="url"
                  value={formData.avatarUrl}
                  onChange={(e) => setFormData({ ...formData, avatarUrl: e.target.value })}
                  placeholder="https://... (URL directa de imagen)"
                  className={
                    'w-full bg-slate-950 border rounded-xl px-3 py-1.5 text-xs text-slate-300 font-mono ' +
                    (isNonDirectImageUrl(formData.avatarUrl) ? 'border-amber-500/70' : 'border-slate-800')
                  }
                />
              </div>

              {/* Schedule Configuration */}
              <div className="pt-2 border-t border-slate-800">
                <span className="text-xs font-bold text-slate-300 block mb-2">
                  Configuración de Turno y Tolerancia:
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <div>
                    <label className="text-[10px] text-slate-400 block mb-0.5">Entrada Mañana</label>
                    <input
                      type="time"
                      value={formData.entryTime}
                      onChange={(e) => setFormData({ ...formData, entryTime: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2 py-1.5 text-xs text-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 block mb-0.5">Salida Almuerzo</label>
                    <input
                      type="time"
                      value={formData.lunchStartTime}
                      onChange={(e) => setFormData({ ...formData, lunchStartTime: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2 py-1.5 text-xs text-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 block mb-0.5">Salida Jornada</label>
                    <input
                      type="time"
                      value={formData.exitTime}
                      onChange={(e) => setFormData({ ...formData, exitTime: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2 py-1.5 text-xs text-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 block mb-0.5">Tolerancia (min)</label>
                    <input
                      type="number"
                      value={formData.toleranceMinutes}
                      onChange={(e) => setFormData({ ...formData, toleranceMinutes: parseInt(e.target.value, 10) || 0 })}
                      min="0"
                      max="60"
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2 py-1.5 text-xs text-white font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Status */}
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="activeCheck"
                  checked={formData.active}
                  onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                  className="rounded border-slate-800 text-emerald-500 focus:ring-emerald-400"
                />
                <label htmlFor="activeCheck" className="text-xs text-slate-300">
                  Empleado activo (autorizado para registrar asistencia)
                </label>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-xl text-xs font-bold shadow-md shadow-emerald-500/20"
                >
                  {editingEmployee ? 'Guardar Cambios' : 'Registrar Empleado'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* QR BADGE PREVIEW MODAL */}
      {selectedBadgeEmployee && (
        <EmployeeBadgeModal
          employee={selectedBadgeEmployee}
          employees={employees}
          config={config}
          onClose={() => setSelectedBadgeEmployee(null)}
          onSelectEmployee={(emp) => setSelectedBadgeEmployee(emp)}
        />
      )}
    </div>
  );
};
