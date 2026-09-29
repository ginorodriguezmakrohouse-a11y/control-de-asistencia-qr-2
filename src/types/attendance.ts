export type AttendanceEventType = 
  | 'morning_in'    // Entrada en la mañana
  | 'lunch_out'     // Salida a la hora del almuerzo
  | 'lunch_in'      // Entrada después de la hora de almuerzo
  | 'shift_out';    // Salida del trabajo

export interface WorkSchedule {
  entryTime: string;          // e.g. "08:00"
  lunchStartTime: string;     // e.g. "13:00"
  lunchEndTime: string;       // e.g. "14:00"
  exitTime: string;           // e.g. "17:00"
  toleranceMinutes: number;   // e.g. 15
  lunchDurationMinutes: number; // e.g. 60
}

export interface Employee {
  id: string;               // e.g. "EMP-1001"
  qrPayload: string;        // e.g. "QR-EMP-1001"
  documentId: string;       // DNI / Cédula / RUT
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  department: string;       // "Operaciones", "Tecnología", "RR.HH.", etc.
  position: string;         // "Supervisor de Planta", "Analista", etc.
  avatarUrl: string;
  active: boolean;
  schedule: WorkSchedule;
  createdAt: string;
}

export interface AttendanceRecord {
  id: string;
  employeeId: string;
  employeeName: string;
  employeeDocument: string;
  department: string;
  avatarUrl: string;
  type: AttendanceEventType;
  timestamp: string;        // ISO string
  date: string;             // YYYY-MM-DD
  time: string;             // HH:MM:SS
  isLate: boolean;
  delayMinutes: number;
  terminalName: string;
  notes?: string;
}

export interface DailyEmployeeSummary {
  date: string;
  employee: Employee;
  morningIn?: AttendanceRecord;
  lunchOut?: AttendanceRecord;
  lunchIn?: AttendanceRecord;
  shiftOut?: AttendanceRecord;
  lunchDurationMinutes?: number;
  effectiveWorkMinutes?: number;
  status: 'present' | 'on_lunch' | 'completed' | 'absent' | 'incomplete';
  isTardy: boolean;
  tardyMinutes: number;
}

export interface SystemConfig {
  companyName: string;
  companyRut: string;
  defaultSchedule: WorkSchedule;
  soundEnabled: boolean;
  autoDetectEvent: boolean;
  allowManualTypeOverride: boolean;
  superUserPin: string;
}
