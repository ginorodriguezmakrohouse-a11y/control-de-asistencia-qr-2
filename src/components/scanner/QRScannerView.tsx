import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Camera, 
  CameraOff, 
  Sparkles, 
  Clock, 
  CheckCircle2, 
  AlertTriangle, 
  UserCheck, 
  ArrowRight, 
  Zap, 
  Search, 
  RefreshCw,
  QrCode,
  FileUp,
  History,
  XCircle,
  HelpCircle,
  SwitchCamera,
  ShieldCheck,
  CheckCircle,
  Info
} from 'lucide-react';
import { Html5Qrcode, Html5QrcodeScannerState } from 'html5-qrcode';

// Id del contenedor de video. Se usa un id único por instancia (UUID) en lugar
// de uno fijo: html5-qrcode busca el elemento con document.getElementById y,
// si hay dos lectores montados a la vez o restos de un montaje anterior
// (React StrictMode), el segundo "clear()" vaciaba el div del primero y la
// cámara quedaba en negro / fallaba al arrancar la cámara trasera.
const SCANNER_ELEMENT_ID = `qr-reader-${crypto.randomUUID()}`;
const FILE_DECODER_ELEMENT_ID = `qr-file-decoder-${crypto.randomUUID()}`;

// El navegador no siempre entrega la cámara trasera con facingMode:'environment'
// (en muchos Android Chrome devuelve la frontal). Esta heurística prioriza las
// cámaras traseras reportadas por enumerateDevices.
const isLikelyRearCamera = (label: string): boolean =>
  /(back|rear|atr[aá]s|trasera|environment)/i.test(label);

const rankCamerasForRear = (devices: Array<{ id: string; label: string }>): Array<{ id: string; label: string }> => {
  const scored = devices.map((d, index) => ({ d, index, score: isLikelyRearCamera(d.label) ? 0 : 1 }));
  return scored.sort((a, b) => a.score - b.score || a.index - b.index).map(s => s.d);
};
import confetti from 'canvas-confetti';
import { 
  AttendanceEventType, 
  AttendanceRecord, 
  Employee, 
  SystemConfig 
} from '../../types/attendance';
import { 
  checkIsLate, 
  determineNextAttendanceEvent, 
  EVENT_LABELS, 
  formatFullTime, 
  getCurrentTimeStr, 
  getTodayDateStr 
} from '../../utils/timeCalculations';
import { sounds } from '../../utils/audio';

interface QRScannerViewProps {
  employees: Employee[];
  records: AttendanceRecord[];
  config: SystemConfig;
  // Debe devolver una promesa que se resuelve cuando el registro quedó
  // persistido (Supabase y/o almacenamiento local). El escáner la espera
  // antes de cerrar la ventana del lector.
  onAddRecord: (record: AttendanceRecord) => Promise<void> | void;
}

