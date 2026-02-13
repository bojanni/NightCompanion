import { useState } from 'react';
import { Flame, Mail, Lock, ArrowRight, Loader2, Play } from 'lucide-react';
import { toast } from 'sonner';

const DEMO_EMAIL = 'demo@nightcafe-companion.app';
const DEMO_PASSWORD = 'demo123456';

interface AuthProps {
  onSignIn: (email: string, password: string) => Promise<{ error: { message: string } | null }>;
  onSignUp: (email: string, password: string) => Promise<{ error: { message: string } | null }>;
}

export default function Auth({ onSignIn, onSignUp }: AuthProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [demoLoading, setDemoLoading] = useState(false);

  const handleDemo = async () => {
    setDemoLoading(true);
    const { error: signInError } = await onSignIn(DEMO_EMAIL, DEMO_PASSWORD);
    if (signInError) {
      await onSignUp(DEMO_EMAIL, DEMO_PASSWORD);
      const { error: retryError } = await onSignIn(DEMO_EMAIL, DEMO_PASSWORD);
      if (retryError) toast.error(retryError.message);
    }
    setDemoLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { error: authError } = isLogin
      ? await onSignIn(email, password)
      : await onSignUp(email, password);

    if (authError) {
      toast.error(authError.message);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-orange-500/5 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl shadow-2xl shadow-amber-500/20 mb-4">
            <Flame size={32} className="text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">NightCafe Companion</h1>
          <p className="text-slate-400 mt-2">Your AI art workflow, organized.</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl">
          <div className="flex bg-slate-800 rounded-xl p-1 mb-6">
            <button
              onClick={() => setIsLogin(true)}
              className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${isLogin ? 'bg-slate-700 text-white shadow-sm' : 'text-slate-400 hover:text-white'
                }`}
            >
              Sign In
            </button>
            <button
              onClick={() => setIsLogin(false)}
              className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${!isLogin ? 'bg-slate-700 text-white shadow-sm' : 'text-slate-400 hover:text-white'
                }`}
            >
              Create Account
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Email</label>
              <div className="relative">
                <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  required
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500/40 transition-all text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Password</label>
              <div className="relative">
                <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Min 6 characters"
                  required
                  minLength={6}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500/40 transition-all text-sm"
                />
              </div>
            </div>


            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-2.5 bg-gradient-to-r from-amber-500 to-orange-600 text-white font-medium rounded-xl hover:from-amber-600 hover:to-orange-700 focus:outline-none focus:ring-2 focus:ring-amber-500/40 transition-all disabled:opacity-50 text-sm shadow-lg shadow-amber-500/20"
            >
              {loading ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <>
                  {isLogin ? 'Sign In' : 'Create Account'}
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-700" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="px-3 bg-slate-900 text-slate-500">or</span>
            </div>
          </div>

          <button
            onClick={handleDemo}
            disabled={demoLoading}
            className="w-full flex items-center justify-center gap-2 py-2.5 bg-slate-800 text-slate-300 font-medium rounded-xl hover:bg-slate-700 hover:text-white focus:outline-none focus:ring-2 focus:ring-slate-500/40 transition-all disabled:opacity-50 text-sm border border-slate-700"
          >
            {demoLoading ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <>
                <Play size={14} />
                Try Demo Account
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
