import React, { useEffect, useMemo, useState } from 'react';
import { CalendarDays, Download, Printer, RefreshCw, Users } from 'lucide-react';
import type { Employee } from '../../types/attendance';
import { getTodayDateStr, formatDateSpanish } from '../../utils/timeCalculations';
import { generateDailyQrDataUrl, serializeDailyQrPayload, buildDailyQrPayload } from '../../lib/dailyQr';

interface DailyQrModuleProps {
  employees: Employee[];
}

interface CardData {
  employee: Employee;
  payloadText: string;
  dataUrl: string;
}

/**
 * Módulo "QR Diario": genera un código QR por colaborador activo que
 * contiene sus datos (id, documento, nombre, departamento) y la fecha
 * del día. Los códigos vencen automáticamente: el escáner rechaza
 * cualquier QR cuya fecha no sea la actual.
 */
export const DailyQrModule: React.FC<DailyQrModuleProps> = ({ employees }) => {
  const [selectedDate, setSelectedDate] = useState<string>(getTodayDateStr());
  const [cards, setCards] = useState<CardData[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const activeEmployees = useMemo(
    () => employees.filter(e => e.active),
    [employees]
  );

  const generateAll = async () => {
    if (activeEmployees.length === 0) {
      setError('No hay colaboradores activos para generar códigos.');
      return;
    }
    setIsGenerating(true);
    setError(null);
    try {
      const results = await Promise.all(
        activeEmployees.map(async emp => ({
          employee: emp,
          payloadText: serializeDailyQrPayload(buildDailyQrPayload(emp, selectedDate)),
          dataUrl: await generateDailyQrDataUrl(emp, selectedDate),
        }))
      );
      setCards(results);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al generar los códigos QR.');
    } finally {
      setIsGenerating(false);
    }
  };

  // Generar automáticamente al montar (fecha de hoy).
  useEffect(() => {
    void generateAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleDownloadOne = (card: CardData) => {
    const a = document.createElement('a');
    a.href = card.dataUrl;
    a.download = `QR_diario_${card.employee.id}_${selectedDate}.png`;
    a.click();
  };

  const handlePrintSheet = () => {
    const win = window.open('', '_blank', 'width=900,height=700');
    if (!win) {
      setError('El navegador bloqueó la ventana de impresión. Permite las ventanas emergentes.');
      return;
    }
    const tiles = cards
      .map(
        c => `
        <div class="card">
          <img src="${c.dataUrl}" alt="QR ${c.employee.id}" />
          <h3>${c.employee.firstName} ${c.employee.lastName}</h3>
          <p><b>${c.employee.id}</b> &bull; Doc: ${c.employee.documentId}</p>
          <p>${c.employee.department} &bull; ${c.employee.position}</p>
          <p class="date">Válido solo el ${selectedDate}</p>
        </div>`
      )
      .join('');
    win.document.write(`<!DOCTYPE html><html lang="es"><head><meta charset="utf-8" />
      <title>QR Diarios ${selectedDate}</title>
      <style>
        body { font-family: system-ui, sans-serif; margin: 24px; color: #0f172a; }
        h1 { font-size: 20px; } .subtitle { color: #475569; font-size: 13px; margin-bottom: 20px; }
        .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 16px; }
        .card { border: 1px solid #cbd5e1; border-radius: 12px; padding: 12px; text-align: center; break-inside: avoid; }
        .card img { width: 160px; height: 160px; }
        .card h3 { font-size: 14px; margin: 8px 0 4px; }
        .card p { font-size: 11px; margin: 2px 0; color: #334155; }
        .date { color: #059669; font-weight: 600; }
        @media print { .card { page-break-inside: avoid; } }
      </style></head><body>
      <h1>Códigos QR diarios — ${formatDateSpanish(selectedDate)}</h1>
      <div class="subtitle">Cada código contiene los datos del colaborador y la fecha. Vence automáticamente al cambiar el día.</div>
      <div class="grid">${tiles}</div>
      <script>window.onload = () => { window.print(); };</script>
      </body></html>`);
    win.document.close();
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
      <div className="flex items-center gap-2">
        <span className="p-1.5 bg-cyan-500/20 text-cyan-400 rounded-lg">
          <CalendarDays className="w-5 h-5" />
        </span>
        <div>
          <h3 className="text-lg font-bold text-white">QR Diario por Colaborador</h3>
          <p className="text-xs text-slate-500">
            Un código por empleado con sus datos y la fecha. Solo válido el día indicado.
          </p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 sm:items-end">
        <label className="block">
          <span className="text-xs font-medium text-slate-400 block mb-1">Fecha de los códigos</span>
          <input
            type="date"
            value={selectedDate}
            max={getTodayDateStr()}
            onChange={e => setSelectedDate(e.target.value || getTodayDateStr())}
            className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
          />
        </label>
        <button
          onClick={generateAll}
          disabled={isGenerating}
          className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-500 disabled:bg-slate-700 text-white rounded-lg font-medium transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${isGenerating ? 'animate-spin' : ''}`} />
          {isGenerating ? 'Generando…' : 'Generar QR del día'}
        </button>
        {cards.length > 0 && (
          <>
            <button
              onClick={handlePrintSheet}
              className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg font-medium transition-colors"
            >
              <Printer className="w-4 h-4" /> Imprimir hoja
            </button>
            <button
              onClick={() => {
                cards.forEach((c, i) => setTimeout(() => handleDownloadOne(c), i * 150));
              }}
              className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg font-medium transition-colors"
            >
              <Download className="w-4 h-4" /> Descargar todos (PNG)
            </button>
          </>
        )}
      </div>

      <p className="text-xs text-slate-500 flex items-center gap-1.5">
        <Users className="w-3.5 h-3.5" />
        {activeEmployees.length} colaborador(es) activo(s)
        {selectedDate !== getTodayDateStr() && (
          <span className="text-amber-400">• Fecha distinta a hoy: estos QR solo se aceptarán el {selectedDate}.</span>
        )}
      </p>

      {error && (
        <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-sm text-red-300">
          {error}
        </div>
      )}

      {cards.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 pt-2">
          {cards.map(card => (
            <div
              key={card.employee.id}
              className="bg-slate-950 border border-slate-800 rounded-xl p-4 text-center space-y-2"
            >
              <img
                src={card.dataUrl}
                alt={`QR diario de ${card.employee.firstName}`}
                className="w-28 h-28 mx-auto rounded bg-white p-1"
              />
              <p className="font-semibold text-sm text-white leading-tight">
                {card.employee.firstName} {card.employee.lastName}
              </p>
              <p className="text-[11px] text-slate-400">
                {card.employee.id} • Doc: {card.employee.documentId}
              </p>
              <p className="text-[11px] text-slate-500">{card.employee.department}</p>
              <p className="text-[11px] font-medium text-cyan-400">Válido: {selectedDate}</p>
              <button
                onClick={() => handleDownloadOne(card)}
                className="text-xs inline-flex items-center gap-1 text-slate-300 hover:text-white border border-slate-700 rounded-md px-2 py-1 transition-colors"
              >
                <Download className="w-3 h-3" /> PNG
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
