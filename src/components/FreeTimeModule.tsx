'use client';

import React, { useState } from 'react';
import { db } from '../lib/firebase';
import { collection, addDoc, updateDoc, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';
import { Plus, Trash2, Heart, Users, Sparkles, Smile, CheckCircle, Clock } from 'lucide-react';

interface FreeTimeModuleProps {
  plans: any[];
  userId: string;
}

export default function FreeTimeModule({ plans, userId }: FreeTimeModuleProps) {
  const [title, setTitle] = useState('');
  const [activityType, setActivityType] = useState<'familia' | 'amigos' | 'personal'>('personal');
  const [plannedDate, setPlannedDate] = useState('');
  const [durationHours, setDurationHours] = useState('2');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !plannedDate || !durationHours) return;

    setSubmitting(true);
    try {
      const plansRef = collection(db, 'free_time_plans');
      await addDoc(plansRef, {
        userId,
        title,
        activityType,
        plannedDate,
        durationHours: parseFloat(durationHours),
        status: 'planificado',
        createdAt: serverTimestamp(),
      });
      setTitle('');
      setPlannedDate('');
      setDurationHours('2');
      setActivityType('personal');
    } catch (error) {
      console.error('Error al agregar plan de tiempo libre:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async (planId: string, currentStatus: string) => {
    const nextStatus = currentStatus === 'planificado' ? 'disfrutado' : 'planificado';
    try {
      const planRef = doc(db, 'free_time_plans', planId);
      await updateDoc(planRef, { status: nextStatus });
    } catch (error) {
      console.error('Error al actualizar estado del plan:', error);
    }
  };

  const handleDelete = async (planId: string) => {
    if (!confirm('¿Deseas eliminar este plan de tiempo libre?')) return;
    try {
      await deleteDoc(doc(db, 'free_time_plans', planId));
    } catch (error) {
      console.error('Error al eliminar plan:', error);
    }
  };

  // Metrics
  const totalPlannedHours = plans
    .filter(p => p.status === 'planificado')
    .reduce((sum, p) => sum + (Number(p.durationHours) || 0), 0);

  const totalEnjoyedHours = plans
    .filter(p => p.status === 'disfrutado')
    .reduce((sum, p) => sum + (Number(p.durationHours) || 0), 0);

  // Group by activity type (only planificados or total)
  const familyHours = plans.filter(p => p.activityType === 'familia').reduce((sum, p) => sum + (Number(p.durationHours) || 0), 0);
  const friendsHours = plans.filter(p => p.activityType === 'amigos').reduce((sum, p) => sum + (Number(p.durationHours) || 0), 0);
  const personalHours = plans.filter(p => p.activityType === 'personal').reduce((sum, p) => sum + (Number(p.durationHours) || 0), 0);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* Sidebar: Form & Metrics */}
      <div className="lg:col-span-1 space-y-6">
        
        {/* Statistics Card */}
        <div className="glass p-6 rounded-2xl border border-white/10 space-y-4">
          <h3 className="text-lg font-semibold text-white">Balance de Recreación</h3>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-slate-950/40 p-4 rounded-xl border border-white/5">
              <span className="text-[10px] font-semibold text-gray-400 uppercase">Planificado</span>
              <p className="text-2xl font-bold text-sky-400 mt-1">{totalPlannedHours}h</p>
            </div>
            <div className="bg-slate-950/40 p-4 rounded-xl border border-white/5">
              <span className="text-[10px] font-semibold text-gray-400 uppercase">Disfrutado 🎉</span>
              <p className="text-2xl font-bold text-emerald-400 mt-1">{totalEnjoyedHours}h</p>
            </div>
          </div>

          <div className="space-y-2 pt-2">
            <p className="text-xs font-semibold text-gray-400 uppercase">Por Tipo de Actividad (Total):</p>
            {[
              { label: '💖 Familia', value: familyHours, color: 'bg-pink-500' },
              { label: '👥 Amigos', value: friendsHours, color: 'bg-indigo-500' },
              { label: '✨ Personal', value: personalHours, color: 'bg-emerald-500' },
            ].map((item, idx) => {
              const maxVal = Math.max(familyHours, friendsHours, personalHours, 1);
              const pct = Math.round((item.value / maxVal) * 100);
              return (
                <div key={idx} className="space-y-1">
                  <div className="flex justify-between text-xs text-gray-300">
                    <span>{item.label}</span>
                    <span className="font-semibold">{item.value}h</span>
                  </div>
                  <div className="w-full bg-slate-950 h-1.5 rounded-full overflow-hidden border border-white/5">
                    <div 
                      className={`${item.color} h-full rounded-full transition-all duration-300`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Schedule Form */}
        <div className="glass p-6 rounded-2xl border border-white/10">
          <h3 className="text-lg font-semibold mb-4 text-white">Planificar Actividad</h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-1.5 uppercase">¿Qué vas a hacer?</label>
              <input
                type="text"
                className="w-full glass-input p-3 rounded-xl text-sm"
                placeholder="Ej. Tarde de juegos de mesa"
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
                  value={plannedDate}
                  onChange={(e) => setPlannedDate(e.target.value)}
                  required
                  disabled={submitting}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-1.5 uppercase">Duración (Horas)</label>
                <input
                  type="number"
                  step="0.5"
                  min="0.5"
                  className="w-full glass-input p-3 rounded-xl text-sm"
                  value={durationHours}
                  onChange={(e) => setDurationHours(e.target.value)}
                  required
                  disabled={submitting}
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-1.5 uppercase">Tipo de Plan</label>
              <select
                className="w-full glass-input p-3 rounded-xl text-sm"
                value={activityType}
                onChange={(e) => setActivityType(e.target.value as any)}
                disabled={submitting}
              >
                <option value="personal">✨ Tiempo Personal</option>
                <option value="familia">💖 Plan Familiar</option>
                <option value="amigos">👥 Salida con Amigos</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={submitting || !title.trim() || !plannedDate}
              className="w-full bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white font-medium py-3 px-4 rounded-xl transition flex items-center justify-center gap-2 text-sm shadow-lg shadow-violet-500/20 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              {submitting ? 'Agendando...' : 'Agendar Tiempo Libre'}
            </button>
          </form>
        </div>

      </div>

      {/* Main Content: Plans lists */}
      <div className="lg:col-span-2 space-y-6">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-semibold text-white">Cronograma de Descanso & Relaciones</h3>
          <span className="text-xs text-gray-500">Total: {plans.length} planes registrados</span>
        </div>

        {plans.length === 0 ? (
          <div className="glass p-12 rounded-2xl border border-white/10 text-center text-gray-400">
            <Smile className="w-12 h-12 mx-auto mb-4 text-gray-600 animate-pulse-slow" />
            <p>No tienes planes agendados en tu bitácora.</p>
            <p className="text-xs text-gray-500 mt-1">Usa tu bot de Telegram diciendo algo como "Cena con amigos el sábado a las 9pm" o el formulario.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {plans.map((plan) => {
              const isEnjoyed = plan.status === 'disfrutado';
              
              let Icon = Sparkles;
              let bgIconColor = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
              if (plan.activityType === 'familia') {
                Icon = Heart;
                bgIconColor = 'bg-pink-500/10 text-pink-400 border-pink-500/20';
              } else if (plan.activityType === 'amigos') {
                Icon = Users;
                bgIconColor = 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20';
              }

              return (
                <div 
                  key={plan.planId} 
                  className={`glass p-5 rounded-2xl border flex flex-col justify-between space-y-4 hover:border-white/20 transition duration-200 ${
                    isEnjoyed ? 'opacity-65 border-white/5 bg-slate-900/10' : 'border-white/10'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-xl border ${bgIconColor}`}>
                        <Icon className="w-4.5 h-4.5" />
                      </div>
                      <span className="text-[10px] font-bold tracking-wider uppercase text-gray-400">
                        {plan.activityType.toUpperCase()}
                      </span>
                    </div>

                    <button 
                      onClick={() => handleDelete(plan.planId)}
                      className="text-gray-500 hover:text-red-400 p-1 rounded hover:bg-red-500/10 transition cursor-pointer"
                    >
                      <Trash2 className="w-4.5 h-4.5" />
                    </button>
                  </div>

                  <div className="space-y-1">
                    <h4 className={`text-sm font-semibold tracking-tight ${isEnjoyed ? 'line-through text-gray-500' : 'text-white'}`}>
                      {plan.title}
                    </h4>
                    <div className="flex items-center gap-2 text-xs text-gray-400">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-violet-400" />
                        {plan.plannedDate} • {plan.durationHours} hrs
                      </span>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-white/5 flex justify-end">
                    <button
                      onClick={() => handleToggleStatus(plan.planId, plan.status)}
                      className={`text-xs py-1.5 px-3 rounded-xl border font-medium flex items-center gap-1.5 cursor-pointer transition ${
                        isEnjoyed 
                          ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20' 
                          : 'border-white/10 hover:border-white/15 text-gray-300 hover:text-white'
                      }`}
                    >
                      <CheckCircle className="w-4 h-4" />
                      {isEnjoyed ? '¡Disfrutado!' : 'Marcar Disfrutado'}
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
