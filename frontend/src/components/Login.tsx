import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Mail, Lock, ArrowRight, Eye, EyeOff, LogIn, UserPlus } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, register, error, setError } = useAuth();

  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Redirect to the page they were trying to access or /library
  const from = (location.state as any)?.from?.pathname || '/library';

  const toggleMode = () => {
    setIsRegister(!isRegister);
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please fill in all fields');
      return;
    }
    if (isRegister && password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      if (isRegister) {
        await register(email, password);
      } else {
        await login(email, password);
      }
      navigate(from, { replace: true });
    } catch (err: any) {
      console.error('Authentication error:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col justify-center items-center bg-slate-50 relative px-4 py-12 overflow-hidden">
      {/* Decorative gradient blur */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-gradient-to-tr from-violet-200 to-pink-200 rounded-full blur-3xl opacity-60 -z-10" />

      <div className="w-full max-w-md bg-white/80 backdrop-blur-md border border-slate-200/50 rounded-3xl p-8 shadow-xl flex flex-col gap-6 animate-slideUp">
        {/* Title Area */}
        <div className="flex flex-col items-center text-center gap-2">
          <div className="w-12 h-12 rounded-2xl bg-violet-600 flex items-center justify-center text-white shadow-lg shadow-violet-200">
            {isRegister ? <UserPlus size={24} /> : <LogIn size={24} />}
          </div>
          
          <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight mt-2">
            {isRegister ? 'Create your account' : 'Welcome back'}
          </h2>
          
          <p className="text-sm text-slate-500 font-medium">
            {isRegister 
              ? 'Join Capto to start isolating your personal recordings' 
              : 'Sign in to access your private Loom studio'
            }
          </p>
        </div>

        {/* Form Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-100 rounded-2xl p-4 text-xs font-bold text-red-600 flex items-center gap-2 animate-pulse">
            <span className="w-1.5 h-1.5 rounded-full bg-red-600 inline-block flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Input Fields */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-extrabold text-slate-500 tracking-wider uppercase pl-1">
              Email Address
            </label>
            <div className="relative flex items-center">
              <Mail size={18} className="absolute left-4 text-slate-400" />
              <input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-violet-600 focus:ring-4 focus:ring-violet-100/50 transition-all"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-extrabold text-slate-500 tracking-wider uppercase pl-1">
              Password
            </label>
            <div className="relative flex items-center">
              <Lock size={18} className="absolute left-4 text-slate-400" />
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full pl-12 pr-12 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-violet-600 focus:ring-4 focus:ring-violet-100/50 transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {isRegister && (
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-extrabold text-slate-500 tracking-wider uppercase pl-1">
                Confirm Password
              </label>
              <div className="relative flex items-center">
                <Lock size={18} className="absolute left-4 text-slate-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-violet-600 focus:ring-4 focus:ring-violet-100/50 transition-all"
                />
              </div>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full px-6 py-4 mt-2 font-bold text-white bg-violet-600 rounded-2xl hover:bg-violet-700 hover:shadow-lg hover:shadow-violet-200 active:scale-[0.98] disabled:bg-violet-400 disabled:shadow-none disabled:scale-100 transition-all cursor-pointer flex items-center justify-center gap-2 text-sm"
          >
            <span>{isSubmitting ? 'Authenticating...' : isRegister ? 'Create Account' : 'Sign In'}</span>
            {!isSubmitting && <ArrowRight size={16} />}
          </button>
        </form>

        {/* Toggle Mode */}
        <div className="flex items-center justify-center gap-1.5 text-xs font-bold text-slate-500 mt-2">
          <span>{isRegister ? 'Already have an account?' : "Don't have an account?"}</span>
          <button
            onClick={toggleMode}
            className="text-violet-600 hover:text-violet-700 hover:underline cursor-pointer"
          >
            {isRegister ? 'Sign In' : 'Sign Up'}
          </button>
        </div>
      </div>
    </div>
  );
}
