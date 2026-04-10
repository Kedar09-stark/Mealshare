import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, useNavigate, useLocation, Navigate } from 'react-router-dom';
import { LandingPage } from './components/LandingPage';
import { LoginPage } from './components/auth/LoginPage';
import { RegisterPage } from './components/auth/RegisterPage';
import { HotelDashboard } from './components/HotelDashboard';
import { NGODashboard } from './components/NGODashboard';
import { Toaster } from './components/ui/sonner';
import { clearAuth } from './lib/auth';

export type UserRole = 'hotel' | 'ngo' | null;

export interface Donation {
  id: string;
  hotelName: string;
  foodItems: string;
  quantity: string;
  category: string;
  expiryDate: string;
  location: {
    address: string;
    coordinates: { lat: number; lng: number };
  };
  qualityScore: number;
  status: 'available' | 'reserved' | 'picked-up' | 'completed' | 'pending';
  reservedBy?: string;
  pickupSchedule?: string;
  createdAt: string;
  imageUrl: string;
  rating?: number;
  servingSize?: string;
  ownerId?: number;
}

export interface DonationRequest {
  id: string;
  ngoName: string;
  requestedItems: string;
  quantity: string;
  urgency: 'low' | 'medium' | 'high';
  beneficiaries: number;
  purpose: string;
  location: string;
  createdAt: string;
  status: 'open' | 'fulfilled' | 'expired';
  ngoId?: number;
}

export interface Message {
  id: string;
  from: string;
  to: string;
  message: string;
  timestamp: string;
  read: boolean;
}

export interface Volunteer {
  id: string;
  name: string;
  phone: string;
  email: string;
  availability: string;
  tasksCompleted: number;
  status: 'active' | 'inactive';
}

