'use client';

import React, { useState } from 'react';
import { db } from '../lib/firebase';
import { collection, addDoc, updateDoc, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';
import { Plus, Trash2, CheckSquare, Square, Calendar, PlusCircle, ArrowRight, FolderKanban } from 'lucide-react';

interface ProjectsModuleProps {
  projects: any[];
  userId: string;
}

export default function ProjectsModule({ projects, userId }: ProjectsModuleProps) {
  // Project Form States
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [targetDate, setTargetDate] = useState('');
  const [category, setCategory] = useState<'profesional' | 'personal' | 'aprendizaje'>('profesional');
  const [tempTaskText, setTempTaskText] = useState('');
  const [taskList, setTaskList] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [newTasksInputs, setNewTasksInputs] = useState<{[projectId: string]: string}>({});

  const handleAddTempTask = () => {
    if (!tempTaskText.trim()) return;
    setTaskList([...taskList, tempTaskText.trim()]);
    setTempTaskText('');
  };

  const handleRemoveTempTask = (index: number) => {
    setTaskList(taskList.filter((_, idx) => idx !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) return;

    setSubmitting(true);
    try {
      const projectsRef = collection(db, 'projects_goals');
      
      const tasksFormatted = taskList.map((taskTitle, idx) => ({
        taskId: `task_${Date.now()}_${idx}`,
        title: taskTitle,
        completed: false
      }));

      await addDoc(projectsRef, {
        userId,
        title,
        description,
        targetDate: targetDate || '',
        status: 'en_progreso',
        category,
        tasks: tasksFormatted,
        createdAt: serverTimestamp(),
      });

      setTitle('');
      setDescription('');
      setTargetDate('');
      setCategory('profesional');
      setTaskList([]);
      setIsAdding(false);
    } catch (error) {
      console.error('Error al agregar proyecto:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleSubtask = async (projectId: string, taskId: string) => {
    const project = projects.find(p => p.projectId === projectId);
    if (!project) return;

    const updatedTasks = project.tasks.map((task: any) => {
      if (task.taskId === taskId) {
        return { ...task, completed: !task.completed };
      }
      return task;
    });

    try {
      const projectRef = doc(db, 'projects_goals', projectId);
      await updateDoc(projectRef, { tasks: updatedTasks });
    } catch (error) {
      console.error('Error al actualizar subtarea:', error);
    }
  };

  const handleAddSubtask = async (projectId: string) => {
    const text = newTasksInputs[projectId];
    if (!text || !text.trim()) return;

    const project = projects.find(p => p.projectId === projectId);
    if (!project) return;

    const newSubtask = {
      taskId: `task_${Date.now()}`,
      title: text.trim(),
      completed: false
    };

    const updatedTasks = [...(project.tasks || []), newSubtask];

    try {
      const projectRef = doc(db, 'projects_goals', projectId);
      await updateDoc(projectRef, { tasks: updatedTasks });
      setNewTasksInputs({
        ...newTasksInputs,
        [projectId]: ''
      });
    } catch (error) {
      console.error('Error al agregar subtarea:', error);
    }
  };

  const handleChangeStatus = async (projectId: string, nextStatus: 'en_progreso' | 'completado' | 'pausado') => {
    try {
      const projectRef = doc(db, 'projects_goals', projectId);
      await updateDoc(projectRef, { status: nextStatus });
    } catch (error) {
      console.error('Error al actualizar estado del proyecto:', error);
    }
  };

  const handleDeleteProject = async (projectId: string) => {
    if (!confirm('¿Deseas eliminar este proyecto/meta permanentemente?')) return;
    try {
      await deleteDoc(doc(db, 'projects_goals', projectId));
    } catch (error) {
      console.error('Error al eliminar proyecto:', error);
    }
  };

  // Group projects by status
  const enProgreso = projects.filter(p => p.status === 'en_progreso');
  const pausados = projects.filter(p => p.status === 'pausado');
  const completados = projects.filter(p => p.status === 'completado');

  const getCategoryColor = (cat: string) => {
    switch (cat) {
      case 'profesional': return 'bg-sky-500/10 text-sky-400 border-sky-500/20';
      case 'personal': return 'bg-pink-500/10 text-pink-400 border-pink-500/20';
      case 'aprendizaje': return 'bg-violet-500/10 text-violet-400 border-violet-500/20';
      default: return 'bg-gray-500/10 text-gray-400 border-gray-500/20';
    }
  };

  return (
    <div className="space-y-6">
      {/* Top action bar */}
      <div className="flex justify-between items-center">
        <h3 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
          <FolderKanban className="w-5 h-5 text-violet-400" />
          Proyectos & Metas de Vida
        </h3>
        <button
          onClick={() => setIsAdding(!isAdding)}
          className="bg-violet-600 hover:bg-violet-500 text-white font-medium py-2 px-4 rounded-xl text-xs transition flex items-center gap-1.5 cursor-pointer shadow-lg shadow-violet-500/20"
        >
          {isAdding ? 'Cerrar Formulario' : 'Nuevo Proyecto'}
        </button>
      </div>

      {/* Add Project Form (Collapsible) */}
      {isAdding && (
        <div className="glass p-6 rounded-2xl border border-white/10 max-w-2xl mx-auto">
          <h3 className="text-lg font-semibold mb-4 text-white">Nuevo Proyecto / Objetivo</h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-1.5 uppercase">Título del Proyecto</label>
                <input
                  type="text"
                  className="w-full glass-input p-3 rounded-xl text-sm"
                  placeholder="Ej. Lanzar mi sitio portafolio"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-1.5 uppercase">Fecha Límite</label>
                <input
                  type="date"
                  className="w-full glass-input p-3 rounded-xl text-sm"
                  value={targetDate}
                  onChange={(e) => setTargetDate(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-1.5 uppercase">Breve Descripción</label>
              <textarea
                className="w-full glass-input p-3 rounded-xl text-sm"
                rows={2}
                placeholder="Describe el objetivo y alcance de esta meta..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-1.5 uppercase">Categoría</label>
                <select
                  className="w-full glass-input p-3 rounded-xl text-sm"
                  value={category}
                  onChange={(e) => setCategory(e.target.value as any)}
                >
                  <option value="profesional">💼 Profesional</option>
                  <option value="personal">🏡 Personal</option>
                  <option value="aprendizaje">🎓 Aprendizaje</option>
                </select>
              </div>

              {/* Dynamic Task Builder */}
              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-gray-400 mb-1.5 uppercase">Agregar Subtareas / Hitos</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    className="flex-1 glass-input p-3 rounded-xl text-sm"
                    placeholder="Ej. Registrar el dominio .com"
                    value={tempTaskText}
                    onChange={(e) => setTempTaskText(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTempTask())}
                  />
                  <button
                    type="button"
                    onClick={handleAddTempTask}
                    className="bg-white/10 hover:bg-white/15 border border-white/5 text-gray-200 px-3 rounded-xl cursor-pointer transition flex items-center justify-center"
                  >
                    <PlusCircle className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>

            {/* List of subtasks to be added */}
            {taskList.length > 0 && (
              <div className="bg-slate-950/40 border border-white/5 p-4 rounded-xl space-y-2">
                <p className="text-xs font-semibold text-gray-400 uppercase">Subtareas listadas ({taskList.length}):</p>
                <div className="flex flex-wrap gap-2">
                  {taskList.map((task, idx) => (
                    <span 
                      key={idx} 
                      className="bg-violet-500/10 border border-violet-500/20 text-violet-300 text-xs px-3 py-1 rounded-lg flex items-center gap-1.5"
                    >
                      {task}
                      <button 
                        type="button" 
                        onClick={() => handleRemoveTempTask(idx)}
                        className="text-violet-400 hover:text-red-400 ml-1 font-bold cursor-pointer"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={submitting || !title.trim()}
              className="w-full bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white font-medium py-3 px-4 rounded-xl transition flex items-center justify-center gap-2 text-sm shadow-lg shadow-violet-500/20 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              {submitting ? 'Creando...' : 'Crear Proyecto'}
            </button>
          </form>
        </div>
      )}

      {/* Kanban Board Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Column 1: En Progreso */}
        <div className="space-y-4">
          <div className="flex justify-between items-center border-b border-sky-500/30 pb-2">
            <h4 className="text-sm font-semibold text-sky-400 tracking-wider uppercase flex items-center gap-1.5">
              <span>🔵</span> En Progreso ({enProgreso.length})
            </h4>
          </div>
          <div className="space-y-4 max-h-[600px] overflow-y-auto pr-1">
            {enProgreso.map(p => renderProjectCard(p))}
          </div>
        </div>

        {/* Column 2: Pausados */}
        <div className="space-y-4">
          <div className="flex justify-between items-center border-b border-yellow-500/30 pb-2">
            <h4 className="text-sm font-semibold text-yellow-400 tracking-wider uppercase flex items-center gap-1.5">
              <span>🟡</span> Pausados ({pausados.length})
            </h4>
          </div>
          <div className="space-y-4 max-h-[600px] overflow-y-auto pr-1">
            {pausados.map(p => renderProjectCard(p))}
          </div>
        </div>

        {/* Column 3: Completados */}
        <div className="space-y-4">
          <div className="flex justify-between items-center border-b border-emerald-500/30 pb-2">
            <h4 className="text-sm font-semibold text-emerald-400 tracking-wider uppercase flex items-center gap-1.5">
              <span>🟢</span> Completados ({completados.length})
            </h4>
          </div>
          <div className="space-y-4 max-h-[600px] overflow-y-auto pr-1">
            {completados.map(p => renderProjectCard(p))}
          </div>
        </div>

      </div>
    </div>
  );

  // Render function for individual project card
  function renderProjectCard(project: any) {
    const completedTasks = project.tasks.filter((t: any) => t.completed).length;
    const totalTasks = project.tasks.length;
    const progressPercent = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    return (
      <div 
        key={project.projectId} 
        className="glass p-5 rounded-2xl border border-white/10 space-y-4 hover:border-white/20 transition duration-200"
      >
        <div className="flex justify-between items-start">
          <span className={`px-2 py-0.5 rounded-full border text-[10px] font-bold tracking-wider ${getCategoryColor(project.category)}`}>
            {project.category.toUpperCase()}
          </span>
          
          <button 
            onClick={() => handleDeleteProject(project.projectId)}
            className="text-gray-500 hover:text-red-400 p-1 rounded hover:bg-red-500/10 cursor-pointer transition"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-1">
          <h5 className="font-bold text-white text-md tracking-tight leading-snug">{project.title}</h5>
          <p className="text-xs text-gray-400 line-clamp-2 leading-relaxed">{project.description}</p>
        </div>

        {project.targetDate && (
          <div className="flex items-center gap-1 text-[11px] text-gray-400">
            <Calendar className="w-3.5 h-3.5 text-violet-400" />
            <span>Plazo: {project.targetDate}</span>
          </div>
        )}

        {/* Progress Bar */}
        {totalTasks > 0 && (
          <div className="space-y-1">
            <div className="flex justify-between text-[10px] font-medium text-gray-400">
              <span>Progreso de Tareas</span>
              <span>{completedTasks}/{totalTasks} ({progressPercent}%)</span>
            </div>
            <div className="w-full bg-slate-950 h-1.5 rounded-full overflow-hidden border border-white/5">
              <div 
                className="bg-gradient-to-r from-violet-500 to-fuchsia-500 h-full rounded-full transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        )}

        {/* Subtask checklist */}
        <div className="space-y-2 pt-2 border-t border-white/5">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Hitos / Subtareas:</p>
          
          {totalTasks > 0 ? (
            <div className="space-y-1.5 max-h-[140px] overflow-y-auto pr-1">
              {project.tasks.map((task: any) => (
                <button
                  key={task.taskId}
                  onClick={() => handleToggleSubtask(project.projectId, task.taskId)}
                  className="w-full flex items-start gap-2 text-left text-xs text-gray-300 hover:text-white transition group py-0.5 cursor-pointer"
                >
                  <span className="text-gray-500 group-hover:text-violet-400 shrink-0 mt-0.5">
                    {task.completed ? <CheckSquare className="w-4.5 h-4.5 text-emerald-400 fill-emerald-500/10" /> : <Square className="w-4.5 h-4.5" />}
                  </span>
                  <span className={`leading-normal ${task.completed ? 'line-through text-gray-500 font-normal' : ''}`}>
                    {task.title}
                  </span>
                </button>
              ))}
            </div>
          ) : (
            <p className="text-[10px] text-gray-500 italic">Sin hitos registrados aún.</p>
          )}

          {/* Quick task adder input */}
          <div className="flex gap-1.5 pt-1.5">
            <input
              type="text"
              className="flex-1 bg-slate-950/60 border border-white/5 text-[10px] p-2 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-violet-500/50"
              placeholder="Agregar hito..."
              value={newTasksInputs[project.projectId] || ''}
              onChange={(e) => setNewTasksInputs({
                ...newTasksInputs,
                [project.projectId]: e.target.value
              })}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddSubtask(project.projectId);
                }
              }}
            />
            <button
              onClick={() => handleAddSubtask(project.projectId)}
              className="bg-violet-600/20 text-violet-300 hover:bg-violet-600/30 border border-violet-500/20 px-2.5 py-1.5 rounded-lg transition text-[10px] font-semibold cursor-pointer shrink-0"
            >
              Agregar
            </button>
          </div>
        </div>

        {/* Status transitions footer */}
        <div className="pt-3 border-t border-white/5 flex gap-1 justify-end text-[10px] font-medium">
          {project.status !== 'en_progreso' && (
            <button 
              onClick={() => handleChangeStatus(project.projectId, 'en_progreso')}
              className="py-1 px-2.5 rounded-lg border border-sky-500/20 text-sky-400 hover:bg-sky-500/10 cursor-pointer transition"
            >
              Iniciar
            </button>
          )}
          {project.status !== 'pausado' && (
            <button 
              onClick={() => handleChangeStatus(project.projectId, 'pausado')}
              className="py-1 px-2.5 rounded-lg border border-yellow-500/20 text-yellow-400 hover:bg-yellow-500/10 cursor-pointer transition"
            >
              Pausar
            </button>
          )}
          {project.status !== 'completado' && (
            <button 
              onClick={() => handleChangeStatus(project.projectId, 'completado')}
              className="py-1 px-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer transition flex items-center gap-1 border border-transparent"
            >
              Completar <ArrowRight className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>
    );
  }
}
