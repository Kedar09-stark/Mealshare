import { useEffect, useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Donation } from '../../App';
import { MapPin, Clock } from 'lucide-react';
import { API_BASE, authHeader } from '../../lib/auth';
import { toast } from 'sonner';

// Helper to safely display reservedBy (object or string)
function getReservedByDisplay(reservedBy: any): string {
  if (!reservedBy) return '';
  if (typeof reservedBy === 'object') {
    const r: any = reservedBy;
    return r.username ?? r.email ?? (r.id ? String(r.id) : '');
  }
  return String(reservedBy);
}

interface MyDonationsViewProps {
  donations: Donation[];
  updateDonation: (id: string, updates: Partial<Donation>) => void;
}

export function MyDonationsView({ donations: initialDonations, updateDonation }: MyDonationsViewProps) {
  const [donations, setDonations] = useState<Donation[]>(initialDonations ?? []);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchDonations = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/donations/`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json', ...(authHeader() as Record<string,string>) }
      });
      if (!res.ok) {
        const txt = await res.text();
        throw new Error(txt || 'Failed to fetch donations');
      }
      const data = await res.json();
      // expect array of donations in snake_case from backend; map to frontend shape
      const mapServer = (d: any) => {
        const loc = d.location ?? d.location_json ?? { address: '', coordinates: { lat: 0, lng: 0 } };
        return {
          id: d.id?.toString() ?? Date.now().toString(),
          hotelName: d.hotel_name ?? d.hotelName ?? '',
          foodItems: d.food_items ?? d.foodItems ?? '',
          quantity: d.quantity ?? '',
          category: d.category ?? '',
          expiryDate: d.expiry_date ?? d.expiryDate ?? '',
          location: loc,
          qualityScore: d.quality_score ?? d.qualityScore ?? 0,
          status: d.status ?? 'available',
          reservedBy: d.reserved_by, // preserve full object
          pickupSchedule: d.pickup_schedule ?? d.pickupSchedule,
          createdAt: d.created_at ?? d.createdAt ?? new Date().toISOString(),
          imageUrl: d.image_url ?? d.imageUrl ?? '',
          servingSize: d.serving_size ?? d.servingSize ?? '',
          rating: d.rating,
        } as Donation;
      };

      const mapped = Array.isArray(data) ? data.map(mapServer) : [];
      // sort by createdAt descending
      mapped.sort((a: Donation, b: Donation) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setDonations(mapped);
    } catch (err: any) {
      console.error('fetch donations error', err);
      setError(err?.message ?? 'Error fetching donations');
      toast.error(err?.message ?? 'Error fetching donations');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // load on mount
    fetchDonations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const available = donations.filter(d => d.status === 'available');
  const reserved = donations.filter(d => d.status === 'reserved');
  const completed = donations.filter(d => d.status === 'completed');

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'available': return 'bg-teal-100 text-teal-800';
      case 'reserved': return 'bg-purple-100 text-purple-800';
      case 'picked-up': return 'bg-blue-100 text-blue-800';
      case 'completed': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const updateDonationStatus = async (donationId: string, newStatus: string) => {
    try {
      const res = await fetch(`${API_BASE}/api/donations/${donationId}/update-status/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(authHeader() as Record<string,string>) },
        body: JSON.stringify({ status: newStatus })
      });
      if (!res.ok) {
        const txt = await res.text();
        throw new Error(txt || 'Failed to update status');
      }
      const updated = await res.json();
      setDonations(donations.map(d => d.id === donationId ? {
        ...d,
        status: updated.status,
        createdAt: updated.created_at ?? d.createdAt
      } : d));
      toast.success(`Status updated to ${newStatus}`);
    } catch (err: any) {
      console.error('status update error', err);
      toast.error(err?.message ?? 'Error updating status');
    }
  };

  const renderDonationCard = (donation: Donation) => (
    <Card key={donation.id} className="hover:shadow-lg transition-shadow">
      <CardHeader>
        <div className="flex justify-between items-start mb-2">
          <div className="flex-1">
            <CardTitle className="text-lg text-gray-900 font-semibold">{donation.hotelName ?? ''}</CardTitle>
            <CardDescription className="text-gray-500">{donation.foodItems}</CardDescription>
          </div>
        </div>
        <Badge className={getStatusColor(donation.status)}>
          {donation.status.toUpperCase().replace('-', ' ')}
        </Badge>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="aspect-video rounded-lg overflow-hidden bg-gray-100">
          <img 
            src={donation.imageUrl} 
            alt={donation.foodItems}
            className="w-full h-full object-cover"
          />
        </div>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div>
            <span className="text-gray-500">Quantity:</span>
            <p>{donation.quantity}</p>
          </div>
          <div>
            <span className="text-gray-500">Category:</span>
            <p>{donation.category}</p>
          </div>
          <div>
            <span className="text-gray-500">Expiry:</span>
            <p>{donation.expiryDate ? (() => { const d = new Date(donation.expiryDate); return isNaN(d.getTime()) ? donation.expiryDate : d.toLocaleDateString(); })() : '—'}</p>
          </div>
          <div>
            <span className="text-gray-500">Serving:</span>
            <p>{donation.servingSize}</p>
          </div>
        </div>
        <div className="pt-2 border-t">
          <div className="flex items-start gap-2 text-sm">
            <MapPin className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
            <p className="text-gray-600">{typeof donation.location === 'string' ? donation.location : (donation.location?.address ?? '')}</p>
          </div>
        </div>
        {donation.reservedBy && (
          <div className="pt-2 border-t">
            <div className="p-2 bg-purple-50 rounded">
              <p className="text-sm"><span className="text-gray-500">Reserved by:</span> <span className="font-medium text-purple-700">{getReservedByDisplay(donation.reservedBy)}</span></p>
              {donation.pickupSchedule && (
                <p className="text-xs text-gray-600 mt-1 flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  Pickup: {new Date(donation.pickupSchedule).toLocaleString()}
                </p>
              )}
            </div>
          </div>
        )}
        <div className="pt-3 border-t flex gap-2 flex-wrap">
          {donation.status !== 'available' && (
            <Button size="sm" variant="outline" onClick={() => updateDonationStatus(donation.id, 'available')}>
              Available
            </Button>
          )}
          {donation.status !== 'reserved' && (
            <Button size="sm" variant="outline" onClick={() => updateDonationStatus(donation.id, 'reserved')}>
              Reserved
            </Button>
          )}
          {donation.status !== 'completed' && (
            <Button size="sm" variant="outline" onClick={() => updateDonationStatus(donation.id, 'completed')}>
              Completed
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      <div>
        <h1>My Donations</h1>
        <p className="text-muted-foreground">Track and manage all your food donations</p>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-teal-50 p-4 rounded-lg">
          <h2 className="text-teal-800 font-bold">Available</h2>
          <p className="text-teal-800 font-bold text-2xl">{available.length}</p>
        </div>
        <div className="bg-purple-50 p-4 rounded-lg">
          <h2 className="text-purple-800 font-bold">Reserved</h2>
          <p className="text-purple-800 font-bold text-2xl">{reserved.length}</p>
        </div>
        <div className="bg-green-50 p-4 rounded-lg">
          <h2 className="text-green-800 font-bold">Completed</h2>
          <p className="text-green-800 font-bold text-2xl">{completed.length}</p>
        </div>
        <div className="bg-gray-50 p-4 rounded-lg">
          <h2 className="text-gray-800 font-bold">Total</h2>
          <p className="text-gray-800 font-bold text-2xl">{donations.length}</p>
        </div>
      </div>

      <Tabs defaultValue="all">
        <TabsList>
          <TabsTrigger value="all">All ({donations.length})</TabsTrigger>
          <TabsTrigger value="available">Available ({available.length})</TabsTrigger>
          <TabsTrigger value="reserved">Reserved ({reserved.length})</TabsTrigger>
          <TabsTrigger value="completed">Completed ({completed.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-4">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {donations.map(renderDonationCard)}
          </div>
        </TabsContent>

        <TabsContent value="available" className="space-y-4">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {available.map(renderDonationCard)}
          </div>
        </TabsContent>

        <TabsContent value="reserved" className="space-y-4">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {reserved.map(renderDonationCard)}
          </div>
        </TabsContent>

        <TabsContent value="completed" className="space-y-4">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {completed.map(renderDonationCard)}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}