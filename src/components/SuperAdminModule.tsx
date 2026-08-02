'use client';

import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, Users, Zap, Mail, Search, CheckCircle2, 
  Send, Key, RefreshCw, AlertCircle, Award
} from 'lucide-react';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../lib/firebase';
import BrandBadge from './BrandBadge';

interface UserData {
  uid: string;
  email?: string;
  name?: string;
  displayName?: string;
  telegramChatId?: string;
  role?: 'superadmin' | 'user';
  subscriptionStatus?: 'active' | 'free' | 'pro';
  createdAt?: any;
}

export default function SuperAdminModule() {
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [notification, setNotification] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/users');
      const data = await res.json();
      if (data.users) {
        setUsers(data.users);
      } else {
        showNotification(data.error || 'Error al cargar la lista de usuarios desde la API.', 'error');
      }
    } catch (err: any) {
      console.error('Error cargando usuarios:', err);
      showNotification('Error de conexión al cargar la lista de usuarios.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const showNotification = (msg: string, type: 'success' | 'error' = 'success') => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 4000);
  };

  const handleToggleSubscription = async (user: UserData) => {
    const isPro = user.subscriptionStatus === 'active' || user.subscriptionStatus === 'pro';
    const newStatus = isPro ? 'free' : 'active';

    try {
      const res = await fetch('/api/admin/update-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uid: user.uid, subscriptionStatus: newStatus })
      });
      const data = await res.json();

      if (data.success) {
        setUsers(prev => prev.map(u => u.uid === user.uid ? { ...u, subscriptionStatus: newStatus } : u));
        showNotification(
          newStatus === 'active' 
            ? `⚡ Suscripción Pro Activada para ${user.email || user.name || user.uid}`
            : `Plan Gratuito establecido para ${user.email || user.name || user.uid}`
        );
      } else {
        showNotification(data.error || 'Error al actualizar la suscripción.', 'error');
      }
    } catch (err: any) {
      console.error(err);
      showNotification('Error al actualizar la suscripción del usuario.', 'error');
    }
  };

  const handleToggleRole = async (user: UserData) => {
    const isAdmin = user.role === 'superadmin';
    const newRole = isAdmin ? 'user' : 'superadmin';

    try {
      const res = await fetch('/api/admin/update-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uid: user.uid, role: newRole })
      });
      const data = await res.json();

      if (data.success) {
        setUsers(prev => prev.map(u => u.uid === user.uid ? { ...u, role: newRole } : u));
        showNotification(
          newRole === 'superadmin' 
            ? `👑 Rol Super Admin asignado a ${user.email || user.name || user.uid}`
            : `Rol estándar asignado a ${user.email || user.name || user.uid}`
        );
      } else {
        showNotification(data.error || 'Error al actualizar el rol.', 'error');
      }
    } catch (err: any) {
      console.error(err);
      showNotification('Error al actualizar el rol.', 'error');
    }
  };

  const handleResetPassword = async (email?: string) => {
    if (!email) {
      showNotification('El usuario no tiene un correo electrónico registrado.', 'error');
      return;
    }

    try {
      await sendPasswordResetEmail(auth, email);
      showNotification(`✉️ Correo de recuperación de contraseña enviado con éxito a ${email}`);
    } catch (err: any) {
      console.error(err);
      showNotification(`Error al enviar correo de recuperación: ${err.message || 'Inténtalo de nuevo'}`, 'error');
    }
  };

  const filteredUsers = users.filter(u => {
    const search = searchTerm.toLowerCase();
    return (
      (u.name || '').toLowerCase().includes(search) ||
      (u.email || '').toLowerCase().includes(search) ||
      (u.uid || '').toLowerCase().includes(search) ||
      (u.telegramChatId || '').toLowerCase().includes(search)
    );
  });

  const totalUsers = users.length;
  const activeSubscriptions = users.filter(u => u.subscriptionStatus === 'active' || u.subscriptionStatus === 'pro').length;
  const telegramLinkedUsers = users.filter(u => !!u.telegramChatId).length;

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 glass p-6 rounded-3xl border border-fuchsia-500/30 bg-gradient-to-r from-fuchsia-950/40 via-purple-950/30 to-indigo-950/40 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-fuchsia-500/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="space-y-1 relative z-10">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-fuchsia-500/20 text-fuchsia-300 border border-fuchsia-500/40 flex items-center gap-1">
              <ShieldCheck className="w-3 h-3 text-fuchsia-400" />
              SUPER ADMIN CONTROL
            </span>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            Panel de Administración Global
          </h1>
          <p className="text-xs text-gray-300">
            Gestiona usuarios registrados, activa suscripciones Pro y envía correos de restablecimiento de contraseña.
          </p>
        </div>

        <div className="flex items-center gap-3 relative z-10 shrink-0">
          <button
            onClick={fetchUsers}
            disabled={loading}
            className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white font-semibold text-xs flex items-center gap-2 transition cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 text-fuchsia-400 ${loading ? 'animate-spin' : ''}`} />
            <span>Actualizar</span>
          </button>
        </div>
      </div>

      {/* Notification Toast */}
      {notification && (
        <div className={`p-4 rounded-2xl border text-xs font-semibold flex items-center gap-3 shadow-xl animate-fade-in ${
          notification.type === 'success' 
            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' 
            : 'bg-red-500/10 border-red-500/30 text-red-300'
        }`}>
          {notification.type === 'success' ? <CheckCircle2 className="w-5 h-5 shrink-0" /> : <AlertCircle className="w-5 h-5 shrink-0" />}
          <span>{notification.msg}</span>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="glass p-5 rounded-2xl border border-white/10 space-y-2 bg-gradient-to-br from-indigo-500/5 to-transparent">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-400">Total Usuarios</span>
            <div className="w-8 h-8 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-white">{totalUsers}</div>
          <p className="text-[11px] text-gray-500">Cuentas registradas en la plataforma</p>
        </div>

        <div className="glass p-5 rounded-2xl border border-fuchsia-500/20 space-y-2 bg-gradient-to-br from-fuchsia-500/10 via-purple-500/5 to-transparent shadow-lg shadow-fuchsia-500/5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-fuchsia-300">Suscripciones Pro Activas</span>
            <div className="w-8 h-8 rounded-xl bg-fuchsia-500/20 border border-fuchsia-500/40 flex items-center justify-center text-fuchsia-400">
              <Zap className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-white">{activeSubscriptions}</div>
          <p className="text-[11px] text-fuchsia-400/80">Usuarios con membresía Pro activada</p>
        </div>

        <div className="glass p-5 rounded-2xl border border-cyan-500/20 space-y-2 bg-gradient-to-br from-cyan-500/5 to-transparent">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-cyan-300">Telegram Vinculados</span>
            <div className="w-8 h-8 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
              <Send className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-white">{telegramLinkedUsers}</div>
          <p className="text-[11px] text-gray-500">Cuentas enlazadas al Bot de Telegram</p>
        </div>
      </div>

      {/* Users Table Card */}
      <div className="glass rounded-3xl border border-white/10 p-6 space-y-4 shadow-2xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-md font-bold text-white flex items-center gap-2">
              <Users className="w-5 h-5 text-fuchsia-400" />
              Gestión de Usuarios Registrados
            </h3>
            <p className="text-xs text-gray-400">Administra accesos, activa suscripciones y restablece contraseñas.</p>
          </div>

          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar por correo, nombre o UID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full glass-input pl-10 pr-4 py-2 rounded-xl text-xs"
            />
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-white/10 text-gray-400 uppercase tracking-wider font-semibold text-[10px]">
                <th className="py-3 px-4">Usuario</th>
                <th className="py-3 px-4">Correo</th>
                <th className="py-3 px-4">Telegram Bot</th>
                <th className="py-3 px-4">Suscripción</th>
                <th className="py-3 px-4">Rol</th>
                <th className="py-3 px-4 text-right">Acciones de Admin</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-gray-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto text-fuchsia-400 mb-2" />
                    Cargando lista de usuarios desde el servidor...
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-gray-400">
                    No se encontraron usuarios que coincidan con la búsqueda.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => {
                  const isPro = u.subscriptionStatus === 'active' || u.subscriptionStatus === 'pro';
                  const isAdmin = u.role === 'superadmin';

                  return (
                    <tr key={u.uid} className="hover:bg-white/[0.02] transition">
                      
                      {/* Name */}
                      <td className="py-3.5 px-4 font-semibold text-white">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-violet-600 to-fuchsia-600 flex items-center justify-center font-bold text-white text-[11px] shrink-0">
                            {(u.name || u.displayName || u.email || 'U').charAt(0).toUpperCase()}
                          </div>
                          <span>{u.name || u.displayName || 'Usuario'}</span>
                        </div>
                      </td>

                      {/* Email */}
                      <td className="py-3.5 px-4 text-gray-300">
                        {u.email ? (
                          <div className="flex items-center gap-1.5">
                            <Mail className="w-3.5 h-3.5 text-gray-500 shrink-0" />
                            <span>{u.email}</span>
                          </div>
                        ) : (
                          <span className="text-gray-500 italic font-mono text-[10px]">{u.uid.slice(0, 12)}...</span>
                        )}
                      </td>

                      {/* Telegram */}
                      <td className="py-3.5 px-4">
                        {u.telegramChatId ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 font-mono text-[10px]">
                            <Send className="w-3 h-3 text-cyan-400" />
                            {u.telegramChatId}
                          </span>
                        ) : (
                          <span className="text-gray-500 text-[11px]">Sin Vincular</span>
                        )}
                      </td>

                      {/* Subscription Status */}
                      <td className="py-3.5 px-4">
                        {isPro ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold text-[10px] shadow-sm shadow-emerald-500/20">
                            <Zap className="w-3 h-3 text-emerald-400 fill-emerald-400" />
                            Pro Activa
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/5 text-gray-400 border border-white/10 text-[10px]">
                            Plan Gratuito
                          </span>
                        )}
                      </td>

                      {/* Role */}
                      <td className="py-3.5 px-4">
                        {isAdmin ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-fuchsia-500/20 text-fuchsia-300 border border-fuchsia-500/40 text-[10px] font-bold">
                            <Award className="w-3 h-3 text-fuchsia-400" />
                            Super Admin
                          </span>
                        ) : (
                          <span className="text-gray-500 text-[11px]">Usuario</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          
                          {/* Toggle Subscription */}
                          <button
                            onClick={() => handleToggleSubscription(u)}
                            className={`px-3 py-1.5 rounded-xl font-semibold text-[11px] transition cursor-pointer flex items-center gap-1.5 ${
                              isPro
                                ? 'bg-red-500/10 hover:bg-red-500/20 text-red-300 border border-red-500/20'
                                : 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-lg shadow-emerald-600/20'
                            }`}
                            title={isPro ? 'Desactivar Suscripción Pro' : 'Activar Suscripción Pro'}
                          >
                            <Zap className="w-3 h-3" />
                            <span>{isPro ? 'Quitar Pro' : 'Activar Pro'}</span>
                          </button>

                          {/* Reset Password */}
                          <button
                            onClick={() => handleResetPassword(u.email)}
                            disabled={!u.email}
                            className="px-3 py-1.5 rounded-xl bg-violet-600/20 hover:bg-violet-600/30 border border-violet-500/30 text-violet-300 font-semibold text-[11px] transition cursor-pointer flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
                            title="Enviar correo de recuperación de contraseña"
                          >
                            <Key className="w-3 h-3 text-violet-400" />
                            <span>Reset Pass</span>
                          </button>

                          {/* Toggle Role */}
                          <button
                            onClick={() => handleToggleRole(u)}
                            className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 hover:text-white transition cursor-pointer"
                            title={isAdmin ? 'Quitar Rol de Admin' : 'Hacer Super Admin'}
                          >
                            <ShieldCheck className={`w-3.5 h-3.5 ${isAdmin ? 'text-fuchsia-400' : 'text-gray-400'}`} />
                          </button>

                        </div>
                      </td>

                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer Brand Badge */}
        <div className="pt-4 border-t border-white/5 flex justify-center">
          <BrandBadge variant="floating" />
        </div>

      </div>

    </div>
  );
}
