import { AttendanceRecord, Employee, SystemConfig } from '../types/attendance';
import { getTodayDateStr } from './timeCalculations';

const STORAGE_KEYS = {
  EMPLOYEES: 'makro_attendance_employees_v1',
  RECORDS: 'makro_attendance_records_v1',
  CONFIG: 'makro_attendance_config_v1',
};

export const DEFAULT_CONFIG: SystemConfig = {
  companyName: 'MakroHouse Corp',
  companyRut: '900.458.120-1',
  defaultSchedule: {
    entryTime: '08:00',
    lunchStartTime: '13:00',
    lunchEndTime: '14:00',
    exitTime: '17:00',
    toleranceMinutes: 15,
    lunchDurationMinutes: 60,
  },
  soundEnabled: true,
  autoDetectEvent: true,
  allowManualTypeOverride: true,
  superUserPin: '1234',
};

export const INITIAL_EMPLOYEES: Employee[] = [
  {
    id: 'EMP-1001',
    qrPayload: 'QR-EMP-1001',
    documentId: '10478952',
    firstName: 'Carlos Andrés',
    lastName: 'Mendoza Flores',
    email: 'carlos.mendoza@makrohouse.com',
    phone: '+51 984 512 301',
    department: 'Operaciones',
    position: 'Jefe de Planta',
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&h=200&fit=crop&crop=faces',
    active: true,
    schedule: {
      entryTime: '08:00',
      lunchStartTime: '13:00',
      lunchEndTime: '14:00',
      exitTime: '17:00',
      toleranceMinutes: 15,
      lunchDurationMinutes: 60,
    },
    createdAt: '2025-01-15T08:00:00Z',
  },
  {
    id: 'EMP-1002',
    qrPayload: 'QR-EMP-1002',
    documentId: '20894561',
    firstName: 'Sofía Elena',
    lastName: 'Vásquez Ramos',
    email: 'sofia.vasquez@makrohouse.com',
    phone: '+51 977 410 882',
    department: 'Recursos Humanos',
    position: 'Especialista de Selección y Bienestar',
    avatarUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=200&h=200&fit=crop&crop=faces',
    active: true,
    schedule: {
      entryTime: '08:30',
      lunchStartTime: '13:00',
      lunchEndTime: '14:00',
      exitTime: '17:30',
      toleranceMinutes: 10,
      lunchDurationMinutes: 60,
    },
    createdAt: '2025-02-01T08:00:00Z',
  },
  {
    id: 'EMP-1003',
    qrPayload: 'QR-EMP-1003',
    documentId: '45127830',
    firstName: 'Mateo Alejandro',
    lastName: 'Guerrero Silva',
    email: 'mateo.guerrero@makrohouse.com',
    phone: '+51 965 231 990',
    department: 'Tecnología',
    position: 'Ingeniero de Software Senior',
    avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop&crop=faces',
    active: true,
    schedule: {
      entryTime: '09:00',
      lunchStartTime: '13:30',
      lunchEndTime: '14:30',
      exitTime: '18:00',
      toleranceMinutes: 20,
      lunchDurationMinutes: 60,
    },
    createdAt: '2025-02-10T08:00:00Z',
  },
  {
    id: 'EMP-1004',
    qrPayload: 'QR-EMP-1004',
    documentId: '71239845',
    firstName: 'Lucía Marcela',
    lastName: 'Paredes Cárdenas',
    email: 'lucia.paredes@makrohouse.com',
    phone: '+51 941 789 223',
    department: 'Logística',
    position: 'Coordinadora de Distribución',
    avatarUrl: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=200&h=200&fit=crop&crop=faces',
    active: true,
    schedule: {
      entryTime: '08:00',
      lunchStartTime: '12:30',
      lunchEndTime: '13:30',
      exitTime: '17:00',
      toleranceMinutes: 15,
      lunchDurationMinutes: 60,
    },
    createdAt: '2025-03-01T08:00:00Z',
  },
  {
    id: 'EMP-1005',
    qrPayload: 'QR-EMP-1005',
    documentId: '46892135',
    firstName: 'Diego Fernando',
    lastName: 'Ríos Castillo',
    email: 'diego.rios@makrohouse.com',
    phone: '+51 952 110 344',
    department: 'Ventas',
    position: 'Ejecutivo Comercial Senior',
    avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&h=200&fit=crop&crop=faces',
    active: true,
    schedule: {
      entryTime: '08:30',
      lunchStartTime: '13:00',
      lunchEndTime: '14:00',
      exitTime: '17:30',
      toleranceMinutes: 15,
      lunchDurationMinutes: 60,
    },
    createdAt: '2025-03-15T08:00:00Z',
  },
  {
    id: 'EMP-1006',
    qrPayload: 'QR-EMP-1006',
    documentId: '49901248',
    firstName: 'Valeria Inés',
    lastName: 'Ortiz Morales',
    email: 'valeria.ortiz@makrohouse.com',
    phone: '+51 933 774 159',
    department: 'Finanzas',
    position: 'Analista Contable',
    avatarUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=200&h=200&fit=crop&crop=faces',
    active: true,
    schedule: {
      entryTime: '08:00',
      lunchStartTime: '13:00',
      lunchEndTime: '14:00',
      exitTime: '17:00',
      toleranceMinutes: 15,
      lunchDurationMinutes: 60,
    },
    createdAt: '2025-04-01T08:00:00Z',
  },
  {
    id: 'EMP-1007',
    qrPayload: 'QR-EMP-1007',
    documentId: '38190452',
    firstName: 'Javier Rodrigo',
    lastName: 'Salazar Benítez',
    email: 'javier.salazar@makrohouse.com',
    phone: '+51 912 665 448',
    department: 'Operaciones',
    position: 'Técnico de Mantenimiento Industrial',
    avatarUrl: 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=200&h=200&fit=crop&crop=faces',
    active: true,
    schedule: {
      entryTime: '07:30',
      lunchStartTime: '12:00',
      lunchEndTime: '13:00',
      exitTime: '16:30',
      toleranceMinutes: 10,
      lunchDurationMinutes: 60,
    },
    createdAt: '2025-04-10T08:00:00Z',
  },
  {
    id: 'EMP-1008',
    qrPayload: 'QR-EMP-1008',
    documentId: '40192837',
    firstName: 'Camila Nicole',
    lastName: 'Herrera Guzmán',
    email: 'camila.herrera@makrohouse.com',
    phone: '+51 928 334 112',
    department: 'Recursos Humanos',
    position: 'Asistente de Personal',
    avatarUrl: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=200&h=200&fit=crop&crop=faces',
    active: true,
    schedule: {
      entryTime: '08:00',
      lunchStartTime: '13:00',
      lunchEndTime: '14:00',
      exitTime: '17:00',
      toleranceMinutes: 15,
      lunchDurationMinutes: 60,
    },
    createdAt: '2025-05-01T08:00:00Z',
  },
];

