import React, { useState } from 'react';
import { Button } from '../ui/button';
import { AuthForm } from './AuthForm';
import { UserRole } from '../../App';
import { Link } from 'react-router-dom';
import { apiRegister, setAuth } from '../../lib/auth';

interface RegisterPageProps {
  role: UserRole;
  onBack: () => void;
  onRegister: (role: UserRole) => void;
}

export function RegisterPage({ role, onBack, onRegister }: RegisterPageProps) {
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [businessLicenseNumber, setBusinessLicenseNumber] = useState('');
  const [ngoRegistrationNumber, setNgoRegistrationNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const effectiveRole = role ?? 'ngo';

  const handleRegister = () => {
    if (!email || !password || !name || !username) return alert('Please fill all fields');
    if (password !== confirmPassword) return alert('Passwords do not match');
    if (effectiveRole === 'hotel' && !businessLicenseNumber) return alert('Please enter business license number');
    if (effectiveRole === 'ngo' && !ngoRegistrationNumber) return alert('Please enter NGO registration number');
    (async () => {
      try {
        setLoading(true);
        const payload: any = { username, email, password, role: effectiveRole ?? 'ngo' };
        if (effectiveRole === 'hotel') {
          payload.businessLicenseNumber = businessLicenseNumber;
        } else if (effectiveRole === 'ngo') {
          payload.ngoRegistrationNumber = ngoRegistrationNumber;
        }
        const res = await apiRegister(payload);
        setAuth(res.token, res.user);
        onRegister(res.user.role as UserRole);
      } catch (err: any) {
        alert(err?.message || 'Registration failed');
      } finally {
        setLoading(false);
      }
    })();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 via-white to-orange-50 flex flex-col">
      <header className="px-6 py-4 border-b bg-white/80">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="text-xl font-semibold">FoodShare — Register</div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onBack}>Back</Button>
          </div>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center py-12">
        <div className="w-full px-4">
          <div className="max-w-md mx-auto bg-white/80 p-6 rounded-lg shadow-sm">
            <h2 className="text-2xl font-semibold text-center mb-4">Create {effectiveRole === 'hotel' ? 'Hotel / Donor' : 'NGO'} account</h2>
            <p className="text-center text-sm text-gray-600 mb-6">Register to start listing or claiming donations</p>

            <AuthForm
              name={name}
              setName={setName}
              businessLicenseNumber={businessLicenseNumber}
              setBusinessLicenseNumber={setBusinessLicenseNumber}
              ngoRegistrationNumber={ngoRegistrationNumber}
              setNgoRegistrationNumber={setNgoRegistrationNumber}
              role={effectiveRole}
              username={username}
              setUsername={setUsername}
              email={email}
              setEmail={setEmail}
              password={password}
              setPassword={setPassword}
              confirmPassword={confirmPassword}
              setConfirmPassword={setConfirmPassword}
              submitLabel={loading ? 'Creating...' : 'Create Account'}
              onSubmit={handleRegister}
              loading={loading}
            />

            <div className="mt-4 text-sm text-gray-600 text-center">
              <span>Already have an account? </span>
              <Link to={`/login?role=${effectiveRole}`} className="text-teal-700 underline">Sign in</Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
