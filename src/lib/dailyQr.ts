import QRCode from 'qrcode';
import type { Employee } from '../types/attendance';
import { getTodayDateStr } from '../utils/timeCalculations';

/**
 * Módulo de códigos QR diarios por colaborador.
 *
 * Formato del payload (JSON compacto, legible por el escáner):
 *   {"v":1,"id":"EMP-1001","doc":"12345678","name":"Juan Pérez","dep":"Operaciones","date":"2026-10-01"}
 *
 * El escáner acepta este JSON y valida que "date" sea la fecha actual:
 * un QR generado ayer ya no es válido hoy (evita reutilizar códigos impresos).
 */

export interface DailyQrPayload {
  v: 1;
  id: string;        // employee.id (e.g. "EMP-1001")
  doc: string;       // documentId (DNI/Cédula/RUT)
  name: string;      // "firstName lastName"
  dep: string;       // department
  date: string;      // YYYY-MM-DD (fecha del QR)
}

/** Construye el payload JSON del QR diario de un empleado para una fecha dada. */
export function buildDailyQrPayload(employee: Employee, dateStr: string = getTodayDateStr()): DailyQrPayload {
  return {
    v: 1,
    id: employee.id,
    doc: employee.documentId,
    name: `${employee.firstName} ${employee.lastName}`.trim(),
    dep: employee.department,
    date: dateStr,
  };
}

/** Serializa el payload como texto plano que irá dentro del código QR. */
export function serializeDailyQrPayload(payload: DailyQrPayload): string {
  return JSON.stringify(payload);
}

const DAILY_QR_KEYS: (keyof DailyQrPayload)[] = ['v', 'id', 'doc', 'name', 'dep', 'date'];

/**
 * Intenta interpretar un texto escaneado como QR diario.
 * Devuelve el payload parseado o null si no tiene el formato de QR diario
 * (así el escáner puede seguir aceptando también los códigos simples
 * "QR-EMP-1001", el id o el documento del empleado).
 */
export function parseDailyQrPayload(raw: string): DailyQrPayload | null {
  const trimmed = raw.trim();
  if (!trimmed.startsWith('{') || !trimmed.endsWith('}')) return null;
  try {
    const obj = JSON.parse(trimmed) as Record<string, unknown>;
    if (typeof obj !== 'object' || obj === null) return null;
    const isPlainObject = Object.keys(obj).length > 0 && DAILY_QR_KEYS.every(k => k in obj);
    if (!isPlainObject) return null;
    if (obj.v !== 1) return null;
    const payload: DailyQrPayload = {
      v: 1,
      id: String(obj.id ?? ''),
      doc: String(obj.doc ?? ''),
      name: String(obj.name ?? ''),
      dep: String(obj.dep ?? ''),
      date: String(obj.date ?? ''),
    };
    // Debe al menos traer id o doc para poder identificar al colaborador.
    if (!payload.id && !payload.doc) return null;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(payload.date)) return null;
    return payload;
  } catch {
    return null;
  }
}

/** Genera la imagen PNG del QR como data URL. */
export async function generateDailyQrDataUrl(
  employee: Employee,
  dateStr: string = getTodayDateStr()
): Promise<string> {
  const text = serializeDailyQrPayload(buildDailyQrPayload(employee, dateStr));
  return QRCode.toDataURL(text, {
    width: 320,
    margin: 1,
    color: { dark: '#0f172a', light: '#ffffff' },
    errorCorrectionLevel: 'M',
  });
}
