'use client';

import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from '../context/AuthContext';
import { db, auth } from '../lib/firebase';
import { collection, query, where, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { sendPasswordResetEmail } from 'firebase/auth';
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart, Pie
} from 'recharts';
import { 
  LayoutDashboard, Inbox, Calendar, FolderGit2, Compass, LogOut, Copy, Check, 
  MessageSquare, User as UserIcon, Send, Sparkles, Shield, Clock, HelpCircle,
  Eye, EyeOff, Menu, X, ListTodo, Square
} from 'lucide-react';

import KPICards from '../components/KPICards';
import InboxModule from '../components/InboxModule';
import AgendaModule from '../components/AgendaModule';
import ProjectsModule from '../components/ProjectsModule';
import FreeTimeModule from '../components/FreeTimeModule';
import DailyTasksModule from '../components/DailyTasksModule';

function DashboardContent() {
  const { user, userData, signOut } = useAuth();
  const [activeTab, setActiveTab] = useState<'dashboard' | 'inbox' | 'agenda' | 'proyectos' | 'tiempo_libre'>('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  // Real-time collections states
  const [logs, setLogs] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [plans, setPlans] = useState<any[]>([]);
  const [dailyTasks, setDailyTasks] = useState<any[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  
  const [copied, setCopied] = useState(false);

  // Firestore Subscriptions (real-time sync)
  useEffect(() => {
    if (!user) return;

    setLoadingData(true);

    // 1. Logs subscription
    const qLogs = query(collection(db, 'inbox_logs'), where('userId', '==', user.uid));
    const unsubscribeLogs = onSnapshot(qLogs, (snapshot) => {
      const items = snapshot.docs.map(doc => ({ logId: doc.id, ...doc.data() }));
      // Client-side sort: newest first
      items.sort((a: any, b: any) => {
        const tA = a.createdAt?.seconds || 0;
        const tB = b.createdAt?.seconds || 0;
        return tB - tA;
      });
      setLogs(items);
    }, (err) => console.error("Error logs snapshot:", err));

    // 2. Events subscription
    const qEvents = query(collection(db, 'events_reminders'), where('userId', '==', user.uid));
    const unsubscribeEvents = onSnapshot(qEvents, (snapshot) => {
      const items = snapshot.docs.map(doc => ({ eventId: doc.id, ...doc.data() }));
      setEvents(items);
    }, (err) => console.error("Error events snapshot:", err));

    // 3. Projects subscription
    const qProjects = query(collection(db, 'projects_goals'), where('userId', '==', user.uid));
    const unsubscribeProjects = onSnapshot(qProjects, (snapshot) => {
      const items = snapshot.docs.map(doc => ({ projectId: doc.id, ...doc.data() }));
      setProjects(items);
    }, (err) => console.error("Error projects snapshot:", err));

    // 4. Plans subscription
    const qPlans = query(collection(db, 'free_time_plans'), where('userId', '==', user.uid));
    const unsubscribePlans = onSnapshot(qPlans, (snapshot) => {
      const items = snapshot.docs.map(doc => ({ planId: doc.id, ...doc.data() }));
      setPlans(items);
    }, (err) => console.error("Error plans snapshot:", err));

    // 5. Daily Tasks subscription
    const qDailyTasks = query(collection(db, 'daily_tasks'), where('userId', '==', user.uid));
    const unsubscribeDailyTasks = onSnapshot(qDailyTasks, (snapshot) => {
      const items = snapshot.docs.map(doc => ({ taskId: doc.id, ...doc.data() }));
      // Sort: incomplete first, newest first
      items.sort((a: any, b: any) => {
        if (a.completed !== b.completed) {
          return a.completed ? 1 : -1;
        }
        const tA = a.createdAt?.seconds || 0;
        const tB = b.createdAt?.seconds || 0;
        return tB - tA;
      });
      setDailyTasks(items);
      setLoadingData(false);
    }, (err) => {
      console.error("Error daily tasks snapshot:", err);
      setLoadingData(false);
    });

    return () => {
      unsubscribeLogs();
      unsubscribeEvents();
      unsubscribeProjects();
      unsubscribePlans();
      unsubscribeDailyTasks();
    };
  }, [user]);

  const handleCopyUid = () => {
    if (!user) return;
    navigator.clipboard.writeText(user.uid);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loadingData) {
    return (
      <div className="min-h-screen bg-[#030712] flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="relative w-16 h-16 mx-auto">
            <div className="absolute inset-0 rounded-full border-4 border-violet-500/20 animate-pulse"></div>
            <div className="absolute inset-0 rounded-full border-4 border-t-violet-500 animate-spin"></div>
          </div>
          <p className="text-sm text-gray-400 font-medium">Sincronizando Bitácora en tiempo real...</p>
        </div>
      </div>
    );
  }

  // Calculate chart data: Logs by category
  const categoriesCount = { inbox: 0, evento: 0, proyecto: 0, plan: 0 };
  logs.forEach(log => {
    const cat = log.parsedCategory || 'inbox';
    if (cat in categoriesCount) {
      categoriesCount[cat as keyof typeof categoriesCount]++;
    } else {
      categoriesCount.inbox++;
    }
  });

  const chartData = [
    { name: 'Notas (Inbox)', value: categoriesCount.inbox, color: '#f59e0b' },
    { name: 'Eventos/Agenda', value: categoriesCount.evento, color: '#3b82f6' },
    { name: 'Proyectos', value: categoriesCount.proyecto, color: '#8b5cf6' },
    { name: 'Tiempo Libre', value: categoriesCount.plan, color: '#10b981' },
  ].filter(c => c.value > 0);

  // Today's commitments
  const todayStr = new Date().toISOString().split('T')[0];
  const todayEvents = events.filter(e => e.date === todayStr && e.status === 'pendiente');

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-[#030712] relative overflow-x-hidden">
      
      {/* Mobile Top Navigation Header */}
      <header className="md:hidden flex items-center justify-between px-6 py-4 border-b border-white/5 bg-[#030712]/80 backdrop-blur sticky top-0 z-40">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-violet-600 to-fuchsia-600 flex items-center justify-center shadow-lg shadow-violet-500/25">
            <Sparkles className="w-4.5 h-4.5 text-white" />
          </div>
          <span className="font-bold text-white text-sm tracking-tight">Bitácora AI</span>
        </div>
        
        <button 
          onClick={() => setIsSidebarOpen(true)}
          className="text-gray-400 hover:text-white p-1 hover:bg-white/5 rounded-lg transition cursor-pointer"
        >
          <Menu className="w-6 h-6" />
        </button>
      </header>

      {/* Backdrop overlay for mobile drawer */}
      {isSidebarOpen && (
        <div 
          onClick={() => setIsSidebarOpen(false)}
          className="md:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-45"
        />
      )}

      {/* Sidebar - Premium Responsive Drawer */}
      <aside className={`fixed md:relative inset-y-0 left-0 w-64 glass border-r border-white/5 flex flex-col justify-between shrink-0 z-50 transform ${
        isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
      } md:translate-x-0 transition-transform duration-300 ease-in-out h-full`}>
        <div className="p-6 space-y-8">
          {/* Brand/Logo & Close Button for mobile */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-violet-600 to-fuchsia-600 flex items-center justify-center shadow-lg shadow-violet-500/30">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="font-bold text-white leading-none tracking-tight">Bitácora AI</h2>
                <span className="text-[10px] text-gray-500 font-semibold tracking-widest uppercase">Asistente</span>
              </div>
            </div>
            
            <button 
              onClick={() => setIsSidebarOpen(false)}
              className="md:hidden text-gray-400 hover:text-white p-1 hover:bg-white/5 rounded-lg transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation Menu */}
          <nav className="space-y-1">
            {[
              { id: 'dashboard', label: 'Inicio', icon: LayoutDashboard },
              { id: 'inbox', label: '1. Inbox / Bitácora', icon: Inbox },
              { id: 'agenda', label: '2. Agenda / Eventos', icon: Calendar },
              { id: 'proyectos', label: '3. Proyectos & Metas', icon: FolderGit2 },
              { id: 'tiempo_libre', label: '4. Tiempo Libre', icon: Compass },
              { id: 'tareas_diarias', label: '5. Tareas Diarias', icon: ListTodo },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveTab(tab.id as any);
                    setIsSidebarOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition cursor-pointer ${
                    isActive 
                      ? 'bg-violet-600/15 border border-violet-500/30 text-violet-300 shadow-md shadow-violet-500/5' 
                      : 'border border-transparent text-gray-400 hover:bg-white/5 hover:text-gray-200'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>

        {/* User profile & Link options */}
        <div className="p-6 border-t border-white/5 space-y-4">
          <div className="bg-slate-900/60 p-4 rounded-xl border border-white/5 space-y-2">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-violet-500/20 border border-violet-500/30 flex items-center justify-center">
                <UserIcon className="w-4 h-4 text-violet-300" />
              </div>
              <p className="text-xs font-semibold text-white truncate">{userData?.name || 'Usuario'}</p>
            </div>

            <div className="pt-2 border-t border-white/5 space-y-1.5">
              <span className="text-[9px] font-bold text-gray-500 uppercase tracking-wider block">ID de Vinculación Bot:</span>
              <div className="flex items-center justify-between gap-1 bg-slate-950 p-2 rounded-lg border border-white/5">
                <span className="text-[10px] text-gray-400 font-mono truncate">{user?.uid}</span>
                <button 
                  onClick={handleCopyUid}
                  className="text-gray-400 hover:text-white p-1 hover:bg-white/5 rounded cursor-pointer transition"
                  title="Copiar ID de Firebase para el Bot"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
          </div>

          <button 
            onClick={signOut}
            className="w-full flex items-center gap-2 justify-center py-2.5 px-4 rounded-xl border border-red-500/20 text-red-400 hover:bg-red-500/10 transition cursor-pointer text-xs font-semibold"
          >
            <LogOut className="w-4 h-4" />
            Cerrar Sesión
          </button>
        </div>
      </aside>

      {/* Main Panel */}
      <main className="flex-1 p-4 md:p-8 overflow-y-auto max-h-screen">
        {/* Header */}
        <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div>
            <h1 className="text-xl md:text-2xl font-bold tracking-tight text-white">
              {activeTab === 'dashboard' && 'Dashboard Principal'}
              {activeTab === 'inbox' && 'Módulo 1: Inbox / Bitácora Diaria'}
              {activeTab === 'agenda' && 'Módulo 2: Agenda & Notificaciones'}
              {activeTab === 'proyectos' && 'Módulo 3: Proyectos & Metas'}
              {activeTab === 'tiempo_libre' && 'Módulo 4: Tiempo Libre & Familia'}
              {activeTab === 'tareas_diarias' && 'Módulo 5: Tareas Diarias / Acciones'}
            </h1>
            <p className="text-xs text-gray-400 mt-1">
              {new Date().toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </div>

          <div className="flex gap-3">
            {/* Quick action button to Telegram */}
            <a 
              href={`https://t.me/Mibotvic_bot?start=${user?.uid}`}
              target="_blank" 
              rel="noopener noreferrer"
              className="bg-indigo-600 hover:bg-indigo-500 text-white font-medium py-2.5 px-4 rounded-xl text-xs transition flex items-center gap-2 cursor-pointer shadow-lg shadow-indigo-500/20"
            >
              <Send className="w-4 h-4" />
              Abrir Telegram Bot
            </a>
          </div>
        </header>

        {/* Tab Contents */}
        {activeTab === 'dashboard' && (
          <div className="space-y-8">
            {/* KPI metrics row */}
            <KPICards events={events} projects={projects} plans={plans} logs={logs} />

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              
              {/* Left & Center: Charts & Events list */}
              <div className="lg:col-span-2 space-y-8">
                
                {/* 1. Today's commitments list */}
                <div className="glass p-6 rounded-2xl border border-white/10 space-y-4">
                  <h3 className="text-md font-semibold text-white flex items-center gap-2">
                    <Clock className="w-4.5 h-4.5 text-blue-400" />
                    Compromisos para Hoy
                  </h3>
                  {todayEvents.length === 0 ? (
                    <p className="text-xs text-gray-400">No tienes compromisos agendados para hoy. ¡Día despejado!</p>
                  ) : (
                    <div className="space-y-2">
                      {todayEvents.map(e => (
                        <div key={e.eventId} className="flex justify-between items-center bg-slate-900/40 border border-white/5 p-3.5 rounded-xl text-xs">
                          <span className="font-semibold text-white">{e.title}</span>
                          <span className="text-gray-400 bg-white/5 py-1 px-2.5 rounded-lg border border-white/5">
                            {e.time || 'Todo el día'}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* 2. Charts panel */}
                {chartData.length > 0 && (
                  <div className="glass p-6 rounded-2xl border border-white/10 space-y-4">
                    <h3 className="text-md font-semibold text-white">Análisis de Distribución de Notas</h3>
                    <div className="h-64 flex items-center justify-center">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={chartData}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={80}
                            paddingAngle={5}
                            dataKey="value"
                          >
                            {chartData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip 
                            contentStyle={{ background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#fff' }} 
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    {/* Chart labels legend */}
                    <div className="flex justify-center gap-6 text-xs flex-wrap">
                      {chartData.map((item, idx) => (
                        <div key={idx} className="flex items-center gap-1.5">
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                          <span className="text-gray-400">{item.name} ({item.value})</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Right: Link helper instruction & Daily tasks preview */}
              <div className="lg:col-span-1 space-y-8">
                
                {/* Tareas Diarias Quick Card */}
                <div className="glass p-6 rounded-2xl border border-white/10 space-y-4 bg-gradient-to-b from-violet-500/5 to-transparent">
                  <h3 className="text-md font-semibold text-white flex items-center gap-2">
                    <ListTodo className="w-4.5 h-4.5 text-violet-400" />
                    Tareas del Día
                  </h3>
                  {dailyTasks.filter(t => !t.completed).length === 0 ? (
                    <p className="text-xs text-gray-400">¡Súper! No tienes tareas pendientes para hoy.</p>
                  ) : (
                    <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                      {dailyTasks.filter(t => !t.completed).map(task => (
                        <button
                          key={task.taskId}
                          onClick={async () => {
                            const docRef = doc(db, 'daily_tasks', task.taskId);
                            await updateDoc(docRef, { completed: true });
                          }}
                          className="w-full flex items-center gap-2.5 bg-slate-900/40 hover:bg-slate-900/60 border border-white/5 p-3 rounded-xl text-left text-xs text-gray-300 hover:text-white transition cursor-pointer"
                        >
                          <Square className="w-4 h-4 text-violet-400 shrink-0" />
                          <span className="truncate">{task.title}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="glass p-6 rounded-2xl border border-white/10 space-y-5 bg-gradient-to-b from-indigo-500/5 to-transparent">
                  <h3 className="text-md font-semibold text-white flex items-center gap-2">
                    <Shield className="w-5 h-5 text-indigo-400" />
                    Vinculación Multicanal
                  </h3>
                  <p className="text-xs text-gray-400 leading-relaxed">
                    Tu cuenta está lista para recibir registros rápidos de audio y texto mediante nuestro bot de Telegram.
                  </p>

                  <div className="space-y-4 text-xs">
                    <div className="flex gap-3">
                      <div className="w-6 h-6 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold shrink-0">1</div>
                      <p className="text-gray-300 leading-normal">
                        Haz clic en <strong>"Abrir Telegram Bot"</strong> arriba o busca al bot <strong>@Mibotvic_bot</strong> en tu app.
                      </p>
                    </div>
                    
                    <div className="flex gap-3">
                      <div className="w-6 h-6 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold shrink-0">2</div>
                      <p className="text-gray-300 leading-normal">
                        Presiona <strong>Iniciar</strong> (o escribe <code>/start</code>).
                      </p>
                    </div>

                    <div className="flex gap-3">
                      <div className="w-6 h-6 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold shrink-0">3</div>
                      <p className="text-gray-300 leading-normal">
                        ¡Listo! Cualquier audio de voz o mensaje de texto será transcrito y enrutado automáticamente a tu cuenta en tiempo real.
                      </p>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-white/5 text-center">
                    <p className="text-[10px] text-gray-500">
                      Bot de Telegram: <strong>t.me/Mibotvic_bot</strong>
                    </p>
                  </div>
                </div>
              </div>

            </div>
          </div>
        )}

        {activeTab === 'inbox' && <InboxModule logs={logs} userId={user?.uid || ''} />}
        {activeTab === 'agenda' && <AgendaModule events={events} userId={user?.uid || ''} />}
        {activeTab === 'proyectos' && <ProjectsModule projects={projects} userId={user?.uid || ''} />}
        {activeTab === 'tiempo_libre' && <FreeTimeModule plans={plans} userId={user?.uid || ''} />}
        {activeTab === 'tareas_diarias' && <DailyTasksModule tasks={dailyTasks} userId={user?.uid || ''} />}
      </main>

    </div>
  );
}

// Authentication Screen (Sign In & Sign Up)
function AuthScreen() {
  const { signIn, signUp } = useAuth();
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleForgotPassword = async () => {
    setErrorMsg('');
    setSuccessMsg('');
    if (!email) {
      setErrorMsg('Por favor, introduce tu correo electrónico en el campo superior primero.');
      return;
    }

    setLoading(true);
    try {
      await sendPasswordResetEmail(auth, email);
      setSuccessMsg('Se ha enviado un correo para restablecer tu contraseña. Revisa tu bandeja de entrada.');
    } catch (err: any) {
      console.error(err);
      let msg = 'Error al enviar el correo de recuperación.';
      if (err.code === 'auth/user-not-found') {
        msg = 'No existe ningún usuario registrado con este correo.';
      } else if (err.code === 'auth/invalid-email') {
        msg = 'El formato del correo electrónico no es válido.';
      } else if (err.message) {
        msg = err.message;
      }
      setErrorMsg(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setLoading(true);

    try {
      if (isSignUp) {
        if (!name.trim()) throw new Error('El nombre es obligatorio.');
        await signUp(email, password, name);
      } else {
        await signIn(email, password);
      }
    } catch (err: any) {
      console.error(err);
      let msg = 'Hubo un error al procesar la solicitud.';
      if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        msg = 'Credenciales incorrectas.';
      } else if (err.code === 'auth/email-already-in-use') {
        msg = 'Este correo electrónico ya está registrado.';
      } else if (err.message) {
        msg = err.message;
      }
      setErrorMsg(msg);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#030712] px-4 relative overflow-hidden">
      
      {/* Decorative background glows */}
      <div className="absolute top-1/4 left-1/4 w-80 h-80 rounded-full bg-violet-600/10 blur-3xl animate-pulse-slow"></div>
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 rounded-full bg-fuchsia-600/10 blur-3xl animate-pulse-slow" style={{ animationDelay: '2s' }}></div>

      <div className="w-full max-w-md glass p-8 rounded-3xl border border-white/10 space-y-6 shadow-2xl relative z-10">
        
        {/* Header logo */}
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-violet-600 to-fuchsia-600 flex items-center justify-center mx-auto shadow-xl shadow-violet-500/25">
            <Sparkles className="w-6 h-6 text-white" />
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-white">Bitácora Personal Inteligente</h2>
          <p className="text-xs text-gray-400">Captura de texto y voz multimodal con IA</p>
        </div>

        {errorMsg && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3.5 rounded-xl text-xs font-semibold text-center">
            {errorMsg}
          </div>
        )}

        {successMsg && (
          <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 p-3.5 rounded-xl text-xs font-semibold text-center">
            {successMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {isSignUp && (
            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-1.5 uppercase">Nombre</label>
              <input
                type="text"
                className="w-full glass-input p-3.5 rounded-xl text-sm"
                placeholder="Tu nombre"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                disabled={loading}
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-gray-400 mb-1.5 uppercase">Correo Electrónico</label>
            <input
              type="email"
              className="w-full glass-input p-3.5 rounded-xl text-sm"
              placeholder="tu@correo.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={loading}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-400 mb-1.5 uppercase">Contraseña</label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                className="w-full glass-input p-3.5 pr-11 rounded-xl text-sm"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition cursor-pointer p-1"
              >
                {showPassword ? <EyeOff className="w-4.5 h-4.5" /> : <Eye className="w-4.5 h-4.5" />}
              </button>
            </div>
          </div>

          {!isSignUp && (
            <div className="text-right">
              <button
                type="button"
                onClick={handleForgotPassword}
                className="text-xs text-gray-400 hover:text-violet-300 transition cursor-pointer font-medium"
              >
                ¿Olvidaste tu contraseña?
              </button>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white font-medium py-3.5 px-4 rounded-xl transition duration-200 flex items-center justify-center gap-2 text-sm shadow-xl shadow-violet-500/25 cursor-pointer mt-2"
          >
            {loading ? (
              <div className="w-5 h-5 rounded-full border-2 border-white/20 border-t-white animate-spin"></div>
            ) : (
              isSignUp ? 'Crear Cuenta' : 'Iniciar Sesión'
            )}
          </button>
        </form>

        <div className="text-center pt-2">
          <button
            onClick={() => {
              setIsSignUp(!isSignUp);
              setErrorMsg('');
            }}
            className="text-xs text-violet-400 hover:text-violet-300 font-semibold cursor-pointer"
          >
            {isSignUp ? '¿Ya tienes cuenta? Inicia Sesión' : '¿No tienes cuenta? Regístrate aquí'}
          </button>
        </div>

      </div>
    </div>
  );
}

// Shell Component inside AuthProvider
function AppShell() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#030712] flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="relative w-16 h-16 mx-auto">
            <div className="absolute inset-0 rounded-full border-4 border-violet-500/20 animate-pulse"></div>
            <div className="absolute inset-0 rounded-full border-4 border-t-violet-500 animate-spin"></div>
          </div>
          <p className="text-sm text-gray-400 font-medium">Iniciando aplicación...</p>
        </div>
      </div>
    );
  }

  return user ? <DashboardContent /> : <AuthScreen />;
}

export default function RootPage() {
  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js').then((reg) => {
          console.log('Service worker registered.', reg);
        }).catch((err) => {
          console.error('Service worker registration failed.', err);
        });
      });
    }
  }, []);

  return (
    <AuthProvider>
      <AppShell />
    </AuthProvider>
  );
}
