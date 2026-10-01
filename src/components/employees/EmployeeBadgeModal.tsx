import React, { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import { 
  X, 
  Printer, 
  Download, 
  Building2, 
  ShieldCheck, 
  QrCode as QrIcon,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { Employee, SystemConfig } from '../../types/attendance';
import { buildDailyQrPayload, serializeDailyQrPayload } from '../../lib/dailyQr';
import { getTodayDateStr } from '../../utils/timeCalculations';
import { normalizeAvatarUrl, initialsAvatarDataUrl } from '../../utils/avatar';

interface EmployeeBadgeModalProps {
  employee: Employee | null;
  employees: Employee[];
  config: SystemConfig;
  onClose: () => void;
  onSelectEmployee?: (emp: Employee) => void;
}

export const EmployeeBadgeModal: React.FC<EmployeeBadgeModalProps> = ({
  employee,
  employees,
  config,
  onClose,
  onSelectEmployee,
}) => {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const badgeCardRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!employee) return;
    // Credencial con QR DIARIO: contiene los datos del colaborador y la fecha
    // de impresión. El escáner solo lo acepta el mismo día (luego caduca).
    const payloadText = serializeDailyQrPayload(buildDailyQrPayload(employee, getTodayDateStr()));
    QRCode.toDataURL(payloadText, {
      width: 320,
      margin: 1,
      color: {
        dark: '#0f172a',
        light: '#ffffff',
      },
      errorCorrectionLevel: 'H',
    })
      .then(url => setQrDataUrl(url))
      .catch(err => console.error('QR generation error:', err));
  }, [employee]);

  if (!employee) return null;

  const currentIndex = employees.findIndex(e => e.id === employee.id);

  const handlePrev = () => {
    if (currentIndex > 0 && onSelectEmployee) {
      onSelectEmployee(employees[currentIndex - 1]);
    }
  };

  const handleNext = () => {
    if (currentIndex < employees.length - 1 && onSelectEmployee) {
      onSelectEmployee(employees[currentIndex + 1]);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadQR = () => {
    if (!qrDataUrl) return;
    const a = document.createElement('a');
    a.href = qrDataUrl;
    a.download = `QR_${employee.id}_${employee.lastName.replace(/\s+/g, '_')}.png`;
    a.click();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl relative my-8">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-xl">
              <QrIcon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Carnet de Identificación QR</h3>
              <p className="text-xs text-slate-400">Credencial oficial para control de asistencia</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-xl bg-slate-800 hover:bg-slate-700 transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Carousel Prev/Next if multiple */}
        {employees.length > 1 && onSelectEmployee && (
          <div className="flex items-center justify-between text-xs text-slate-400 my-3 px-1">
            <button
              onClick={handlePrev}
              disabled={currentIndex === 0}
              className="flex items-center gap-1 hover:text-white disabled:opacity-30"
            >
              <ChevronLeft className="w-4 h-4" /> Anterior
            </button>
            <span className="font-mono">
              {currentIndex + 1} de {employees.length}
            </span>
            <button
              onClick={handleNext}
              disabled={currentIndex === employees.length - 1}
              className="flex items-center gap-1 hover:text-white disabled:opacity-30"
            >
              Siguiente <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* THE PRINTABLE BADGE CARD */}
        <div className="flex justify-center my-4">
          <div 
            ref={badgeCardRef}
            className="print-area w-72 bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 rounded-2xl border-2 border-slate-700 shadow-2xl p-5 text-center relative overflow-hidden"
          >
            {/* Lanyard punch hole indicator */}
            <div className="w-12 h-2.5 mx-auto bg-slate-950 rounded-full border border-slate-800 mb-4" />

            {/* Corporate Header */}
            <div className="flex items-center justify-center gap-2 mb-4">
              <div className="w-6 h-6 rounded-lg bg-emerald-500 flex items-center justify-center text-slate-950 font-black text-xs">
                <Building2 className="w-3.5 h-3.5" />
              </div>
              <span className="font-extrabold text-sm tracking-wider uppercase text-white">
                {config.companyName || 'MakroHouse'}
              </span>
            </div>

            {/* Employee Photo */}
            <div className="relative inline-block mx-auto mb-3">
              <img
                src={normalizeAvatarUrl(employee.avatarUrl)}
                          onError={(e) => { const t = e.currentTarget as HTMLImageElement; if (!t.dataset.fallback) { t.dataset.fallback = '1'; t.src = initialsAvatarDataUrl(employee.firstName); } }}
                alt={employee.firstName}
                className="w-24 h-24 rounded-2xl object-cover border-2 border-emerald-400 shadow-lg mx-auto"
              />
              <div className="absolute -bottom-1 -right-1 bg-emerald-500 text-slate-950 rounded-full p-1 shadow">
                <ShieldCheck className="w-3.5 h-3.5" />
              </div>
            </div>

            {/* Name & Position */}
            <h4 className="text-base font-extrabold text-white leading-tight">
              {employee.firstName} {employee.lastName}
            </h4>
            <p className="text-xs font-semibold text-emerald-400 mt-1">
              {employee.position}
            </p>
            <p className="text-[11px] text-slate-400 mb-4">
              {employee.department}
            </p>

            {/* QR Code Container */}
            <div className="bg-white p-2.5 rounded-xl shadow-inner inline-block mx-auto border-2 border-emerald-500/40">
              {qrDataUrl ? (
                <img
                  src={qrDataUrl}
                  alt={`QR de ${employee.firstName}`}
                  className="w-36 h-36 mx-auto"
                />
              ) : (
                <div className="w-36 h-36 flex items-center justify-center text-slate-400 text-xs">
                  Generando QR...
                </div>
              )}
            </div>

            {/* Card Footer Details */}
            <div className="mt-4 pt-3 border-t border-slate-800 text-[10px] text-slate-400 flex justify-between items-center font-mono">
              <span>ID: <strong className="text-white">{employee.id}</strong></span>
              <span>DNI: <strong className="text-white">{employee.documentId}</strong></span>
            </div>
            
            <p className="text-[9px] text-slate-500 mt-2 uppercase tracking-widest">
              Uso exclusivo para marcación RR.HH
            </p>
          </div>
        </div>

        {/* Modal Action Buttons */}
        <div className="flex items-center gap-3 mt-6 pt-4 border-t border-slate-800">
          <button
            onClick={handleDownloadQR}
            className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all border border-slate-700"
          >
            <Download className="w-4 h-4 text-emerald-400" />
            Descargar Solo QR
          </button>
          <button
            onClick={handlePrint}
            className="flex-1 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-md shadow-emerald-500/20"
          >
            <Printer className="w-4 h-4" />
            Imprimir Carnet
          </button>
        </div>

      </div>
    </div>
  );
};
