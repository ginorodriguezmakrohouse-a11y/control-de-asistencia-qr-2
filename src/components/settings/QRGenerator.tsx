import React, { useState } from 'react';
import { supabase } from '../../lib/supabase';
import QRCode from 'qrcode';
import { QrCode } from 'lucide-react';
import type { Employee } from '../../types/attendance';

interface QRGeneratorProps {
  employees: Employee[];
  onGenerateQrs?: (results: { employeeId: string; publicUrl: string }[]) => void;
}

export const QRGenerator: React.FC<QRGeneratorProps> = ({ employees, onGenerateQrs }) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [results, setResults] = useState<{ employeeId: string; publicUrl: string }[]>([]);
  const [errors, setErrors] = useState<string[]>([]);

  const generateQrForEmployee = async (employee: Employee) => {
    try {
      const todayDateStr = new Date().toISOString().split('T')[0];
      const payload = `${employee.qrPayload}_${todayDateStr}`;
      
      if (!/^\w+_\d{4}-\d{2}-\d{2}$/.test(payload)) {
        throw new Error('Formato de QR inválido');
      }
      
      const qrCodeDataUrl = await QRCode.toDataURL(payload, {
        width: 300, margin: 1,
        color: { dark: '#000000', light: '#FFFFFF' }
      });
      
      const response = await fetch(qrCodeDataUrl);
      const blob = await response.blob();
      
      const fileName = `qr_${employee.id}_${todayDateStr}.png`;
      const { error: uploadError } = await supabase
        .storage
        .from('qr_codes')
        .upload(fileName, blob, { contentType: 'image/png', upsert: true });
      
      if (uploadError) throw new Error(uploadError.message);
      
      const { data: { publicUrl } } = supabase
        .storage
        .from('qr_codes')
        .getPublicUrl(fileName);
      
      return { employeeId: employee.id, publicUrl: publicUrl as string };
    } catch (error) {
      throw new Error(`Error para ${employee.firstName}: ${error.message}`);
    }
  };

  const handleGenerateAll = async () => {
    setIsGenerating(true);
    setResults([]);
    setErrors([]);
    
    try {
      const activeEmployees = employees.filter(e => e.active);
      const allResults = await Promise.allSettled(
        activeEmployees.map(generateQrForEmployee)
      );
      
      const successful: { employeeId: string; publicUrl: string }[] = [];
      const errorMessages: string[] = [];
      
      allResults.forEach((result) => {
        if (result.status === 'fulfilled') {
          successful.push(result.value);
        } else {
          errorMessages.push(result.reason.message);
        }
      });
      
      setResults(successful);
      setErrors(errorMessages);
      
      if (successful.length > 0) {
        onGenerateQrs?.(successful);
      }
    } catch (err) {
      setErrors([err instanceof Error ? err.message : 'Error desconocido']);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
      <div className="flex items-center gap-2">
        <span className="p-1.5 bg-emerald-500/20 text-emerald-400 rounded-lg">
          <QrCode className="w-5 h-5" />
        </span>
        <h3 className="text-lg font-bold text-white">Generación Diaria de QR</h3>
      </div>
      <p className="text-sm text-slate-500">
        Genera códigos QR únicos para hoy que incluyan la fecha para evitar uso no autorizado.
        Cada código tendrá el formato: [qrPayload]_[YYYY-MM-DD]
      </p>
      
      <div className="mt-4">
        <button
          onClick={handleGenerateAll}
          disabled={isGenerating}
          className="w-full px-4 py-2 bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-700 text-white rounded-lg font-medium transition-colors"
        >
          {isGenerating ? 'Generando...' : 'Generar QR Diario para Todos'}
        </button>
      </div>
      
      {errors.length > 0 && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded">
          <h3 className="font-medium text-red-800">Errores:</h3>
          <ul className="mt-2 text-sm text-red-700 space-y-1">
            {errors.map((err, i) => (
              <li key={i}>• {err}</li>
            ))}
          </ul>
        </div>
      )}
      
      {results.length > 0 && (
        <div className="mt-4">
          <h3 className="font-medium text-slate-800">QR Codes Generados:</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 mt-3">
            {results.map((result, i) => {
              const employee = employees.find(e => e.id === result.employeeId);
              return (
                <div key={i} className="border p-3 rounded text-center">
                  <img 
                    src={result.publicUrl} 
                    alt={`QR ${employee?.firstName || 'Employee'}`} 
                    className="w-24 h-24 mx-auto mb-2 rounded bg-white"
                    onError={(e) => { e.target.src = '/placeholder.svg'; }}
                  />
                  <p className="font-medium text-slate-700">{employee?.firstName || 'Employee'}</p>
                  <p className="text-xs text-slate-500 break-all">{result.publicUrl}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