// Generate seed attendance records for realistic report previews
export function generateSeedRecords(): AttendanceRecord[] {
  const records: AttendanceRecord[] = [];
  const today = getTodayDateStr();

  // Create attendance for today and previous 6 days
  const todayDate = new Date();
  
  for (let i = 6; i >= 0; i--) {
    const d = new Date(todayDate);
    d.setDate(todayDate.getDate() - i);
    // skip sundays for sample
    if (d.getDay() === 0) continue;

    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const dateStr = `${y}-${m}-${day}`;
    const isCurrentDay = dateStr === today;

    INITIAL_EMPLOYEES.forEach((emp, index) => {
      // simulate some absentees occasionally
      if (index === 6 && i === 2) return; // Javier was absent 2 days ago

      // 1. Morning in
      const isLate = index === 3 && i === 1; // Lucía had 1 late arrival
      const morningMinute = isLate ? '24' : String(50 + (index % 8)).padStart(2, '0');
      const morningHour = isLate ? '08' : '07';
      const morningTime = `${morningHour}:${morningMinute}:14`;

      records.push({
        id: `REC-${dateStr}-${emp.id}-IN`,
        employeeId: emp.id,
        employeeName: `${emp.firstName} ${emp.lastName}`,
        employeeDocument: emp.documentId,
        department: emp.department,
        avatarUrl: emp.avatarUrl,
        type: 'morning_in',
        timestamp: `${dateStr}T${morningTime}Z`,
        date: dateStr,
        time: morningTime,
        isLate,
        delayMinutes: isLate ? 24 : 0,
        terminalName: 'Terminal RR.HH Puerta Principal',
      });

      // If it's today, only register partial stages for live demonstration
      if (isCurrentDay) {
        if (index === 0 || index === 1) {
          // In lunch or returning
          records.push({
            id: `REC-${dateStr}-${emp.id}-LO`,
            employeeId: emp.id,
            employeeName: `${emp.firstName} ${emp.lastName}`,
            employeeDocument: emp.documentId,
            department: emp.department,
            avatarUrl: emp.avatarUrl,
            type: 'lunch_out',
            timestamp: `${dateStr}T13:05:22Z`,
            date: dateStr,
            time: '13:05:22',
            isLate: false,
            delayMinutes: 0,
            terminalName: 'Terminal RR.HH Cafetería',
          });
          if (index === 0) {
            records.push({
              id: `REC-${dateStr}-${emp.id}-LI`,
              employeeId: emp.id,
              employeeName: `${emp.firstName} ${emp.lastName}`,
              employeeDocument: emp.documentId,
              department: emp.department,
              avatarUrl: emp.avatarUrl,
              type: 'lunch_in',
              timestamp: `${dateStr}T13:58:10Z`,
              date: dateStr,
              time: '13:58:10',
              isLate: false,
              delayMinutes: 0,
              terminalName: 'Terminal RR.HH Cafetería',
            });
          }
        }
        return;
      }

      // Past days have full cycle
      // 2. Lunch out
      records.push({
        id: `REC-${dateStr}-${emp.id}-LO`,
        employeeId: emp.id,
        employeeName: `${emp.firstName} ${emp.lastName}`,
        employeeDocument: emp.documentId,
        department: emp.department,
        avatarUrl: emp.avatarUrl,
        type: 'lunch_out',
        timestamp: `${dateStr}T13:02:11Z`,
        date: dateStr,
        time: '13:02:11',
        isLate: false,
        delayMinutes: 0,
        terminalName: 'Terminal RR.HH Cafetería',
      });

      // 3. Lunch in
      records.push({
        id: `REC-${dateStr}-${emp.id}-LI`,
        employeeId: emp.id,
        employeeName: `${emp.firstName} ${emp.lastName}`,
        employeeDocument: emp.documentId,
        department: emp.department,
        avatarUrl: emp.avatarUrl,
        type: 'lunch_in',
        timestamp: `${dateStr}T13:59:45Z`,
        date: dateStr,
        time: '13:59:45',
        isLate: false,
        delayMinutes: 0,
        terminalName: 'Terminal RR.HH Cafetería',
      });

      // 4. Shift out
      records.push({
        id: `REC-${dateStr}-${emp.id}-OUT`,
        employeeId: emp.id,
        employeeName: `${emp.firstName} ${emp.lastName}`,
        employeeDocument: emp.documentId,
        department: emp.department,
        avatarUrl: emp.avatarUrl,
        type: 'shift_out',
        timestamp: `${dateStr}T17:08:33Z`,
        date: dateStr,
        time: '17:08:33',
        isLate: false,
        delayMinutes: 0,
        terminalName: 'Terminal RR.HH Puerta Principal',
      });
    });
  }

  return records;
}