function App() {
  const [userRole, setUserRole] = useState<UserRole>(() => {
    try {
      const raw = localStorage.getItem('ms_user');
      if (raw) {
        const u = JSON.parse(raw) as { role?: UserRole };
        if (u?.role) return u.role;
      }
    } catch {
      // ignore
    }
    return null;
  });
  const [donations, setDonations] = useState<Donation[]>([
    {
      id: '1',
      hotelName: 'Grand Plaza Hotel',
      foodItems: 'Fresh Vegetables, Fruits, Bread',
      quantity: '50 kg',
      category: 'Perishable',
      expiryDate: '2025-11-08',
      location: {
        address: '123 Main St, Downtown',
        coordinates: { lat: 40.7128, lng: -74.0060 }
      },
      qualityScore: 95,
      status: 'available',
      createdAt: '2025-11-07T10:30:00',
      imageUrl: 'https://images.unsplash.com/photo-1583331030773-1ac64d1d00db?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxmcmVzaCUyMGZvb2QlMjBidWZmZXQlMjBob3RlbHxlbnwxfHx8fDE3NjI1MjExNjN8MA&ixlib=rb-4.1.0&q=80&w=1080',
      servingSize: '~150 servings',
      rating: 4.5
    },
    {
      id: '2',
      hotelName: 'Royal Inn',
      foodItems: 'Cooked Rice, Curry, Chapati',
      quantity: '30 kg',
      category: 'Cooked Food',
      expiryDate: '2025-11-07',
      location: {
        address: '456 Oak Ave, Uptown',
        coordinates: { lat: 40.7589, lng: -73.9851 }
      },
      qualityScore: 88,
      status: 'reserved',
      reservedBy: 'Hope Foundation',
      pickupSchedule: '2025-11-07T18:00:00',
      createdAt: '2025-11-07T08:15:00',
      imageUrl: 'https://images.unsplash.com/photo-1758896846696-754e8fb6e403?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxyZXN0YXVyYW50JTIwa2l0Y2hlbiUyMGZvb2QlMjBwcmVwYXJhdGlvbnxlbnwxfHx8fDE3NjI1MjExNjR8MA&ixlib=rb-4.1.0&q=80&w=1080',
      servingSize: '~90 servings',
      rating: 4.8
    },
    {
      id: '3',
      hotelName: 'Sunset Resort',
      foodItems: 'Packed Snacks, Beverages',
      quantity: '100 units',
      category: 'Packaged',
      expiryDate: '2025-11-15',
      location: {
        address: '789 Beach Rd, Coastal Area',
        coordinates: { lat: 40.7489, lng: -73.9680 }
      },
      qualityScore: 92,
      status: 'completed',
      reservedBy: 'Care & Share NGO',
      createdAt: '2025-11-06T14:20:00',
      imageUrl: 'https://images.unsplash.com/photo-1593113630400-ea4288922497?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxmb29kJTIwZG9uYXRpb24lMjBjaGFyaXR5fGVufDF8fHx8MTc2MjQ5MTA1MHww&ixlib=rb-4.1.0&q=80&w=1080',
      servingSize: '100 people',
      rating: 5.0
    }
  ]);

  const [donationRequests, setDonationRequests] = useState<DonationRequest[]>([
    {
      id: '1',
      ngoName: 'Hope Foundation',
      requestedItems: 'Rice, Lentils, Cooking Oil',
      quantity: '100 kg',
      urgency: 'high',
      beneficiaries: 200,
      purpose: 'Community Kitchen for homeless shelter',
      location: 'Downtown Area',
      createdAt: '2025-11-07T09:00:00',
      status: 'open'
    }
  ]);

  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      from: 'Grand Plaza Hotel',
      to: 'Hope Foundation',
      message: 'The food will be ready for pickup by 6 PM today.',
      timestamp: '2025-11-07T14:30:00',
      read: false
    }
  ]);

  const [volunteers, setVolunteers] = useState<Volunteer[]>([
    {
      id: '1',
      name: 'John Doe',
      phone: '+1-555-0123',
      email: 'john@example.com',
      availability: 'Mon-Fri, 6PM-9PM',
      tasksCompleted: 45,
      status: 'active'
    }
  ]);

  const addDonation = (donation: Donation) => {
    setDonations(prev => [donation, ...prev]);
  };

  const updateDonation = (id: string, updates: Partial<Donation>) => {
    setDonations(donations.map(d => d.id === id ? { ...d, ...updates } : d));
  };

  const addDonationRequest = (request: DonationRequest) => {
    setDonationRequests(prev => [request, ...prev]);
  };

  const addMessage = (message: Message) => {
    setMessages(prev => [message, ...prev]);
  };

  const addVolunteer = (volunteer: Volunteer) => {
    setVolunteers(prev => [volunteer, ...prev]);
  };

  const updateVolunteer = (id: string, updates: Partial<Volunteer>) => {
    setVolunteers(volunteers.map(v => v.id === id ? { ...v, ...updates } : v));
  };

  const handleLogout = (navigate?: (path: string) => void) => {
    try { clearAuth(); } catch {}
    setUserRole(null);
    if (navigate) navigate('/');
  };

  function LandingRoute() {
    const navigate = useNavigate();
    return (
      <LandingPage 
        onSelectRole={(role) => {
          setUserRole(role);
          navigate(role === 'hotel' ? '/hotel' : '/ngo');
        }}
        onOpenAuth={(action, role) => {
          navigate(`/${action}?role=${role}`);
        }}
      />
    );
  }

  function LoginRoute() {
    const navigate = useNavigate();
    const location = useLocation();
    const params = new URLSearchParams(location.search);
    const role = (params.get('role') as UserRole) ?? 'ngo';
    return (
      <LoginPage 
        role={role}
        onBack={() => navigate('/')}
        onLogin={(r) => {
          setUserRole(r);
          navigate(r === 'hotel' ? '/hotel' : '/ngo');
        }}
      />
    );
  }

  function RegisterRoute() {
    const navigate = useNavigate();
    const location = useLocation();
    const params = new URLSearchParams(location.search);
    const role = (params.get('role') as UserRole) ?? 'ngo';
    return (
      <RegisterPage 
        role={role}
        onBack={() => navigate('/')}
        onRegister={(r) => {
          setUserRole(r);
          navigate(r === 'hotel' ? '/hotel' : '/ngo');
        }}
      />
    );
  }

  function HotelRoute() {
    const navigate = useNavigate();
    if (userRole !== 'hotel') return <Navigate to="/" replace />;
    return (
      <>
        <HotelDashboard
          donations={donations}
          addDonation={addDonation}
          updateDonation={updateDonation}
          donationRequests={donationRequests}
          messages={messages}
          addMessage={addMessage}
          onLogout={() => handleLogout(navigate)}
        />
        <Toaster />
      </>
    );
  }

  function NGORoute() {
    const navigate = useNavigate();
    if (userRole !== 'ngo') return <Navigate to="/" replace />;
    return (
      <>
        <NGODashboard
          donations={donations}
          updateDonation={updateDonation}
          donationRequests={donationRequests}
          addDonationRequest={addDonationRequest}
          messages={messages}
          addMessage={addMessage}
          onLogout={() => handleLogout(navigate)}
        />
        <Toaster />
      </>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingRoute />} />
        <Route path="/login" element={<LoginRoute />} />
        <Route path="/register" element={<RegisterRoute />} />
        <Route path="/hotel/*" element={<HotelRoute />} />
        <Route path="/ngo/*" element={<NGORoute />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
