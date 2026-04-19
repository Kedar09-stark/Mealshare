import React from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';

interface AuthFormProps {
  email?: string;
  setEmail?: (v: string) => void;
  password: string;
  setPassword: (v: string) => void;
  username?: string;
  setUsername?: (v: string) => void;
  name?: string;
  setName?: (v: string) => void;
  confirmPassword?: string;
  setConfirmPassword?: (v: string) => void;
  businessLicenseNumber?: string;
  setBusinessLicenseNumber?: (v: string) => void;
  ngoRegistrationNumber?: string;
  setNgoRegistrationNumber?: (v: string) => void;
  role?: string;
  submitLabel: string;
  onSubmit: () => void;
  loading?: boolean;
}

export function AuthForm({ email, setEmail, password, setPassword, username, setUsername, name, setName, confirmPassword, setConfirmPassword, businessLicenseNumber, setBusinessLicenseNumber, ngoRegistrationNumber, setNgoRegistrationNumber, role, submitLabel, onSubmit, loading }: AuthFormProps) {
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
      className="max-w-md mx-auto bg-white/80 p-6 rounded-lg shadow-sm"
    >
      {setName && (
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">Organization / Name</label>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Hope Foundation" />
        </div>
      )}

      {setUsername && (
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
          <Input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="choose-a-username" />
        </div>
      )}

      {setEmail && (
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
          <Input type="email" value={email ?? ''} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.org" />
        </div>
      )}

      {role === 'hotel' && setBusinessLicenseNumber && (
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">Business License Number</label>
          <Input value={businessLicenseNumber} onChange={(e) => setBusinessLicenseNumber(e.target.value)} placeholder="e.g. BLN-123456" />
        </div>
      )}

      {role === 'ngo' && setNgoRegistrationNumber && (
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">NGO Registration Number</label>
          <Input value={ngoRegistrationNumber} onChange={(e) => setNgoRegistrationNumber(e.target.value)} placeholder="e.g. NGO-123456" />
        </div>
      )}

      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
        <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Enter a secure password" />
      </div>

      {setConfirmPassword && (
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-1">Confirm Password</label>
          <Input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Repeat your password" />
        </div>
      )}

      <div className="flex items-center justify-end gap-2">
        <Button type="submit" className="bg-teal-600 hover:bg-teal-700" disabled={loading}>
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}