export const QRScannerView: React.FC<QRScannerViewProps> = ({
  employees,
  records,
  config,
  onAddRecord,
}) => {
  // Scanner state
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [isStartingCamera, setIsStartingCamera] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<{ title: string; message: string; type: 'permission' | 'notFound' | 'inUse' | 'generic' } | null>(null);
  const [selectedCameraId, setSelectedCameraId] = useState<string>('');
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [cameras, setCameras] = useState<Array<{ id: string; label: string }>>([]);
  const [showDiagnostics, setShowDiagnostics] = useState<boolean>(false);
  const [permissionStatus, setPermissionStatus] = useState<string>('desconocido');

  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
  // Evita que dos intentos de arranque/parada se solapen (condición de carrera
  // que dejaba el lector en un estado inconsistente y la cámara "fallando").
  const cameraOperationLockRef = useRef<boolean>(false);

  // Manual or barcode input
  const [manualCode, setManualCode] = useState<string>('');
  const [selectedEventType, setSelectedEventType] = useState<AttendanceEventType | 'auto'>('auto');
  
  // Last scan feedback
  const [lastScanResult, setLastScanResult] = useState<{
    record: AttendanceRecord;
    employee: Employee;
    eventMeta: typeof EVENT_LABELS[keyof typeof EVENT_LABELS];
    message: string;
    isLate: boolean;
    delayMinutes: number;
  } | null>(null);

  const [scanCooldown, setScanCooldown] = useState<boolean>(false);
  // Estado de registro: true mientras el escaneo se persiste en Supabase.
  // Al completarse correctamente se CIERRA la ventana del lector (cámara).
  const [isRegistering, setIsRegistering] = useState<boolean>(false);
  // Controla si la "ventana" del lector de QR está abierta (visor de cámara
  // visible). Se cierra automáticamente al registrar una marcación.
  const [showReader, setShowReader] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [quickSearchTerm, setQuickSearchTerm] = useState<string>('');
  const [showSimDrawer, setShowSimDrawer] = useState<boolean>(true);

  // File upload scan ref
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Today's records for display
  const todayDateStr = getTodayDateStr();
  const todayRecords = records.filter(r => r.date === todayDateStr);

  // Check browser permissions if supported
  const checkPermissionState = useCallback(async () => {
    try {
      if (navigator.permissions && navigator.permissions.query) {
        const status = await navigator.permissions.query({ name: 'camera' as PermissionName });
        setPermissionStatus(status.state);
        status.onchange = () => {
          setPermissionStatus(status.state);
        };
      }
    } catch {
      setPermissionStatus('desconocido');
    }
  }, []);

  // Fetch list of camera devices
  const refreshCameras = useCallback(async () => {
    try {
      if (!navigator?.mediaDevices?.enumerateDevices) {
        return;
      }
      const devices = await Html5Qrcode.getCameras();
      if (devices && devices.length > 0) {
        const mapped = devices.map((d, index) => ({
          id: d.id,
          label: d.label || `Cámara ${index + 1} (${d.id.slice(0, 8)})`,
        }));
        setCameras(mapped);
        if (!selectedCameraId || !mapped.some(c => c.id === selectedCameraId)) {
          // Por defecto elegir la cámara TRASERA si está disponible
          // (rankCamerasForRear prioriza las etiquetas back/rear/atrás),
          // en lugar de la primera de la lista que suele ser la frontal.
          const preferred = facingMode === 'environment'
            ? rankCamerasForRear(mapped)[0]
            : mapped.find(c => !isLikelyRearCamera(c.label)) ?? mapped[0];
          setSelectedCameraId(preferred.id);
        }
      }
    } catch {
      // Permission might not yet be granted
    }
  }, [selectedCameraId, facingMode]);

  useEffect(() => {
    checkPermissionState();
    refreshCameras();
  }, [checkPermissionState, refreshCameras]);

  // Stop camera helper: detiene el video y LIBERA la cámara del dispositivo.
  const stopCamera = useCallback(async () => {
    if (html5QrCodeRef.current) {
      try {
        const state = html5QrCodeRef.current.getState();
        if (state === Html5QrcodeScannerState.SCANNING || state === Html5QrcodeScannerState.PAUSED) {
          await html5QrCodeRef.current.stop();
        }
        html5QrCodeRef.current.clear();
      } catch (err) {
        console.warn('Error clearing scanner:', err);
      }
      html5QrCodeRef.current = null;
    }
    setIsScanning(false);
    setIsStartingCamera(false);
  }, []);

  // "Cerrar la ventana del lector de QR": deja de mostrar el visor de la
  // cámara y muestra una tarjeta de confirmación con botón para volver a
  // escanear. La cámara se detiene aparte (stopCamera) para liberarla.
  const closeReaderWindow = useCallback(() => {
    setShowReader(false);
  }, []);

  // Reanudar el decodificador tras un escaneo NO registrado (código no
  // reconocido, empleado desactivado o error de red): la cámara sigue viva,
  // solo habíamos pausado la lectura de frames para evitar duplicados.
  const resumeDecodingIfPaused = useCallback(async () => {
    const inst = html5QrCodeRef.current;
    if (!inst) return;
    try {
      if (inst.getState() === Html5QrcodeScannerState.PAUSED) {
        await inst.resume();
      }
    } catch {
      // Si resume falla, el usuario puede reactivar la cámara manualmente.
    }
  }, []);

  // Process a QR code or employee ID string
  const handleProcessScan = useCallback(async (payload: string) => {
    if (scanCooldown || isRegistering) return;
    const cleanPayload = payload.trim();
    if (!cleanPayload) return;

    // Pausar el decodificador inmediatamente: evita que la misma persona
    // frente a la cámara genere escaneos duplicados mientras se registra.
    const pauseDecoding = async () => {
      try {
        const inst = html5QrCodeRef.current;
        if (inst && inst.getState() === Html5QrcodeScannerState.SCANNING) {
          await inst.pause(true);
        }
      } catch {
        // Si pausa falla, el cierre/registro posterior lo controla igual.
      }
    };
    await pauseDecoding();

    // Search employee by qrPayload, id, or documentId (solo coincidencia exacta:
    // el "includes" laxo podía hacer match con el empleado equivocado).
    const lp = cleanPayload.toLowerCase();
    const codeMatch = lp.match(/(?:code|qr|id)=([^&\s]+)/);
    const matchedEmployee = employees.find(
      e => 
        e.qrPayload.toLowerCase() === lp ||
        e.id.toLowerCase() === lp ||
        e.documentId.toLowerCase() === lp ||
        // tolerar QR que envuelve el payload, p.ej. "https://...?code=QR-EMP-1001"
        (!!codeMatch && (
          codeMatch[1] === e.qrPayload.toLowerCase() ||
          codeMatch[1] === e.id.toLowerCase() ||
          codeMatch[1] === e.documentId.toLowerCase()
        ))
    );

    if (!matchedEmployee) {
      if (config.soundEnabled) sounds.playError();
      setErrorMessage(`Código QR "${cleanPayload}" no reconocido en el sistema.`);
      setTimeout(() => setErrorMessage(null), 4000);
      // No se registró nada: reanudar la lectura para permitir otro escaneo.
      await resumeDecodingIfPaused();
      return;
    }

    if (!matchedEmployee.active) {
      if (config.soundEnabled) sounds.playError();
      setErrorMessage(`El empleado ${matchedEmployee.firstName} ${matchedEmployee.lastName} se encuentra DESACTIVADO.`);
      setTimeout(() => setErrorMessage(null), 4000);
      await resumeDecodingIfPaused();
      return;
    }

    // Determine event type
    const empTodayRecords = todayRecords.filter(r => r.employeeId === matchedEmployee.id);
    let eventTypeToRegister: AttendanceEventType;

    if (selectedEventType === 'auto') {
      const nextDecision = determineNextAttendanceEvent(matchedEmployee, empTodayRecords);
      eventTypeToRegister = nextDecision.suggestedType;
    } else {
      eventTypeToRegister = selectedEventType;
    }

    const currentTime = getCurrentTimeStr();
    const nowIso = new Date().toISOString();

    // Check if late for morning entry
    let isLate = false;
    let delayMinutes = 0;
    if (eventTypeToRegister === 'morning_in') {
      const lateCheck = checkIsLate(
        currentTime,
        matchedEmployee.schedule.entryTime,
        matchedEmployee.schedule.toleranceMinutes
      );
      isLate = lateCheck.isLate;
      delayMinutes = lateCheck.delayMinutes;
    }

    const newRecord: AttendanceRecord = {
      // randomUUID evita colisiones de PRIMARY KEY al marcar dos terminales
      // el mismo milisegundo (Date.now() era predecible/duplicable).
      id: (typeof crypto !== 'undefined' && 'randomUUID' in crypto)
        ? `REC-${crypto.randomUUID()}`
        : `REC-${Date.now()}-${Math.random().toString(36).slice(2, 10)}-${matchedEmployee.id}`,
      employeeId: matchedEmployee.id,
      employeeName: `${matchedEmployee.firstName} ${matchedEmployee.lastName}`,
      employeeDocument: matchedEmployee.documentId,
      department: matchedEmployee.department,
      avatarUrl: matchedEmployee.avatarUrl,
      type: eventTypeToRegister,
      timestamp: nowIso,
      date: todayDateStr,
      time: currentTime,
      isLate,
      delayMinutes,
      terminalName: 'Terminal Principal RR.HH',
    };

    // === PASO 1: Registrar la entrada/salida en Supabase (vía onAddRecord,
    // que persiste en attendance_records y hace fallback local). El escáner
    // ESPERA a que el registro se confirme antes de cerrar el lector. ===
    setIsRegistering(true);
    try {
      await Promise.resolve(onAddRecord(newRecord));
    } catch (err) {
      console.error('Error al registrar la marcación:', err);
      if (config.soundEnabled) sounds.playError();
      setErrorMessage('No se pudo guardar la marcación (error de conexión con Supabase). Inténtalo de nuevo.');
      setTimeout(() => setErrorMessage(null), 5000);
      setIsRegistering(false);
      // La cámara sigue abierta: reanudar la lectura para poder reintentar.
      await resumeDecodingIfPaused();
      return;
    }
    setIsRegistering(false);

    // Audio & Visual feedback
    if (config.soundEnabled) {
      if (isLate) {
        sounds.playWarning();
      } else {
        sounds.playSuccess();
      }
    }

    // Small celebratory confetti for on-time morning entry
    if (eventTypeToRegister === 'morning_in' && !isLate) {
      try {
        confetti({
          particleCount: 25,
          spread: 40,
          origin: { y: 0.7 },
        });
      } catch {
        // ignore
      }
    }

    setLastScanResult({
      record: newRecord,
      employee: matchedEmployee,
      eventMeta: EVENT_LABELS[eventTypeToRegister],
      message: isLate 
        ? `Tardanza registrada (+${delayMinutes} min sobre tolerancia)`
        : '¡Marcación registrada correctamente!',
      isLate,
      delayMinutes,
    });

    setErrorMessage(null);
    setManualCode('');

    // === PASO 2: Una vez registrado el dato, CERRAR la ventana del lector
    // de código QR: se detiene y libera la cámara y se oculta el visor,
    // mostrando la tarjeta de confirmación con botón "Escanear otro". ===
    await stopCamera();
    closeReaderWindow();

    // Prevent immediate double scan (1.8s cooldown)
    setScanCooldown(true);
    setTimeout(() => {
      setScanCooldown(false);
    }, 1800);
  }, [
    scanCooldown,
    isRegistering,
    employees,
    todayRecords,
    selectedEventType,
    config.soundEnabled,
    todayDateStr,
    onAddRecord,
    stopCamera,
    closeReaderWindow,
    resumeDecodingIfPaused,
  ]);

  // Handle hardware USB barcode / QR scanner keystrokes
  useEffect(() => {
    let buffer = '';
    let lastKeyTime = Date.now();

    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't capture when typing in text inputs or textareas
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
        return;
      }

      const currentTime = Date.now();
      if (currentTime - lastKeyTime > 300) {
        buffer = '';
      }
      lastKeyTime = currentTime;

      if (e.key === 'Enter') {
        if (buffer.length >= 3) {
          handleProcessScan(buffer);
          buffer = '';
        }
      } else if (e.key.length === 1) {
        buffer += e.key;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleProcessScan]);

  // Robust camera starter with cascade fallback
  const startCamera = async (targetFacingMode: 'environment' | 'user' = facingMode, targetCameraId?: string) => {
    // Bloqueo anti-solapamiento: si el usuario pulsa "Activar"/"Reintentar"
    // varias veces, los intentos concurrentes dejaban al lector en un estado
    // inconsistente (cámara iniciada dos veces / track fantasma).
    if (cameraOperationLockRef.current) {
      return;
    }
    cameraOperationLockRef.current = true;
    setCameraError(null);
    setIsStartingCamera(true);

    try {
      // 1. Verify browser supports mediaDevices (getUserMedia solo funciona en
      //    contexto seguro: HTTPS o localhost).
      if (!window.isSecureContext || !navigator?.mediaDevices?.getUserMedia) {
        setCameraError({
          title: window.isSecureContext ? 'Cámara no soportada en este navegador' : 'Se requiere una conexión segura (HTTPS)',
          message: 'Tu navegador o conexión actual no permite acceso directo a la cámara (se requiere conexión HTTPS o localhost). Puedes utilizar el ingreso manual, pistolas USB o subir la imagen del QR.',
          type: 'generic',
        });
        return;
      }

      // Clean previous instance if active
      if (html5QrCodeRef.current) {
        await stopCamera();
      }

      const container = document.getElementById(SCANNER_ELEMENT_ID);
      if (!container) {
        throw new Error('Elemento contenedor del lector no encontrado');
      }
      // Ensure container is clean
      container.innerHTML = '';

      const qrScanner = new Html5Qrcode(SCANNER_ELEMENT_ID, { verbose: false });
      html5QrCodeRef.current = qrScanner;

      const scanConfig = {
        fps: 15,
        qrbox: (viewfinderWidth: number, viewfinderHeight: number) => {
          const minEdge = Math.min(viewfinderWidth, viewfinderHeight);
          const edgeSize = Math.max(160, Math.floor(minEdge * 0.72));
          return { width: edgeSize, height: edgeSize };
        },
        // Refuerza la solicitud de cámara trasera cuando el navegador lo admite
        videoConstraints: { facingMode: targetFacingMode },
      };

      const onScanSuccess = (decodedText: string) => {
        handleProcessScan(decodedText);
      };

      const onScanError = () => {
        // Frame-by-frame scanner errors are normal when no QR is in view
      };

      let startedSuccessfully = false;

      // Attempt 1: Target camera ID if explicitly provided or selected.
      // Si se pidió la cámara trasera y hay varias, priorizar la etiquetada
      // como back/rear/atrás: con facingMode:'environment' muchos navegadores
      // (p. ej. Chrome en Android) devuelven igualmente la frontal.
      let camIdToTry = targetCameraId || (selectedCameraId && selectedCameraId.length > 5 ? selectedCameraId : null);
      if (camIdToTry && targetFacingMode === 'environment' && cameras.length > 1) {
        const current = cameras.find(c => c.id === camIdToTry);
        if (current && !isLikelyRearCamera(current.label)) {
          const rear = rankCamerasForRear(cameras)[0];
          if (rear && isLikelyRearCamera(rear.label)) {
            camIdToTry = rear.id;
            setSelectedCameraId(rear.id);
          }
        }
      }

      if (camIdToTry) {
        try {
          await qrScanner.start(camIdToTry, scanConfig, onScanSuccess, onScanError);
          startedSuccessfully = true;
        } catch (specificError) {
          console.warn('Attempt with specific camera ID failed, falling back to facingMode:', specificError);
        }
      }

      // Attempt 2: Facing mode (environment / rear)
      if (!startedSuccessfully) {
        try {
          await qrScanner.start({ facingMode: targetFacingMode }, scanConfig, onScanSuccess, onScanError);
          startedSuccessfully = true;
        } catch (facingError) {
          console.warn(`Attempt with ${targetFacingMode} failed, falling back:`, facingError);
        }
      }

      // Attempt 3: Opposite facing mode (front / webcam)
      if (!startedSuccessfully) {
        const oppositeMode = targetFacingMode === 'environment' ? 'user' : 'environment';
        try {
          await qrScanner.start({ facingMode: oppositeMode }, scanConfig, onScanSuccess, onScanError);
          setFacingMode(oppositeMode);
          startedSuccessfully = true;
        } catch (oppositeError) {
          console.warn(`Attempt with ${oppositeMode} failed, falling back to any camera:`, oppositeError);
        }
      }

      // Attempt 4: Direct fallback to default video device
      if (!startedSuccessfully) {
        // Request any camera stream directly
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        // Release direct stream and start with facingMode 'user'
        stream.getTracks().forEach(t => t.stop());
        await qrScanner.start({ facingMode: 'user' }, scanConfig, onScanSuccess, onScanError);
        startedSuccessfully = true;
      }

      setIsScanning(true);
      setPermissionStatus('granted');
      // La cámara es la "ventana del lector": al encenderse, el visor vuelve
      // a mostrarse (p. ej. tras cerrarse automáticamente al registrar).
      setShowReader(true);

      // Refresh camera labels now that permission is granted
      refreshCameras();
    } catch (err: unknown) {
      console.error('Camera startup error:', err);
      setIsScanning(false);

      // Liberar cualquier instancia a medio iniciar para no dejar la cámara
      // "secuestrada" (NotReadableError en el siguiente intento).
      if (html5QrCodeRef.current) {
        try {
          await html5QrCodeRef.current.stop();
        } catch {
          // ignore
        }
        try {
          html5QrCodeRef.current.clear();
        } catch {
          // ignore
        }
        html5QrCodeRef.current = null;
      }

      const errorStr = String(err);
      if (errorStr.includes('NotAllowedError') || errorStr.includes('PermissionDeniedError') || errorStr.includes('denied')) {
        setPermissionStatus('denied');
        setCameraError({
          title: 'Permiso de Cámara Denegado',
          message: 'El navegador bloqueó el acceso a la cámara. Haz clic en el ícono del candado o cámara en la barra de direcciones de tu navegador, selecciona "Permitir" para la cámara y luego pulsa "Reintentar".',
          type: 'permission',
        });
      } else if (errorStr.includes('NotFoundError') || errorStr.includes('DevicesNotFoundError')) {
        setCameraError({
          title: 'No se detectó ninguna cámara',
          message: 'No encontramos ninguna cámara web conectada al dispositivo. Puedes usar la entrada manual, pistola USB o subir una imagen de QR.',
          type: 'notFound',
        });
      } else if (errorStr.includes('NotReadableError') || errorStr.includes('TrackStartError') || errorStr.includes('could not start video source')) {
        setCameraError({
          title: 'Cámara en uso por otra aplicación',
          message: 'La cámara parece estar ocupada por otra app (Zoom, Google Meet, Teams u otra pestaña del navegador). Cierra esas aplicaciones y pulsa "Reintentar".',
          type: 'inUse',
        });
      } else if (errorStr.includes('OverconstrainedError')) {
        setCameraError({
          title: 'La cámara trasera no está disponible',
          message: 'El dispositivo no expone una cámara trasera accesible desde el navegador, o el identificador de cámara cambió. Prueba con "Probar con otra cámara" o selecciónala en el desplegable.',
          type: 'notFound',
        });
      } else {
        setCameraError({
          title: 'Error de Conexión de Cámara',
          message: `No se pudo iniciar el lector: ${err instanceof Error ? err.message : errorStr}. Prueba con el botón "Cambiar Cámara" o revisa el diagnóstico.`,
          type: 'generic',
        });
      }
    } finally {
      setIsStartingCamera(false);
      cameraOperationLockRef.current = false;
    }
  };

  // Flip camera between front (user) and back (environment)
  const handleToggleFacingMode = async () => {
    const newFacing = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(newFacing);
    // No vaciar selectedCameraId: startCamera re-prioriza automáticamente la
    // cámara adecuada para el nuevo modo (trasera/frontal) según las etiquetas.
    if (isScanning) {
      await stopCamera();
      startCamera(newFacing);
    }
  };

  // Change specific camera from dropdown
  const handleCameraChange = async (cameraId: string) => {
    setSelectedCameraId(cameraId);
    // Sincronizar el indicador frontal/trasera con la cámara elegida
    const chosen = cameras.find(c => c.id === cameraId);
    if (chosen) {
      setFacingMode(isLikelyRearCamera(chosen.label) ? 'environment' : 'user');
    }
    if (isScanning) {
      await stopCamera();
      startCamera(facingMode, cameraId);
    } else {
      // Si la ventana del lector estaba cerrada (tras un registro), al
      // cambiar de cámara se vuelve a abrir su visor.
      setShowReader(true);
    }
  };

  // Cleanup on unmount: detener e limpiar SIEMPRE (antes solo se hacía si
  // estaba escaneando, dejando tracks de cámara vivos al cambiar de vista).
  useEffect(() => {
    return () => {
      if (html5QrCodeRef.current) {
        try {
          const state = html5QrCodeRef.current.getState();
          if (state === Html5QrcodeScannerState.SCANNING || state === Html5QrcodeScannerState.PAUSED) {
            html5QrCodeRef.current.stop().then(() => {
              try {
                html5QrCodeRef.current?.clear();
              } catch {
                // ignore
              }
              html5QrCodeRef.current = null;
            }).catch(() => {
              html5QrCodeRef.current = null;
            });
          } else {
            html5QrCodeRef.current.clear();
            html5QrCodeRef.current = null;
          }
        } catch {
          // ignore
        }
      }
    };
  }, []);

  // File upload QR decoder using an off-screen isolated decoder
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      // Use isolated off-screen element id (único por instancia, ver nota arriba)
      let fileDecoder = document.getElementById(FILE_DECODER_ELEMENT_ID);
      if (!fileDecoder) {
        fileDecoder = document.createElement('div');
        fileDecoder.id = FILE_DECODER_ELEMENT_ID;
        fileDecoder.style.display = 'none';
        document.body.appendChild(fileDecoder);
      }

      const html5QrCode = new Html5Qrcode(FILE_DECODER_ELEMENT_ID);
      const result = await html5QrCode.scanFile(file, true);
      handleProcessScan(result);
      html5QrCode.clear();
    } catch (err) {
      console.warn('File decode error:', err);
      setErrorMessage('No se encontró un código QR legible en la imagen seleccionada. Asegúrate de que esté bien iluminada y enfocada.');
      setTimeout(() => setErrorMessage(null), 4000);
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Filter employees for quick simulation drawer
  const filteredQuickEmployees = employees.filter(e => {
    const term = quickSearchTerm.toLowerCase();
    return (
      e.firstName.toLowerCase().includes(term) ||
      e.lastName.toLowerCase().includes(term) ||
      e.documentId.toLowerCase().includes(term) ||
      e.id.toLowerCase().includes(term) ||
      e.department.toLowerCase().includes(term)
    );
  });

  return (
    <div className="space-y-6">
      {/* Top Banner / Mode Controls */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-6 shadow-xl">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <span className="p-1.5 bg-emerald-500/20 text-emerald-400 rounded-lg">
                <QrCode className="w-5 h-5" />
              </span>
              Puesto de Marcación RR.HH
            </h2>
            <p className="text-sm text-slate-400 mt-1">
              Escanea el código QR del carnet del empleado, usa una pistola de código de barras USB o prueba con el simulador.
            </p>
          </div>

          {/* Event Type Selector (Auto vs Manual) */}
          <div className="flex flex-wrap items-center gap-2 bg-slate-950 p-1.5 rounded-xl border border-slate-800">
            <span className="text-xs font-semibold text-slate-400 px-2 flex items-center gap-1">
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              Tipo de Marcación:
            </span>
            <button
              onClick={() => setSelectedEventType('auto')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                selectedEventType === 'auto'
                  ? 'bg-emerald-500 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Auto Inteligente</span>
            </button>
            <button
              onClick={() => setSelectedEventType('morning_in')}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                selectedEventType === 'morning_in'
                  ? 'bg-emerald-500 text-slate-950 font-bold'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              1. Entrada Mañana
            </button>
            <button
              onClick={() => setSelectedEventType('lunch_out')}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                selectedEventType === 'lunch_out'
                  ? 'bg-amber-500 text-slate-950 font-bold'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              2. Salida Almuerzo
            </button>
            <button
              onClick={() => setSelectedEventType('lunch_in')}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                selectedEventType === 'lunch_in'
                  ? 'bg-sky-500 text-slate-950 font-bold'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              3. Regreso Almuerzo
            </button>
            <button
              onClick={() => setSelectedEventType('shift_out')}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                selectedEventType === 'shift_out'
                  ? 'bg-purple-500 text-slate-950 font-bold'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              4. Salida Fin
            </button>
          </div>
        </div>

        {/* Status indicator bar */}
        <div className="mt-4 pt-3 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5">
              <span className={`w-2.5 h-2.5 rounded-full ${
                isScanning ? 'bg-emerald-400 animate-ping' : isStartingCamera ? 'bg-amber-400 animate-pulse' : 'bg-slate-600'
              }`} />
              {isScanning ? (
                <span className="text-emerald-400 font-semibold">Cámara conectada ({facingMode === 'environment' ? 'Trasera' : 'Frontal'})</span>
              ) : isStartingCamera ? (
                <span className="text-amber-400 font-semibold">Conectando cámara...</span>
              ) : (
                'Cámara apagada'
              )}
            </span>
            <span>•</span>
            <span className="text-slate-300">
              Pistola USB: <span className="text-emerald-400 font-mono font-medium">Lista (autodetección)</span>
            </span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowDiagnostics(!showDiagnostics)}
              className="text-xs text-slate-400 hover:text-slate-200 flex items-center gap-1 font-medium transition-colors"
            >
              <Info className="w-3.5 h-3.5 text-cyan-400" />
              <span>{showDiagnostics ? 'Ocultar Diagnóstico' : 'Diagnóstico de Cámara'}</span>
            </button>
            <span>•</span>
            <button
              onClick={() => setShowSimDrawer(!showSimDrawer)}
              className="text-xs text-emerald-400 hover:text-emerald-300 flex items-center gap-1 font-semibold underline underline-offset-4"
            >
              {showSimDrawer ? 'Ocultar Simulador Rápido' : 'Mostrar Simulador Rápido'}
            </button>
          </div>
        </div>
      </div>

      {/* Camera Diagnostic Box if open */}
      {showDiagnostics && (
        <div className="bg-slate-900 border border-cyan-500/30 rounded-2xl p-5 shadow-xl animate-fade-in text-xs space-y-3">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <h4 className="font-bold text-white flex items-center gap-2 text-sm">
              <ShieldCheck className="w-4 h-4 text-cyan-400" />
              Diagnóstico de Conexión de Cámara
            </h4>
            <button
              onClick={() => {
                checkPermissionState();
                refreshCameras();
              }}
              className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg flex items-center gap-1 font-mono text-[11px]"
            >
              <RefreshCw className="w-3 h-3 text-cyan-400" /> Refrescar Sensores
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
              <span className="text-slate-500 block text-[10px] uppercase font-bold">Protocolo Seguro</span>
              <p className="font-mono font-bold text-emerald-400 mt-0.5 flex items-center gap-1">
                <CheckCircle className="w-3.5 h-3.5" />
                {window.isSecureContext ? 'HTTPS / Localhost (Válido)' : 'Inseguro (Requiere HTTPS)'}
              </p>
            </div>

            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
              <span className="text-slate-500 block text-[10px] uppercase font-bold">Estado de Permisos</span>
              <p className={`font-mono font-bold mt-0.5 capitalize flex items-center gap-1 ${
                permissionStatus === 'granted' ? 'text-emerald-400' : permissionStatus === 'denied' ? 'text-rose-400' : 'text-amber-400'
              }`}>
                {permissionStatus === 'granted' && <CheckCircle className="w-3.5 h-3.5" />}
                {permissionStatus === 'denied' && <XCircle className="w-3.5 h-3.5" />}
                {permissionStatus === 'prompt' && <Clock className="w-3.5 h-3.5" />}
                {permissionStatus === 'granted' ? 'Permiso Concedido' : permissionStatus === 'denied' ? 'Bloqueado por Usuario' : 'Pendiente de Aprobación'}
              </p>
            </div>

            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
              <span className="text-slate-500 block text-[10px] uppercase font-bold">Cámaras Físicas Detectadas</span>
              <p className="font-mono font-bold text-white mt-0.5">
                {cameras.length} dispositivo(s)
              </p>
            </div>
          </div>

          <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-xl space-y-1.5 text-slate-300 text-[11px]">
            <p className="font-bold text-cyan-300">Guía rápida de resolución si la cámara no abre:</p>
            <ul className="list-disc pl-4 space-y-1 text-slate-400">
              <li><strong>Si dice Permiso Denegado:</strong> En Chrome/Edge/Safari, haz clic en el ícono de candado junto a la URL arriba a la izquierda y cambia Cámara a &quot;Permitir&quot;. Luego pulsa &quot;Activar Cámara&quot;.</li>
              <li><strong>Si la pantalla queda en negro:</strong> Asegúrate de que ninguna otra app (Zoom, Teams, Meet) esté utilizando tu cámara web.</li>
              <li><strong>Alternativas:</strong> Puedes usar el simulador de 1-click, ingresar el código de empleado manualmente o conectar cualquier lector de códigos de barras USB.</li>
            </ul>
          </div>
        </div>
      )}

      {/* Main Grid: Scanner Left / Live Result Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Live Camera & Manual Input (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl">
            
            {/* Camera Header controls */}
            <div className="flex items-center justify-between mb-3 gap-2">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <Camera className="w-4 h-4 text-emerald-400" />
                Lector de Cámara QR
              </h3>
              
              <div className="flex items-center gap-1.5">
                {/* Flip camera front/back */}
                <button
                  onClick={handleToggleFacingMode}
                  title={`Cambiar a cámara ${facingMode === 'environment' ? 'frontal' : 'trasera'}`}
                  className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors"
                >
                  <SwitchCamera className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="hidden sm:inline text-[10px]">{facingMode === 'environment' ? 'Trasera' : 'Frontal'}</span>
                </button>

                {/* Multiple camera dropdown if available */}
                {cameras.length > 1 && (
                  <select
                    value={selectedCameraId}
                    onChange={(e) => handleCameraChange(e.target.value)}
                    className="text-xs bg-slate-950 text-slate-300 border border-slate-700 rounded-lg px-2 py-1 max-w-[130px] truncate"
                  >
                    {cameras.map(c => (
                      <option key={c.id} value={c.id}>{c.label}</option>
                    ))}
                  </select>
                )}
              </div>
            </div>

            {/* Video Container: la "ventana del lector" se muestra solo si showReader.
                Tras registrar con éxito en Supabase se cierra automáticamente
                y aparece la tarjeta de confirmación. */}
            {showReader ? (
            <div className="relative bg-slate-950 rounded-xl overflow-hidden border border-slate-800 min-h-[300px] flex flex-col items-center justify-center">

              {/* HTML5-QRCode mount node (id único por instancia) */}
              <div
                id={SCANNER_ELEMENT_ID}
                className="w-full min-h-[300px] [&_video]:w-full [&_video]:h-full [&_video]:min-h-[300px] [&_video]:object-cover"
              />

              {/* Scanning Reticle Overlay (solo con cámara escaneando) */}
              {isScanning && !isRegistering && (
                <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                  <div className="w-56 h-56 border-2 border-emerald-400/80 rounded-2xl relative shadow-[0_0_25px_rgba(16,185,129,0.35)]">
                    <div className="absolute top-0 left-0 w-4 h-4 border-t-4 border-l-4 border-emerald-400 -mt-1 -ml-1" />
                    <div className="absolute top-0 right-0 w-4 h-4 border-t-4 border-r-4 border-emerald-400 -mt-1 -mr-1" />
                    <div className="absolute bottom-0 left-0 w-4 h-4 border-b-4 border-l-4 border-emerald-400 -mb-1 -ml-1" />
                    <div className="absolute bottom-0 right-0 w-4 h-4 border-b-4 border-r-4 border-emerald-400 -mb-1 -mr-1" />
                    <div className="w-full h-0.5 bg-gradient-to-r from-transparent via-emerald-400 to-transparent animate-bounce mt-24 opacity-80" />
                  </div>
                </div>
              )}

              {/* Registrando en Supabase... (código detectado, esperando confirmación) */}
              {isRegistering && (
                <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center bg-slate-950/80 backdrop-blur-xs">
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-12 h-12 border-3 border-emerald-400 border-t-transparent rounded-full animate-spin" />
                    <p className="text-sm font-bold text-white">Registrando marcación en Supabase...</p>
                    <p className="text-xs text-slate-400 max-w-xs">
                      Guardando la entrada/salida. La ventana del lector se cerrará al confirmar.
                    </p>
                  </div>
                </div>
              )}

              {/* Cámara apagada: pantalla de inicio dentro del visor */}
              {!isScanning && !isStartingCamera && !isRegistering && (
                <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center bg-slate-950/95 backdrop-blur-xs">
                  <div className="w-16 h-16 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center mb-3 text-slate-400">
                    <CameraOff className="w-8 h-8 text-slate-400" />
                  </div>
                  <h4 className="text-base font-bold text-white">Cámara Lista para Conectar</h4>
                  <p className="text-xs text-slate-400 max-w-xs mt-1 mb-4">
                    Presiona el botón para encender la cámara y registrar la asistencia de los empleados escaneando su QR.
                  </p>
                  <div className="flex flex-wrap items-center justify-center gap-2">
                    <button
                      onClick={() => startCamera(facingMode)}
                      className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm rounded-xl shadow-lg shadow-emerald-500/25 flex items-center gap-2 transition-all active:scale-95"
                    >
                      <Camera className="w-4 h-4" />
                      Activar Cámara
                    </button>
                    <button
                      onClick={handleToggleFacingMode}
                      className="px-3 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-semibold text-xs rounded-xl flex items-center gap-1.5 transition-all"
                    >
                      <SwitchCamera className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Modo: {facingMode === 'environment' ? 'Trasera' : 'Frontal'}</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
            ) : (
              /* Ventana del lector CERRADA tras registrar: tarjeta de
                 confirmación con acceso rápido para volver a escanear. */
              <div className="bg-slate-950 rounded-xl border border-emerald-500/30 min-h-[300px] flex flex-col items-center justify-center p-6 text-center animate-fade-in">
                <div className="w-16 h-16 rounded-2xl bg-emerald-500/15 border border-emerald-500/40 flex items-center justify-center mb-3">
                  <CheckCircle2 className="w-8 h-8 text-emerald-400" />
                </div>
                <h4 className="text-base font-bold text-white">Marcación registrada correctamente</h4>
                <p className="text-xs text-slate-400 max-w-xs mt-1 mb-4">
                  El registro de entrada/salida se guardó en Supabase y la ventana del lector de código QR se cerró.
                </p>
                {lastScanResult && (
                  <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-bold mb-4 ${lastScanResult.eventMeta.badgeBg}`}>
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: lastScanResult.eventMeta.color }} />
                    <span>{lastScanResult.employee.firstName} {lastScanResult.employee.lastName}</span>
                    <span>•</span>
                    <span>{lastScanResult.eventMeta.label} ({lastScanResult.record.time})</span>
                  </div>
                )}
                <button
                  onClick={() => startCamera(facingMode)}
                  disabled={isStartingCamera}
                  className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-bold text-sm rounded-xl shadow-lg shadow-emerald-500/25 flex items-center gap-2 transition-all active:scale-95"
                >
                  <Camera className="w-4 h-4" />
                  {isStartingCamera ? 'Iniciando...' : 'Escanear otro código QR'}
                </button>
              </div>
            )}

            {/* Camera action buttons */}
            <div className="mt-3 flex items-center gap-2">
              {isScanning ? (
                <button
                  onClick={stopCamera}
                  className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 text-rose-400 border border-slate-700 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all"
                >
                  <CameraOff className="w-3.5 h-3.5" />
                  Pausar Cámara
                </button>
              ) : (
                <button
                  onClick={() => startCamera(facingMode)}
                  disabled={isStartingCamera}
                  className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all"
                >
                  <Camera className="w-3.5 h-3.5" />
                  {isStartingCamera ? 'Iniciando...' : 'Iniciar Cámara'}
                </button>
              )}

              {/* Upload file fallback */}
              <input
                type="file"
                ref={fileInputRef}
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                title="Subir foto o captura de un código QR"
                className="p-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl text-slate-300 text-xs font-medium flex items-center gap-1"
              >
                <FileUp className="w-4 h-4 text-emerald-400" />
                <span>Subir QR</span>
              </button>
            </div>

            {/* Error diagnosis banner if camera failed */}
            {cameraError && (
              <div className="mt-3 p-3.5 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs space-y-2">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
                  <div>
                    <h5 className="font-bold text-rose-300">{cameraError.title}</h5>
                    <p className="text-slate-300 text-[11px] mt-0.5 leading-relaxed">{cameraError.message}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-1 border-t border-rose-500/20">
                  <button
                    onClick={() => startCamera(facingMode === 'environment' ? 'user' : 'environment')}
                    className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-[11px] font-semibold flex items-center gap-1"
                  >
                    <SwitchCamera className="w-3 h-3 text-cyan-400" /> Probar con otra cámara
                  </button>
                  <button
                    onClick={() => startCamera(facingMode)}
                    className="px-2.5 py-1 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-[11px] font-bold"
                  >
                    Reintentar Conexión
                  </button>
                </div>
              </div>
            )}

            {/* Manual input / USB Gun input */}
            <div className="mt-5 pt-4 border-t border-slate-800">
              <label className="text-xs font-bold text-slate-400 block mb-1.5 uppercase tracking-wider">
                Ingreso manual o lector de código de barras:
              </label>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleProcessScan(manualCode);
                }}
                className="flex items-center gap-2"
              >
                <div className="relative flex-1">
                  <input
                    type="text"
                    value={manualCode}
                    onChange={(e) => setManualCode(e.target.value)}
                    placeholder="Ej. QR-EMP-1001 o DNI / Código..."
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 font-mono"
                  />
                  {manualCode && (
                    <button
                      type="button"
                      onClick={() => setManualCode('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                    >
                      <XCircle className="w-4 h-4" />
                    </button>
                  )}
                </div>
                <button
                  type="submit"
                  disabled={!manualCode.trim()}
                  className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-bold text-xs rounded-xl transition-all"
                >
                  Registrar
                </button>
              </form>
              <p className="text-[11px] text-slate-500 mt-1 flex items-center gap-1">
                <HelpCircle className="w-3 h-3 text-slate-600" />
                Los lectores de código de barras USB ingresan el código automáticamente.
              </p>
            </div>
          </div>
        </div>

        {/* Right Column: Hero Result & Recent Feed (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          
          {/* Error Banner if any */}
          {errorMessage && (
            <div className="p-4 bg-rose-500/10 border-2 border-rose-500/40 rounded-2xl flex items-center gap-3 text-rose-300 animate-shake">
              <XCircle className="w-6 h-6 text-rose-400 shrink-0" />
              <div>
                <p className="font-bold text-sm">Error en el Escaneo</p>
                <p className="text-xs">{errorMessage}</p>
              </div>
            </div>
          )}

          {/* Last Scanned Employee Hero Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl relative overflow-hidden">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800/80 mb-4">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-emerald-400" />
                Última Marcación Confirmada
              </h3>
              {lastScanResult && (
                <span className="text-xs font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/30">
                  {formatFullTime(lastScanResult.record.timestamp)}
                </span>
              )}
            </div>

            {lastScanResult ? (
              <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5">
                {/* Employee Photo */}
                <div className="relative shrink-0">
                  <img
                    src={lastScanResult.employee.avatarUrl}
                    alt={lastScanResult.employee.firstName}
                    className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl object-cover border-2 border-emerald-400 shadow-xl"
                  />
                  <div className="absolute -bottom-2 -right-2 w-7 h-7 rounded-full bg-emerald-500 flex items-center justify-center text-slate-950 font-bold shadow-md">
                    <CheckCircle2 className="w-4 h-4 stroke-[3]" />
                  </div>
                </div>

                {/* Details */}
                <div className="flex-1 text-center sm:text-left space-y-2">
                  <div>
                    <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                      <h4 className="text-xl font-extrabold text-white">
                        {lastScanResult.employee.firstName} {lastScanResult.employee.lastName}
                      </h4>
                      <span className="px-2 py-0.5 text-xs font-mono bg-slate-800 text-slate-300 rounded border border-slate-700">
                        {lastScanResult.employee.id}
                      </span>
                    </div>
                    <p className="text-sm font-medium text-emerald-400 mt-0.5">
                      {lastScanResult.employee.position} &bull; <span className="text-slate-400">{lastScanResult.employee.department}</span>
                    </p>
                    <p className="text-xs text-slate-400 font-mono mt-0.5">
                      DNI / Doc: {lastScanResult.employee.documentId}
                    </p>
                  </div>

                  {/* Registered Event Pill */}
                  <div className="pt-2">
                    <div className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl border text-sm font-bold shadow-md ${lastScanResult.eventMeta.badgeBg}`}>
                      <span className="w-2.5 h-2.5 rounded-full animate-ping" style={{ backgroundColor: lastScanResult.eventMeta.color }} />
                      <span>{lastScanResult.eventMeta.label.toUpperCase()}</span>
                      <span className="font-mono text-xs opacity-90">({lastScanResult.record.time})</span>
                    </div>
                  </div>

                  {/* Punctuality Status Note */}
                  {lastScanResult.record.type === 'morning_in' && (
                    <div className="mt-2">
                      {lastScanResult.isLate ? (
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/30 text-xs font-medium text-amber-300">
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                          <span>Tardanza: +{lastScanResult.delayMinutes} min (Horario oficial: {lastScanResult.employee.schedule.entryTime})</span>
                        </div>
                      ) : (
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-xs font-medium text-emerald-300">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Puntual a tiempo (Tolerancia: {lastScanResult.employee.schedule.toleranceMinutes} min)</span>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="text-[11px] text-slate-500 flex items-center justify-center sm:justify-start gap-1 pt-1">
                    <Clock className="w-3 h-3" />
                    <span>Dispositivo: {lastScanResult.record.terminalName}</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="py-8 flex flex-col items-center justify-center text-center text-slate-500">
                <div className="w-14 h-14 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-center mb-3 text-slate-600">
                  <QrCode className="w-7 h-7" />
                </div>
                <h4 className="text-sm font-semibold text-slate-400">Esperando primer escaneo</h4>
                <p className="text-xs text-slate-500 max-w-sm mt-1">
                  Pasa el código QR frente a la cámara o selecciona un empleado en el simulador rápido de abajo para registrar la asistencia.
                </p>
              </div>
            )}
          </div>

          {/* Quick Simulation Drawer */}
          {showSimDrawer && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  <h4 className="text-sm font-bold text-white">Simulador Rápido de Marcaciones</h4>
                  <span className="text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded-full font-mono">
                    1-Click Test
                  </span>
                </div>
                
                {/* Search in simulator */}
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={quickSearchTerm}
                    onChange={(e) => setQuickSearchTerm(e.target.value)}
                    placeholder="Buscar empleado..."
                    className="bg-slate-950 border border-slate-800 rounded-lg pl-8 pr-3 py-1 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 w-44"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-60 overflow-y-auto pr-1">
                {filteredQuickEmployees.map(emp => {
                  const empToday = todayRecords.filter(r => r.employeeId === emp.id);
                  const nextEvent = determineNextAttendanceEvent(emp, empToday);
                  const nextMeta = EVENT_LABELS[nextEvent.suggestedType];

                  return (
                    <div
                      key={emp.id}
                      className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 hover:border-slate-700 flex items-center justify-between gap-3 group transition-all"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <img
                          src={emp.avatarUrl}
                          alt={emp.firstName}
                          className="w-9 h-9 rounded-lg object-cover border border-slate-700 shrink-0"
                        />
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-white truncate group-hover:text-emerald-400">
                            {emp.firstName} {emp.lastName}
                          </p>
                          <p className="text-[10px] text-slate-400 truncate">
                            {emp.position} &bull; {emp.department}
                          </p>
                        </div>
                      </div>

                      <button
                        onClick={() => handleProcessScan(emp.qrPayload)}
                        title={`Marcar: ${nextMeta.label}`}
                        className="shrink-0 px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition-all flex items-center gap-1 shadow-sm active:scale-95 text-white"
                        style={{ backgroundColor: nextMeta.color }}
                      >
                        <span>{nextMeta.short}</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Today's Recent Scans Stream */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-3">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                <History className="w-4 h-4 text-emerald-400" />
                Marcaciones de Hoy ({todayRecords.length})
              </h4>
              <span className="text-xs text-slate-500">
                Orden cronológico inverso
              </span>
            </div>

            {todayRecords.length === 0 ? (
              <p className="text-xs text-slate-500 py-4 text-center">
                Aún no hay marcaciones registradas para el día de hoy.
              </p>
            ) : (
              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {todayRecords.slice(0, 10).map((rec) => {
                  const meta = EVENT_LABELS[rec.type] || EVENT_LABELS.morning_in;
                  return (
                    <div
                      key={rec.id}
                      className="p-2.5 rounded-xl bg-slate-950 border border-slate-800/80 flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="flex items-center gap-2.5">
                        <img
                          src={rec.avatarUrl}
                          alt={rec.employeeName}
                          className="w-7 h-7 rounded-full object-cover border border-slate-700"
                        />
                        <div>
                          <p className="font-bold text-white">{rec.employeeName}</p>
                          <p className="text-[10px] text-slate-400">{rec.department}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {rec.isLate && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                            Tardanza +{rec.delayMinutes}m
                          </span>
                        )}
                        <span className={`px-2 py-0.5 rounded-md text-[11px] font-bold border ${meta.badgeBg}`}>
                          {meta.short}
                        </span>
                        <span className="font-mono text-slate-400 font-medium">
                          {rec.time}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </div>

      </div>
    </div>
  );
};
