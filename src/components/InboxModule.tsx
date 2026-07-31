'use client';

import React, { useState } from 'react';
import { db } from '../lib/firebase';
import { collection, addDoc, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';
import { MessageSquare, Mic, Trash2, Calendar, FileText, Send, Clock } from 'lucide-react';

interface InboxModuleProps {
  logs: any[];
  userId: string;
}

export default function InboxModule({ logs, userId }: InboxModuleProps) {
  const [newLogText, setNewLogText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [filterCategory, setFilterCategory] = useState<string>('all');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLogText.trim()) return;

    setSubmitting(true);
    try {
      // Create manual text log
      const logsRef = collection(db, 'inbox_logs');
      await addDoc(logsRef, {
        userId,
        rawInput: newLogText,
        inputType: 'text',
        transcribedText: newLogText,
        parsedCategory: 'inbox',
        status: 'processed',
        createdAt: serverTimestamp(),
      });
      setNewLogText('');
    } catch (error) {
      console.error('Error al agregar nota:', error);
      alert('No se pudo guardar la nota.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (logId: string) => {
    if (!confirm('¿Estás seguro de eliminar este registro?')) return;
    try {
      await deleteDoc(doc(db, 'inbox_logs', logId));
    } catch (error) {
      console.error('Error al eliminar registro:', error);
    }
  };

  const filteredLogs = logs.filter(log => {
    if (filterCategory === 'all') return true;
    return log.parsedCategory === filterCategory;
  });

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* Sidebar: Form & Stats */}
      <div className="lg:col-span-1 space-y-6">
        <div className="glass p-6 rounded-2xl border border-white/10">
          <h3 className="text-lg font-semibold mb-4 text-white">Capturar Nota Rápida</h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <textarea
              className="w-full glass-input p-4 rounded-xl text-sm focus:ring-2 focus:ring-violet-500/20"
              rows={4}
              placeholder="Escribe algo rápido aquí... (ej: Comprar bombillas led de rosca fina)"
              value={newLogText}
              onChange={(e) => setNewLogText(e.target.value)}
              disabled={submitting}
            />
            <button
              type="submit"
              disabled={submitting || !newLogText.trim()}
              className="w-full bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white font-medium py-3 px-4 rounded-xl transition flex items-center justify-center gap-2 text-sm shadow-lg shadow-violet-500/20 cursor-pointer"
            >
              <Send className="w-4 h-4" />
              {submitting ? 'Guardando...' : 'Agregar al Inbox'}
            </button>
          </form>
        </div>

        <div className="glass p-6 rounded-2xl border border-white/10">
          <h3 className="text-lg font-semibold mb-4 text-white">Filtrar por Categoría</h3>
          <div className="flex flex-col gap-2">
            {[
              { id: 'all', label: 'Todos los registros', count: logs.length },
              { id: 'inbox', label: 'Solo Notas (Inbox)', count: logs.filter(l => l.parsedCategory === 'inbox').length },
              { id: 'evento', label: 'Eventos / Citas', count: logs.filter(l => l.parsedCategory === 'evento').length },
              { id: 'proyecto', label: 'Proyectos / Metas', count: logs.filter(l => l.parsedCategory === 'proyecto').length },
              { id: 'plan', label: 'Planes Tiempo Libre', count: logs.filter(l => l.parsedCategory === 'plan').length },
            ].map(cat => (
              <button
                key={cat.id}
                onClick={() => setFilterCategory(cat.id)}
                className={`flex justify-between items-center py-2 px-4 rounded-xl text-left text-sm transition cursor-pointer ${
                  filterCategory === cat.id 
                    ? 'bg-violet-500/20 border border-violet-500/30 text-violet-300 font-medium' 
                    : 'hover:bg-white/5 border border-transparent text-gray-400'
                }`}
              >
                <span>{cat.label}</span>
                <span className="bg-white/5 border border-white/5 px-2 py-0.5 rounded-md text-xs">{cat.count}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content: Chronological Stream */}
      <div className="lg:col-span-2 space-y-4">
        <div className="flex justify-between items-center mb-2">
          <h3 className="text-lg font-semibold text-white">Flujo de Entrada</h3>
          <span className="text-xs text-gray-500">Mostrando {filteredLogs.length} elementos</span>
        </div>

        {filteredLogs.length === 0 ? (
          <div className="glass p-12 rounded-2xl border border-white/10 text-center text-gray-400">
            <MessageSquare className="w-12 h-12 mx-auto mb-4 text-gray-600 animate-pulse-slow" />
            <p>No hay registros disponibles en esta categoría.</p>
            <p className="text-xs text-gray-500 mt-1">Usa el bot de Telegram o el formulario lateral para agregar entradas.</p>
          </div>
        ) : (
          <div className="space-y-4 max-h-[680px] overflow-y-auto pr-2">
            {filteredLogs.map((log) => {
              const date = log.createdAt?.seconds 
                ? new Date(log.createdAt.seconds * 1000) 
                : log.createdAt ? new Date(log.createdAt) : new Date();
              
              const isVoice = log.inputType === 'voice';

              return (
                <div key={log.logId} className="glass p-5 rounded-2xl border border-white/10 flex gap-4 relative group hover:border-white/20 transition duration-200">
                  {/* Left Side: Type Icon */}
                  <div className={`p-3 h-fit rounded-xl border border-white/5 ${
                    isVoice ? 'bg-indigo-500/10 text-indigo-400' : 'bg-violet-500/10 text-violet-400'
                  }`}>
                    {isVoice ? <Mic className="w-5 h-5" /> : <FileText className="w-5 h-5" />}
                  </div>

                  {/* Center: Contents */}
                  <div className="flex-1 space-y-2 pr-6">
                    <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {date.toLocaleDateString()} a las {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      <span>•</span>
                      <span className={`px-2 py-0.5 rounded-full border text-[10px] font-semibold tracking-wider ${
                        log.parsedCategory === 'evento' ? 'bg-blue-500/10 border-blue-500/20 text-blue-400' :
                        log.parsedCategory === 'proyecto' ? 'bg-violet-500/10 border-violet-500/20 text-violet-400' :
                        log.parsedCategory === 'plan' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' :
                        'bg-gray-500/10 border-gray-500/20 text-gray-400'
                      }`}>
                        {log.parsedCategory ? log.parsedCategory.toUpperCase() : 'INBOX'}
                      </span>
                      {log.status === 'pending' && (
                        <span className="bg-amber-500/10 border border-amber-500/20 text-amber-400 px-2 py-0.5 rounded-full text-[10px] font-semibold tracking-wider animate-pulse">
                          PENDIENTE PARSE
                        </span>
                      )}
                    </div>

                    <p className="text-sm font-medium text-gray-200 leading-relaxed">
                      {log.transcribedText || log.rawInput}
                    </p>

                    {/* Styled Audio Player for Voice Notes */}
                    {isVoice && log.rawInput && (
                      <div className="mt-3 pt-2 border-t border-white/5">
                        <p className="text-[10px] text-gray-400 mb-1">Nota de Voz Original:</p>
                        <audio 
                          controls 
                          src={log.rawInput} 
                          className="w-full max-w-sm h-8 rounded-lg outline-none bg-slate-900/60 border border-white/5"
                        />
                      </div>
                    )}
                  </div>

                  {/* Absolute Action button: Delete */}
                  <button 
                    onClick={() => handleDelete(log.logId)}
                    className="absolute top-5 right-5 text-gray-500 hover:text-red-400 p-1.5 rounded-lg hover:bg-red-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-200 cursor-pointer"
                  >
                    <Trash2 className="w-4.5 h-4.5" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
