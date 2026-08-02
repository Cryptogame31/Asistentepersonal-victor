'use client';

import React, { useState, useEffect } from 'react';
import { Download, Smartphone, Monitor, Share, PlusSquare, CheckCircle, X, Sparkles, ArrowRight } from 'lucide-react';
import BrandBadge from './BrandBadge';

interface InstallAppModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function InstallAppModal({ isOpen, onClose }: InstallAppModalProps) {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [activeTab, setActiveTab] = useState<'android' | 'ios' | 'desktop'>('android');

  useEffect(() => {
    // Detect if already running as installed PWA
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
    }

    // Capture native install prompt (Chrome/Edge/Android)
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Detect device platform for default tab
    const userAgent = navigator.userAgent.toLowerCase();
    if (/iphone|ipad|ipod/.test(userAgent)) {
      setActiveTab('ios');
    } else if (/android/.test(userAgent)) {
      setActiveTab('android');
    } else {
      setActiveTab('desktop');
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setIsInstalled(true);
      setDeferredPrompt(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-lg overflow-hidden bg-gray-900/95 border border-violet-500/30 rounded-2xl shadow-2xl text-gray-100">
        
        {/* Header Background Glow */}
        <div className="absolute -top-24 -left-24 w-60 h-60 bg-violet-600/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -top-24 -right-24 w-60 h-60 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none" />

        {/* Modal Header */}
        <div className="relative flex items-center justify-between p-6 border-b border-gray-800">
          <div className="flex items-center gap-3">
            <div className="relative w-12 h-12 overflow-hidden rounded-xl bg-gradient-to-tr from-violet-600 to-indigo-500 p-0.5 shadow-lg shadow-violet-500/25">
              <img src="/icon.png" alt="App Icon" className="w-full h-full object-cover rounded-[10px]" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-1.5">
                Instalar Asistente Personal
                <Sparkles className="w-4 h-4 text-violet-400" />
              </h3>
              <p className="text-xs text-gray-400">Acceso rápido desde tu celular o escritorio</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body Content */}
        <div className="p-6 space-y-6">

          {/* Already Installed Alert */}
          {isInstalled ? (
            <div className="flex items-center gap-3 p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-300">
              <CheckCircle className="w-6 h-6 flex-shrink-0" />
              <div>
                <p className="font-semibold text-sm">¡La aplicación ya está instalada!</p>
                <p className="text-xs text-emerald-400/80">Estás ejecutando la App en modo nativo.</p>
              </div>
            </div>
          ) : (
            <>
              {/* Native 1-Click Install Button (Android / Windows / Mac Chrome & Edge) */}
              {deferredPrompt && (
                <div className="p-4 bg-gradient-to-r from-violet-900/40 via-indigo-900/40 to-purple-900/40 border border-violet-500/40 rounded-xl space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-bold text-sm text-white">Instalación en 1-Clic Disponible</p>
                      <p className="text-xs text-gray-300">Tu navegador permite instalar la App directamente.</p>
                    </div>
                  </div>
                  <button
                    onClick={handleInstallClick}
                    className="w-full py-3 px-4 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-semibold rounded-lg shadow-lg shadow-violet-600/30 flex items-center justify-center gap-2 transition-all transform active:scale-95"
                  >
                    <Download className="w-5 h-5" />
                    Instalar App en este Dispositivo
                  </button>
                </div>
              )}

              {/* Tabs for Manual Instructions */}
              <div className="space-y-4">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Instrucciones según tu dispositivo:</p>
                
                <div className="grid grid-cols-3 gap-2 p-1 bg-gray-950/60 rounded-xl border border-gray-800">
                  <button
                    onClick={() => setActiveTab('android')}
                    className={`py-2 px-3 text-xs font-medium rounded-lg flex items-center justify-center gap-1.5 transition-all ${
                      activeTab === 'android' 
                        ? 'bg-violet-600 text-white shadow-md' 
                        : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    <Smartphone className="w-3.5 h-3.5" />
                    Android
                  </button>
                  <button
                    onClick={() => setActiveTab('ios')}
                    className={`py-2 px-3 text-xs font-medium rounded-lg flex items-center justify-center gap-1.5 transition-all ${
                      activeTab === 'ios' 
                        ? 'bg-violet-600 text-white shadow-md' 
                        : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    <Smartphone className="w-3.5 h-3.5" />
                    iPhone (iOS)
                  </button>
                  <button
                    onClick={() => setActiveTab('desktop')}
                    className={`py-2 px-3 text-xs font-medium rounded-lg flex items-center justify-center gap-1.5 transition-all ${
                      activeTab === 'desktop' 
                        ? 'bg-violet-600 text-white shadow-md' 
                        : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    <Monitor className="w-3.5 h-3.5" />
                    PC / Mac
                  </button>
                </div>

                {/* Tab Instructions Content */}
                <div className="p-4 bg-gray-950/80 rounded-xl border border-gray-800/80 text-sm space-y-3">
                  
                  {activeTab === 'android' && (
                    <div className="space-y-2 text-gray-300">
                      <p className="font-semibold text-white flex items-center gap-2">
                        <Smartphone className="w-4 h-4 text-emerald-400" />
                        Instalar en Android:
                      </p>
                      <ol className="list-decimal list-inside space-y-1.5 text-xs text-gray-300">
                        <li>Abre el menú de Chrome o tu navegador (los <strong className="text-white">3 puntos ⋮</strong> arriba a la derecha).</li>
                        <li>Selecciona <strong className="text-violet-300">"Instalar aplicación"</strong> o <strong className="text-violet-300">"Agregar a pantalla de inicio"</strong>.</li>
                        <li>Confirma en <strong className="text-white">"Instalar"</strong> y el icono aparecerá en tu menú de aplicaciones.</li>
                      </ol>
                    </div>
                  )}

                  {activeTab === 'ios' && (
                    <div className="space-y-2 text-gray-300">
                      <p className="font-semibold text-white flex items-center gap-2">
                        <Smartphone className="w-4 h-4 text-sky-400" />
                        Instalar en iPhone (Safari):
                      </p>
                      <ol className="list-decimal list-inside space-y-2 text-xs text-gray-300">
                        <li className="flex items-center gap-2">
                          <span>1. Toca el botón de <strong className="text-white">Compartir</strong></span>
                          <Share className="w-4 h-4 text-sky-400 inline" />
                          <span>en la barra inferior de Safari.</span>
                        </li>
                        <li className="flex items-center gap-2">
                          <span>2. Desplázate hacia abajo y selecciona <strong className="text-violet-300">"Agregar a inicio"</strong></span>
                          <PlusSquare className="w-4 h-4 text-violet-400 inline" />
                        </li>
                        <li>3. Presiona <strong className="text-white">"Agregar"</strong> arriba a la derecha. ¡Listo!</li>
                      </ol>
                    </div>
                  )}

                  {activeTab === 'desktop' && (
                    <div className="space-y-2 text-gray-300">
                      <p className="font-semibold text-white flex items-center gap-2">
                        <Monitor className="w-4 h-4 text-violet-400" />
                        Instalar en Computadora (Windows / Mac):
                      </p>
                      <ol className="list-decimal list-inside space-y-1.5 text-xs text-gray-300">
                        <li>En Chrome o Edge, busca el ícono de <strong className="text-violet-300">"Instalar App" 📥</strong> a la derecha de la barra de direcciones (URL).</li>
                        <li>Haz clic en <strong className="text-white">"Instalar"</strong>.</li>
                        <li>La App se abrirá en su propia ventana independiente y creará un acceso directo en tu escritorio y barra de tareas.</li>
                      </ol>
                    </div>
                  )}

                </div>
              </div>
            </>
          )}

        </div>

        {/* Footer */}
        <div className="p-4 bg-gray-950 border-t border-gray-800/80 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-gray-400">
          <BrandBadge variant="compact" />
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition-colors font-medium cursor-pointer"
          >
            Cerrar
          </button>
        </div>

      </div>
    </div>
  );
}
