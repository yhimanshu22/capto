import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { PlusCircle, FolderHeart, LogIn, LogOut, User as UserIcon } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const navigate = useNavigate();
  const { isAuthenticated, user, logout } = useAuth();

  return (
    <div className="flex flex-col min-h-screen relative overflow-hidden bg-slate-50 text-slate-800">
      {/* Decorative blurred glow elements for premium light-theme feel */}
      <div className="blur-glow glow-top-right"></div>
      <div className="blur-glow glow-bottom-left"></div>

      <header className="sticky top-0 z-50 flex items-center justify-between border-b border-slate-100 bg-white/80 px-6 py-4 backdrop-blur-md shadow-sm">
        <Link to="/" className="flex items-center gap-2 font-display text-2xl font-extrabold tracking-tight text-slate-900 hover:opacity-90 transition-all">
          <img src="/logo.png" alt="Capto Logo" className="w-8 h-8 object-contain" />
          <span>Capto</span>
        </Link>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => navigate('/library')} 
            className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 active:scale-[0.98] transition-all cursor-pointer"
          >
            <FolderHeart size={16} className="text-slate-500" />
            <span>My Library</span>
          </button>
          <button 
            onClick={() => navigate('/record')} 
            className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-white bg-violet-600 rounded-xl hover:bg-violet-700 hover:shadow-md hover:shadow-violet-100 active:scale-[0.98] transition-all cursor-pointer"
          >
            <PlusCircle size={16} />
            <span>Record New</span>
          </button>

          <div className="h-6 w-[1px] bg-slate-200 mx-1"></div>

          {isAuthenticated ? (
            <div className="flex items-center gap-3">
              <span className="hidden md:inline-flex items-center gap-1 px-3 py-1.5 bg-slate-100 border border-slate-200 rounded-xl text-xs font-bold text-slate-700">
                <UserIcon size={12} className="text-slate-500" />
                <span className="max-w-[150px] truncate">{user?.email}</span>
              </span>
              <button 
                onClick={logout} 
                className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-red-600 bg-red-50 border border-red-100 rounded-xl hover:bg-red-100 active:scale-[0.98] transition-all cursor-pointer"
              >
                <LogOut size={16} />
                <span className="hidden sm:inline">Sign Out</span>
              </button>
            </div>
          ) : (
            <button 
              onClick={() => navigate('/login')} 
              className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 active:scale-[0.98] transition-all cursor-pointer"
            >
              <LogIn size={16} className="text-slate-500" />
              <span>Sign In</span>
            </button>
          )}
        </div>
      </header>

      <main className="flex-1 flex flex-col">
        {children}
      </main>

      <footer className="py-6 text-center border-t border-slate-100 bg-white text-xs text-slate-500 font-medium shadow-inner">
        <p>&copy; {new Date().getFullYear()} Capto. Built freely for screen & camera recording sharing.</p>
      </footer>
    </div>
  );
}
