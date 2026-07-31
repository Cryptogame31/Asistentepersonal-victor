'use client';

import React, { useState } from 'react';
import { db } from '../lib/firebase';
import { collection, addDoc, updateDoc, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';
import { Calendar, Plus, Trash2, CheckCircle2, Clock, Send, Bell, BellOff } from 'lucide-react';

interface AgendaModuleProps {
  events: any[];
  userId: string;
}

export default function AgendaModule({ events, userId }: AgendaModuleProps) {
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [category, setCategory] = useState<'cita' | 'cumpleaños' | 'compromiso' | 'compras'>('cita');
  const [submitting, setSubmitting] = useState(false);
  const [filter, setFilter] = useState<'todos' | 'pendiente' | 'completado'>('pendiente');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !date) return;

    setSubmitting(true);
    try {
      const eventsRef = collection(db, 'events_reminders');
      await addDoc(eventsRef, {
        userId,
        title,
        date,
        time: time || '',
        category,
        status: 'pendiente',
        reminderSent: false,
        reminder24hSent: false,
        reminder1hSent: false,
        createdAt: serverTimestamp(),
      });
      setTitle('');
      setDate('');
      setTime('');
      setCategory('cita');
    } catch (error) {
      console.error('Error al agregar evento:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async (eventId: string, currentStatus: string) => {
    const nextStatus = currentStatus === 'pendiente' ? 'completado' : 'pendiente';
    try {
      const eventRef = doc(db, 'events_reminders', eventId);
      await updateDoc(eventRef, { status: nextStatus });
    } catch (error) {
      console.error('Error al actualizar estado:', error);
    }
  };

  const handleDelete = async (eventId: string) => {
    if (!confirm('¿Deseas eliminar este evento?')) return;
    try {
      await deleteDoc(doc(db, 'events_reminders', eventId));
    } catch (error) {
      console.error('Error al eliminar evento:', error);
    }
  };

  // Sort events chronologically (dates ascending, times ascending)
  const sortedEvents = [...events].sort((a, b) => {
    if (a.date !== b.date) {
      return a.date.localeCompare(b.date);
    }
    return (a.time || '').localeCompare(b.time || '');
  });

  const filteredEvents = sortedEvents.filter(e => {
    if (filter === 'todos') return true;
    return e.status === filter;
  });

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* Form: Add Event */}
      <div className="lg:col-span-1">
        <div className="glass p-6 rounded-2xl border border-white/10 sticky top-6">
          <h3 className="text-lg font-semibold mb-4 text-white">Programar Compromiso</h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-1.5 uppercase">Título del Evento</label>
              <input
                type="text"
                className="w-full glass-input p-3 rounded-xl text-sm"
                placeholder="Ej. Cita con el Oftalmólogo"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                disabled={submitting}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-1.5 uppercase">Fecha</label>
                <input
                  type="date"
                  className="w-full glass-input p-3 rounded-xl text-sm"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  required
                  disabled={submitting}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-1.5 uppercase">Hora (Opcional)</label>
                <input
                  type="time"
                  className="w-full glass-input p-3 rounded-xl text-sm"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  disabled={submitting}
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-1.5 uppercase">Categoría</label>
              <select
                className="w-full glass-input p-3 rounded-xl text-sm"
                value={category}
                onChange={(e) => setCategory(e.target.value as any)}
                disabled={submitting}
              >
                <option value="cita">🏥 Cita Médica</option>
                <option value="cumpleaños">🎂 Cumpleaños</option>
                <option value="compromiso">🤝 Compromiso / Reunión</option>
                <option value="compras">🛒 Compras / Logística</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={submitting || !title.trim() || !date}
              className="w-full bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white font-medium py-3 px-4 rounded-xl transition flex items-center justify-center gap-2 text-sm shadow-lg shadow-violet-500/20 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              {submitting ? 'Programando...' : 'Programar'}
            </button>
          </form>
        </div>
      </div>

      {/* List: View Events */}
      <div className="lg:col-span-2 space-y-6">
        <div className="flex justify-between items-center">
          <div className="flex gap-2">
            {[
              { id: 'pendiente', label: 'Pendientes' },
              { id: 'completado', label: 'Completados' },
              { id: 'todos', label: 'Todos' },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setFilter(tab.id as any)}
                className={`py-1.5 px-4 rounded-xl text-xs font-medium border transition cursor-pointer ${
                  filter === tab.id 
                    ? 'bg-violet-500/20 border-violet-500/30 text-violet-300' 
                    : 'border-transparent text-gray-400 hover:bg-white/5'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <span className="text-xs text-gray-500">Total: {filteredEvents.length} eventos</span>
        </div>

        {filteredEvents.length === 0 ? (
          <div className="glass p-12 rounded-2xl border border-white/10 text-center text-gray-400">
            <Calendar className="w-12 h-12 mx-auto mb-4 text-gray-600 animate-pulse-slow" />
            <p>No tienes eventos en esta lista.</p>
            <p className="text-xs text-gray-500 mt-1">Usa el formulario lateral o envíaselos a tu bot de Telegram.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredEvents.map((event) => {
              const isCompleted = event.status === 'completado';
              
              let catEmoji = '📅';
              let catColor = 'bg-blue-500/10 text-blue-400 border-blue-500/20';
              if (event.category === 'cita') {
                catEmoji = '🏥';
                catColor = 'bg-red-500/10 text-red-400 border-red-500/20';
              } else if (event.category === 'cumpleaños') {
                catEmoji = '🎂';
                catColor = 'bg-pink-500/10 text-pink-400 border-pink-500/20';
              } else if (event.category === 'compras') {
                catEmoji = '🛒';
                catColor = 'bg-amber-500/10 text-amber-400 border-amber-500/20';
              } else if (event.category === 'compromiso') {
                catEmoji = '🤝';
                catColor = 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20';
              }

              return (
                <div 
                  key={event.eventId} 
                  className={`glass p-4 rounded-xl border flex justify-between items-center transition duration-200 ${
                    isCompleted ? 'opacity-65 border-white/5 bg-slate-900/20' : 'border-white/10 hover:border-white/20'
                  }`}
                >
                  <div className="flex items-center gap-4">
                    {/* Toggle button */}
                    <button
                      onClick={() => handleToggleStatus(event.eventId, event.status)}
                      className={`transition cursor-pointer ${isCompleted ? 'text-emerald-500' : 'text-gray-500 hover:text-emerald-400'}`}
                    >
                      <CheckCircle2 className={`w-6 h-6 ${isCompleted ? 'fill-emerald-500/20' : ''}`} />
                    </button>

                    <div className="space-y-1">
                      <h4 className={`text-sm font-semibold ${isCompleted ? 'line-through text-gray-500' : 'text-white'}`}>
                        {event.title}
                      </h4>
                      <div className="flex flex-wrap items-center gap-2 text-xs text-gray-400">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" />
                          {event.date} {event.time ? `• ${event.time}` : ''}
                        </span>
                        <span>•</span>
                        <span className={`px-2 py-0.5 rounded-full border text-[10px] ${catColor}`}>
                          {catEmoji} {event.category.toUpperCase()}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions & Alerts */}
                  <div className="flex items-center gap-3">
                    {/* Telegram Alert Pushed Indicator */}
                    {!isCompleted && (
                      <div 
                        title={
                          event.reminder1hSent 
                            ? "Recordatorios de 24h y 1h enviados" 
                            : event.reminder24hSent 
                            ? "Recordatorio de 24h enviado. Pendiente recordatorio de 1h." 
                            : "Recordatorios programados para 24h y 1h antes de la cita."
                        }
                        className={`flex items-center gap-1 px-2.5 py-1 rounded-lg border text-[10px] font-medium transition ${
                          event.reminder1hSent 
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                            : event.reminder24hSent
                            ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                            : 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20'
                        }`}
                      >
                        {event.reminder1hSent ? <Bell className="w-3.5 h-3.5" /> : <Clock className="w-3.5 h-3.5" />}
                        {event.reminder1hSent 
                          ? 'AVISADO' 
                          : event.reminder24hSent 
                          ? '24H ENVIADO' 
                          : 'PROGRAMADO'}
                      </div>
                    )}

                    <button
                      onClick={() => handleDelete(event.eventId)}
                      className="text-gray-500 hover:text-red-400 p-2 rounded-lg hover:bg-red-500/10 transition cursor-pointer"
                    >
                      <Trash2 className="w-4.5 h-4.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