export const StorageService = {
  getEmployees(): Employee[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.EMPLOYEES);
      if (!data) {
        localStorage.setItem(STORAGE_KEYS.EMPLOYEES, JSON.stringify(INITIAL_EMPLOYEES));
        return INITIAL_EMPLOYEES;
      }
      return JSON.parse(data);
    } catch {
      return INITIAL_EMPLOYEES;
    }
  },

  saveEmployees(employees: Employee[]): void {
    try {
      localStorage.setItem(STORAGE_KEYS.EMPLOYEES, JSON.stringify(employees));
    } catch (err) {
      console.error('Error saving employees to localStorage:', err);
    }
  },

  getRecords(): AttendanceRecord[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.RECORDS);
      if (!data) {
        const seeded = generateSeedRecords();
        localStorage.setItem(STORAGE_KEYS.RECORDS, JSON.stringify(seeded));
        return seeded;
      }
      return JSON.parse(data);
    } catch {
      return [];
    }
  },

  saveRecords(records: AttendanceRecord[]): void {
    try {
      localStorage.setItem(STORAGE_KEYS.RECORDS, JSON.stringify(records));
    } catch (err) {
      console.error('Error saving records to localStorage:', err);
    }
  },

  addRecord(record: AttendanceRecord): AttendanceRecord[] {
    const current = this.getRecords();
    const updated = [record, ...current];
    this.saveRecords(updated);
    return updated;
  },

  getConfig(): SystemConfig {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.CONFIG);
      if (!data) {
        localStorage.setItem(STORAGE_KEYS.CONFIG, JSON.stringify(DEFAULT_CONFIG));
        return DEFAULT_CONFIG;
      }
      return { ...DEFAULT_CONFIG, ...JSON.parse(data) };
    } catch {
      return DEFAULT_CONFIG;
    }
  },

  saveConfig(config: SystemConfig): void {
    try {
      localStorage.setItem(STORAGE_KEYS.CONFIG, JSON.stringify(config));
    } catch (err) {
      console.error('Error saving config:', err);
    }
  },

  resetToDefault(): void {
    localStorage.removeItem(STORAGE_KEYS.EMPLOYEES);
    localStorage.removeItem(STORAGE_KEYS.RECORDS);
    localStorage.removeItem(STORAGE_KEYS.CONFIG);
  },
};
