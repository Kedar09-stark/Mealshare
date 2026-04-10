import React, { useState } from 'react';
import { Button } from '../ui/button';
import { AuthForm } from './AuthForm';
import { UserRole } from '../../App';
import { Link } from 'react-router-dom';
import { apiLogin, setAuth } from '../../lib/auth';

interface LoginPageProps {
  role: UserRole;
  onBack: () => void;
  onLogin: (role: UserRole) => void;
}

export function LoginPage({ role, onBack, onLogin }: LoginPageProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const effectiveRole = role ?? 'ngo';

  const handleLogin = () => {
    if (!username || !password) return alert('Please enter username and password');
    (async () => {
      try {
        setLoading(true);
        const res = await apiLogin(username, password);
        // res: { token, user }
        setAuth(res.token, res.user);
        onLogin(res.user.role as UserRole);
      } catch (err: any) {
        const msg = err?.message || 'Login failed';
        alert(msg);
      } finally {
        setLoading(false);
      }
    })();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 via-white to-orange-50 flex flex-col">
      <header className="px-6 py-4 border-b bg-white/80">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="text-xl font-semibold">FoodShare — Login</div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onBack}>Back</Button>
          </div>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center py-12">
        <div className="w-full px-4">
          <div className="max-w-md mx-auto bg-white/80 p-6 rounded-lg shadow-sm">
            <h2 className="text-2xl font-semibold text-center mb-4">{effectiveRole === 'hotel' ? 'Hotel / Donor Login' : 'NGO Login'}</h2>
            <p className="text-center text-sm text-gray-600 mb-6">Sign in to your account to continue</p>

            <AuthForm
              username={username}
              setUsername={setUsername}
              password={password}
              setPassword={setPassword}
              submitLabel={loading ? 'Signing in...' : 'Sign In'}
              onSubmit={handleLogin}
              loading={loading}
            />

            <div className="mt-4 text-sm text-gray-600 text-center">
              <span>Don't have an account? </span>
              <Link to={`/register?role=${effectiveRole}`} className="text-teal-700 underline">Register</Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
