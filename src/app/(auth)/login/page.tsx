'use client';

import React, { useState } from 'react';
import { login } from './actions';
import { Mail, Lock, Eye, EyeOff, Loader2 } from 'lucide-react';

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);

    const formData = new FormData(e.currentTarget);
    const result = await login(formData);

    if (result && result.error) {
      setErrorMsg(result.error);
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-radial from-primary-dark to-black overflow-hidden font-sans">
      {/* Círculos decorativos de fondo con gradientes */}
      <div className="absolute top-10 left-10 w-72 h-72 bg-primary/20 rounded-full blur-3xl" />
      <div className="absolute bottom-10 right-10 w-96 h-96 bg-accent/10 rounded-full blur-3xl" />

      {/* Contenedor principal con efecto glassmorphism */}
      <div className="w-full max-w-md p-8 bg-slate-950/80 border border-slate-800 rounded-2xl shadow-2xl backdrop-blur-md z-10 mx-4 transition-all duration-300 hover:border-slate-700">

        {/* Cabecera del Login */}
        <div className="text-center mb-8">
          <img
            src="/logo-ribera.png"
            alt="BigMat Ribera"
            className="h-16 w-auto object-contain mx-auto mb-4 bg-white rounded-xl px-4 py-2"
          />
          <h1 className="text-2xl font-bold text-white tracking-tight">Gestión Logística</h1>
          <p className="text-slate-400 text-sm mt-1">BigMat Ribera - Acceso al Sistema</p>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="space-y-6">
          
          {/* Campo Email */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block">
              Correo Electrónico
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-500">
                <Mail size={18} />
              </span>
              <input
                id="email"
                name="email"
                type="email"
                required
                className="w-full bg-slate-900/50 border border-slate-800 rounded-xl py-3 pl-11 pr-4 text-white text-sm placeholder:text-slate-600 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                placeholder="ejemplo@ribera.com"
              />
            </div>
          </div>

          {/* Campo Contraseña */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block">
                Contraseña
              </label>
            </div>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-500">
                <Lock size={18} />
              </span>
              <input
                id="password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                required
                className="w-full bg-slate-900/50 border border-slate-800 rounded-xl py-3 pl-11 pr-12 text-white text-sm placeholder:text-slate-600 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-500 hover:text-slate-300 transition-colors"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {/* Mostrar error si lo hay */}
          {errorMsg && (
            <div className="p-3 bg-red-950/40 border border-red-900/50 rounded-xl text-red-400 text-xs font-medium text-center">
              {errorMsg}
            </div>
          )}

          {/* Botón de Submit */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary hover:bg-primary/90 active:bg-primary-dark text-white rounded-xl py-3 text-sm font-bold shadow-lg shadow-primary/20 hover:shadow-primary/30 flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                <span>Autenticando...</span>
              </>
            ) : (
              <span>Entrar al Sistema</span>
            )}
          </button>

        </form>

        {/* Footer */}
        <div className="mt-8 text-center text-xs text-slate-600">
          Desarrollado para Ribera Logística &copy; {new Date().getFullYear()}
        </div>
      </div>
    </div>
  );
}
