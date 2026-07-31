'use client';

import React from 'react';
import { Calendar, Rocket, Compass, Inbox } from 'lucide-react';

interface KPICardsProps {
  events: any[];
  projects: any[];
  plans: any[];
  logs: any[];
}

export default function KPICards({ events, projects, plans, logs }: KPICardsProps) {
  // 1. Calculate events this week (today + 7 days)
  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];
  const nextWeek = new Date();
  nextWeek.setDate(now.getDate() + 7);
  const nextWeekStr = nextWeek.toISOString().split('T')[0];

  const upcomingEvents = events.filter(e => 
    e.status === 'pendiente' && 
    e.date >= todayStr && 
    e.date <= nextWeekStr
  ).length;

  // 2. Active projects
  const activeProjects = projects.filter(p => p.status === 'en_progreso').length;

  // 3. Planned free time hours
  const plannedHours = plans
    .filter(p => p.status === 'planificado')
    .reduce((sum, p) => sum + (Number(p.durationHours) || 0), 0);

  // 4. Inbox entries created today
  const logsToday = logs.filter(log => {
    if (!log.createdAt) return false;
    // Firebase timestamps have a seconds property or are standard Dates
    const logDate = log.createdAt.seconds 
      ? new Date(log.createdAt.seconds * 1000) 
      : new Date(log.createdAt);
    return logDate.toDateString() === now.toDateString();
  }).length;

  const cardData = [
    {
      title: 'Compromisos de la Semana',
      value: upcomingEvents,
      subtitle: 'Próximos 7 días',
      icon: Calendar,
      gradient: 'from-blue-500/20 to-indigo-500/20 text-blue-400 border-blue-500/30',
      iconBg: 'bg-blue-500/10 text-blue-400',
    },
    {
      title: 'Proyectos & Metas Activas',
      value: activeProjects,
      subtitle: 'En progreso',
      icon: Rocket,
      gradient: 'from-violet-500/20 to-fuchsia-500/20 text-violet-400 border-violet-500/30',
      iconBg: 'bg-violet-500/10 text-violet-400',
    },
    {
      title: 'Tiempo Libre Reservado',
      value: `${plannedHours}h`,
      subtitle: 'Planes planificados',
      icon: Compass,
      gradient: 'from-emerald-500/20 to-teal-500/20 text-emerald-400 border-emerald-500/30',
      iconBg: 'bg-emerald-500/10 text-emerald-400',
    },
    {
      title: 'Entradas Rápidas (Inbox)',
      value: logsToday,
      subtitle: 'Capturas de hoy',
      icon: Inbox,
      gradient: 'from-amber-500/20 to-orange-500/20 text-amber-400 border-amber-500/30',
      iconBg: 'bg-amber-500/10 text-amber-400',
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      {cardData.map((card, idx) => {
        const Icon = card.icon;
        return (
          <div 
            key={idx} 
            className={`glass-interactive p-6 rounded-2xl border bg-gradient-to-br ${card.gradient}`}
          >
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-gray-400">{card.title}</p>
                <h3 className="text-3xl font-bold mt-2 tracking-tight">{card.value}</h3>
                <p className="text-xs text-gray-400 mt-1">{card.subtitle}</p>
              </div>
              <div className={`p-3 rounded-xl ${card.iconBg} border border-white/5`}>
                <Icon className="w-6 h-6" />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
