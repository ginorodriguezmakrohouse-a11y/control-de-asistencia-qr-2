import { AttendanceRecord, DailyEmployeeSummary, Employee } from '../types/attendance';

export const EVENT_LABELS: Record<string, { label: string; short: string; color: string; badgeBg: string; textCol: string }> = {
  morning_in: {
    label: 'Entrada en la Mañana',
    short: 'Entrada Mañana',
    color: '#10b981', // emerald-500
    badgeBg: 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300',
    textCol: 'text-emerald-600 dark:text-emerald-400',
  },
  lunch_out: {
    label: 'Salida a Almuerzo',
    short: 'Salida Almuerzo',
    color: '#f59e0b', // amber-500
    badgeBg: 'bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800 text-amber-800 dark:text-amber-300',
    textCol: 'text-amber-600 dark:text-amber-400',
  },
  lunch_in: {
    label: 'Entrada de Almuerzo',
    short: 'Regreso Almuerzo',
    color: '#0284c7', // sky-600
    badgeBg: 'bg-sky-50 dark:bg-sky-950/40 border-sky-300 dark:border-sky-800 text-sky-800 dark:text-sky-300',
    textCol: 'text-sky-600 dark:text-sky-400',
  },
  shift_out: {
    label: 'Salida del Trabajo',
    short: 'Salida Jornada',
    color: '#8b5cf6', // purple-500
    badgeBg: 'bg-purple-50 dark:bg-purple-950/40 border-purple-300 dark:border-purple-800 text-purple-800 dark:text-purple-300',
    textCol: 'text-purple-600 dark:text-purple-400',
  },
};

export function formatTime24(isoOrTimeStr: string): string {
  if (!isoOrTimeStr) return '--:--';
  if (isoOrTimeStr.length === 8 && isoOrTimeStr.includes(':')) {
    return isoOrTimeStr.slice(0, 5);
  }
  try {
    const d = new Date(isoOrTimeStr);
    if (isNaN(d.getTime())) return isoOrTimeStr;
    return d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', hour12: false });
  } catch {
    return isoOrTimeStr;
  }
}

export function formatFullTime(isoOrTimeStr: string): string {
  if (!isoOrTimeStr) return '--:--:--';
  try {
    const d = new Date(isoOrTimeStr);
    if (isNaN(d.getTime())) return isoOrTimeStr;
    return d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
  } catch {
    return isoOrTimeStr;
  }
}

