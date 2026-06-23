import React, { useState } from 'react';
import { supabase, supabaseUrl } from './lib/supabase';
import { Loader2 } from 'lucide-react';
import { cn } from './ReceiptEditor';

export function Auth() {
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (supabaseUrl === 'https://placeholder.supabase.co') {
      setMessage({ type: 'error', text: 'Supabase credentials are not configured in environment variables. Please provide valid VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env file.' });
      return;
    }

    try {
      const parsedUrl = new URL(supabaseUrl);
      if (parsedUrl.pathname !== '/' && parsedUrl.pathname !== '') {
         setMessage({ type: 'error', text: `Your VITE_SUPABASE_URL contains an extra path ("${parsedUrl.pathname}"). It should look exactly like: "https://your-project-id.supabase.co" without any "/rest/v1" or other paths.` });
         return;
      }
    } catch (err) {
      setMessage({ type: 'error', text: `Your VITE_SUPABASE_URL is not a valid URL format. You entered: "${supabaseUrl}". It should look exactly like: "https://your-project-id.supabase.co" without any trailing slashes or paths.` });
      return;
    }

    setLoading(true);
    setMessage(null);
    try {
      const cleanEmail = email.trim().replace(/[\u200B-\u200D\uFEFF]/g, '');

      if (isSignUp) {
        const { error } = await supabase.auth.signUp({
          email: cleanEmail,
          password,
          options: {
            emailRedirectTo: window.location.origin,
          },
        });

        if (error) {
          setMessage({ type: 'error', text: error.message });
        } else {
          setMessage({ type: 'success', text: 'Sign up successful! Please check your email to verify your account.' });
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password,
        });

        if (error) {
          setMessage({ type: 'error', text: error.message });
        } else {
          setMessage({ type: 'success', text: 'Logged in successfully!' });
        }
      }
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F9FAFB] flex flex-col justify-center items-center p-4">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-sm border border-slate-200 p-8">
        <div className="text-center mb-8">
          <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-slate-800 uppercase tracking-wide">
            {isSignUp ? 'Create Account' : 'Welcome Back'}
          </h2>
          <p className="text-sm text-slate-500 mt-2">
            {isSignUp ? 'Sign up to get started' : 'Sign in to your account'}
          </p>
        </div>
        
        <form onSubmit={handleAuth} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-2">
              Email Address
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@example.com"
              required
              className="w-full bg-slate-50/80 border border-slate-200 rounded-xl p-3 text-slate-800 hover:border-blue-400 focus:bg-white focus:border-blue-400 focus:ring-1 focus:ring-blue-400 outline-none transition-all"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-2">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              minLength={6}
              className="w-full bg-slate-50/80 border border-slate-200 rounded-xl p-3 text-slate-800 hover:border-blue-400 focus:bg-white focus:border-blue-400 focus:ring-1 focus:ring-blue-400 outline-none transition-all"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white px-5 py-3 rounded-xl text-xs font-bold uppercase tracking-widest shadow-lg shadow-blue-200 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 mt-6"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : (isSignUp ? 'Sign Up' : 'Sign In')}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button
            type="button"
            onClick={() => {
              setIsSignUp(!isSignUp);
              setMessage(null);
            }}
            className="text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors"
          >
            {isSignUp ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
          </button>
        </div>

        {message && (
          <div className={cn(
            "mt-6 p-4 rounded-xl text-sm font-medium border",
            message.type === 'error' 
              ? "bg-red-50 text-red-600 border-red-200" 
              : "bg-green-50 text-green-700 border-green-200"
          )}>
            {message.text}
          </div>
        )}
      </div>
    </div>
  );
}
