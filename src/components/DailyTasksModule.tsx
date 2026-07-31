'use client';

import React, { useState } from 'react';
import { db } from '../lib/firebase';
import { collection, addDoc, updateDoc, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';
import { Plus, Trash2, CheckCircle2, Square, ListTodo, Calendar } from 'lucide-react';

interface DailyTasksModuleProps {
  tasks: any[];
  userId: string;
}

export default function DailyTasksModule({ tasks, userId }: DailyTasksModuleProps) {
  const [title, setTitle] = useState('');
  const [taskDate, setTaskDate] = useState(new Date().toISOString().split('T')[0]);
  const [submitting, setSubmitting] = useState(false);
  const [filter, setFilter] = useState<'pendientes' | 'completadas' | 'todas'>('pendientes');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setSubmitting(true);
    try {
      const tasksRef = collection(db, 'daily_tasks');
      await addDoc(tasksRef, {
        userId,
        title: title.trim(),
        date: taskDate,
        completed: false,
        createdAt: serverTimestamp(),
      });
      setTitle('');
    } catch (error) {
      console.error('Error al agregar tarea diaria:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleComplete = async (taskId: string, currentCompleted: boolean) => {
    try {
      const taskRef = doc(db, 'daily_tasks', taskId);
      await updateDoc(taskRef, { completed: !currentCompleted });
    } catch (error) {
      console.error('Error al cambiar estado de la tarea:', error);
    }
  };

  const handleDelete = async (taskId: string) => {
    if (!confirm('¿Deseas eliminar esta tarea?')) return;
    try {
      await deleteDoc(doc(db, 'daily_tasks', taskId));
    } catch (error) {
      console.error('Error al eliminar tarea:', error);
    }
  };

  // Sort tasks chronologically by date
  const sortedTasks = [...tasks].sort((a, b) => a.date.localeCompare(b.date));

  const filteredTasks = sortedTasks.filter(t => {
    if (filter === 'todas') return true;
    if (filter === 'pendientes') return !t.completed;
    return t.completed;
  });

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* Form: Add Task */}
      <div className="lg:col-span-1">
        <div className="glass p-6 rounded-2xl border border-white/10 sticky top-6 space-y-4">
          <h3 className="text-lg font-semibold text-white">Nueva Acción / Tarea</h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-1.5 uppercase">Descripción</label>
              <input
                type="text"
                className="w-full glass-input p-3 rounded-xl text-sm"
                placeholder="Ej. Llamar al fontanero por gotera"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                disabled={submitting}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-1.5 uppercase">Planificado para</label>
              <input
                type="date"
                className="w-full glass-input p-3 rounded-xl text-sm"
                value={taskDate}
                onChange={(e) => setTaskDate(e.target.value)}
                required
                disabled={submitting}
              />
            </div>

            <button
              type="submit"
              disabled={submitting || !title.trim()}
              className="w-full bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white font-medium py-3 px-4 rounded-xl transition flex items-center justify-center gap-2 text-sm shadow-lg shadow-violet-500/20 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              {submitting ? 'Agregando...' : 'Agregar Tarea'}
            </button>
          </form>
        </div>
      </div>

      {/* List: Tasks */}
      <div className="lg:col-span-2 space-y-6">
        <div className="flex justify-between items-center">
          <div className="flex gap-2">
            {[
              { id: 'pendientes', label: 'Pendientes' },
              { id: 'completadas', label: 'Completadas' },
              { id: 'todas', label: 'Todas' },
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
          <span className="text-xs text-gray-500">Total: {filteredTasks.length} tareas</span>
        </div>

        {filteredTasks.length === 0 ? (
          <div className="glass p-12 rounded-2xl border border-white/10 text-center text-gray-400">
            <ListTodo className="w-12 h-12 mx-auto mb-4 text-gray-600 animate-pulse-slow" />
            <p>No tienes tareas en esta sección.</p>
            <p className="text-xs text-gray-500 mt-1">Escríbelas en el formulario de la izquierda para tener un seguimiento.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredTasks.map((task) => (
              <div 
                key={task.taskId} 
                className={`glass p-4 rounded-xl border flex justify-between items-center transition duration-200 ${
                  task.completed ? 'opacity-60 border-white/5 bg-slate-900/20' : 'border-white/10 hover:border-white/20'
                }`}
              >
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => handleToggleComplete(task.taskId, task.completed)}
                    className={`transition cursor-pointer ${task.completed ? 'text-emerald-500' : 'text-gray-500 hover:text-emerald-400'}`}
                  >
                    {task.completed ? <CheckCircle2 className="w-6 h-6 fill-emerald-500/10" /> : <Square className="w-6 h-6" />}
                  </button>

                  <div className="space-y-1">
                    <span className={`text-sm font-medium ${task.completed ? 'line-through text-gray-500' : 'text-white'}`}>
                      {task.title}
                    </span>
                    <div className="flex items-center gap-1.5 text-[10px] text-gray-400">
                      <Calendar className="w-3.5 h-3.5 text-violet-400" />
                      <span>{task.date}</span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => handleDelete(task.taskId)}
                  className="text-gray-500 hover:text-red-400 p-2 rounded-lg hover:bg-red-500/10 transition cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