export function formatDateSpanish(dateStr: string): string {
  if (!dateStr) return '';
  const [year, month, day] = dateStr.split('-').map(Number);
  const d = new Date(year, (month || 1) - 1, day || 1);
  return d.toLocaleDateString('es-ES', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export function getTodayDateStr(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getCurrentTimeStr(): string {
  const now = new Date();
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  return `${hours}:${minutes}:${seconds}`;
}

// Convert "HH:MM" to total minutes from midnight
export function timeStringToMinutes(timeStr: string): number {
  if (!timeStr) return 0;
  const parts = timeStr.split(':');
  const h = parseInt(parts[0] || '0', 10);
  const m = parseInt(parts[1] || '0', 10);
  return h * 60 + m;
}

// Format total minutes to "Xh Ym" or "0h 00m"
export function formatMinutesToHours(minutes: number): string {
  if (!minutes || minutes < 0) return '0h 00m';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h}h ${String(m).padStart(2, '0')}m`;
}

// Determine next logical event for employee based on today's logs
export function determineNextAttendanceEvent(
  employee: Employee,
  todayRecords: AttendanceRecord[]
): {
  suggestedType: 'morning_in' | 'lunch_out' | 'lunch_in' | 'shift_out';
  reason: string;
  isCompleted: boolean;
} {
  const hasMorningIn = todayRecords.some(r => r.type === 'morning_in');
  const hasLunchOut = todayRecords.some(r => r.type === 'lunch_out');
  const hasLunchIn = todayRecords.some(r => r.type === 'lunch_in');
  const hasShiftOut = todayRecords.some(r => r.type === 'shift_out');

  if (!hasMorningIn) {
    return {
      suggestedType: 'morning_in',
      reason: 'Primera marcación del día (Entrada Mañana)',
      isCompleted: false,
    };
  }
  if (!hasLunchOut) {
    return {
      suggestedType: 'lunch_out',
      reason: 'Marcación de inicio de pausa para almuerzo',
      isCompleted: false,
    };
  }
  if (!hasLunchIn) {
    return {
      suggestedType: 'lunch_in',
      reason: 'Marcación de retorno del almuerzo',
      isCompleted: false,
    };
  }
  if (!hasShiftOut) {
    return {
      suggestedType: 'shift_out',
      reason: 'Marcación de fin de jornada laboral',
      isCompleted: false,
    };
  }

  return {
    suggestedType: 'shift_out',
    reason: 'Todas las 4 marcaciones ya fueron registradas hoy.',
    isCompleted: true,
  };
}

// Compute if morning_in is late
export function checkIsLate(
  actualTimeStr: string,
  scheduledTimeStr: string,
  toleranceMinutes: number
): { isLate: boolean; delayMinutes: number } {
  const actualMinutes = timeStringToMinutes(actualTimeStr);
  const scheduledMinutes = timeStringToMinutes(scheduledTimeStr);
  const diff = actualMinutes - scheduledMinutes;

  if (diff > toleranceMinutes) {
    return { isLate: true, delayMinutes: diff };
  }
  return { isLate: false, delayMinutes: 0 };
}

// Build a daily summary row for an employee
export function buildDailySummary(
  employee: Employee,
  date: string,
  records: AttendanceRecord[]
): DailyEmployeeSummary {
  const empRecords = records.filter(
    r => r.employeeId === employee.id && r.date === date
  );

  const morningIn = empRecords.find(r => r.type === 'morning_in');
  const lunchOut = empRecords.find(r => r.type === 'lunch_out');
  const lunchIn = empRecords.find(r => r.type === 'lunch_in');
  const shiftOut = empRecords.find(r => r.type === 'shift_out');

  let lunchDurationMinutes = 0;
  if (lunchOut && lunchIn) {
    const tOut = timeStringToMinutes(lunchOut.time);
    const tIn = timeStringToMinutes(lunchIn.time);
    lunchDurationMinutes = Math.max(0, tIn - tOut);
  }

  // Calculate effective work minutes
  let effectiveWorkMinutes = 0;
  if (morningIn && shiftOut) {
    const tStart = timeStringToMinutes(morningIn.time);
    const tEnd = timeStringToMinutes(shiftOut.time);
    const grossMinutes = Math.max(0, tEnd - tStart);
    effectiveWorkMinutes = Math.max(0, grossMinutes - lunchDurationMinutes);
  } else if (morningIn && lunchOut && !shiftOut) {
    const tStart = timeStringToMinutes(morningIn.time);
    const tOut = timeStringToMinutes(lunchOut.time);
    effectiveWorkMinutes = Math.max(0, tOut - tStart);
  } else if (morningIn && !lunchOut && !shiftOut) {
    // Still in progress
    const tStart = timeStringToMinutes(morningIn.time);
    const nowMinutes = timeStringToMinutes(getCurrentTimeStr());
    if (date === getTodayDateStr()) {
      effectiveWorkMinutes = Math.max(0, Math.min(nowMinutes - tStart, 480));
    }
  }

  let status: DailyEmployeeSummary['status'] = 'absent';
  if (shiftOut) {
    status = 'completed';
  } else if (lunchOut && !lunchIn) {
    status = 'on_lunch';
  } else if (morningIn) {
    status = 'present';
  } else {
    status = 'absent';
  }

  const isTardy = morningIn?.isLate ?? false;
  const tardyMinutes = morningIn?.delayMinutes ?? 0;

  return {
    date,
    employee,
    morningIn,
    lunchOut,
    lunchIn,
    shiftOut,
    lunchDurationMinutes,
    effectiveWorkMinutes,
    status,
    isTardy,
    tardyMinutes,
  };
}

// Get dates of the week given an anchor date (Monday to Sunday)
export function getWeekDates(anchorDateStr: string): string[] {
  const [y, m, d] = anchorDateStr.split('-').map(Number);
  const current = new Date(y, m - 1, d);
  // In JS, Sunday is 0. We want Monday as start (1)
  const dayOfWeek = current.getDay();
  const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  
  const monday = new Date(current);
  monday.setDate(current.getDate() + diffToMonday);

  const dates: string[] = [];
  for (let i = 0; i < 7; i++) {
    const next = new Date(monday);
    next.setDate(monday.getDate() + i);
    const year = next.getFullYear();
    const month = String(next.getMonth() + 1).padStart(2, '0');
    const day = String(next.getDate()).padStart(2, '0');
    dates.push(`${year}-${month}-${day}`);
  }
  return dates;
}

// Get all dates in a month (YYYY-MM)
export function getMonthDates(yearMonthStr: string): string[] {
  const [yearStr, monthStr] = yearMonthStr.split('-');
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10);
  const numDays = new Date(year, month, 0).getDate();

  const dates: string[] = [];
  for (let d = 1; d <= numDays; d++) {
    const dayStr = String(d).padStart(2, '0');
    dates.push(`${year}-${String(month).padStart(2, '0')}-${dayStr}`);
  }
  return dates;
}
