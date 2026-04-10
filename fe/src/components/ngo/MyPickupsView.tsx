import { Calendar, MapPin, Phone, CheckCircle, Star, Package, Clock, Navigation } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Donation } from '../../App';
import { QualityBadge } from '../QualityBadge';
import { toast } from 'sonner';
import { ContactDialog } from '../ContactDialog';
import { useEffect, useState } from 'react';
import { API_BASE, authHeader, getCurrentUser } from '../../lib/auth';

interface MyPickupsViewProps {
  updateDonation: (id: string, updates: Partial<Donation>) => void;
}

// Helper to check if donation is reserved by current user
function isReservedByCurrentUser(reservedBy: any, userId: string, username: string) {
  if (!reservedBy) return false;
  if (typeof reservedBy === 'object') {
    const r: any = reservedBy;
    return String(r.id ?? '').toString() === userId || r.username === username || r.email === username;
  }
  return reservedBy === userId || reservedBy === username;
}

// Helper to get display name for reservedBy
function getReservedByDisplay(reservedBy: any): string {
  if (!reservedBy) return '';
  if (typeof reservedBy === 'object') {
    const r: any = reservedBy;
    return r.username ?? r.email ?? (r.id ? String(r.id) : '');
  }
  return String(reservedBy);
}

export function MyPickupsView({ updateDonation }: MyPickupsViewProps) {
  const user = getCurrentUser && typeof getCurrentUser === 'function' ? getCurrentUser() : null;
  const userId = user?.id?.toString() ?? '';
  const username = user?.username?.toString() ?? '';

  // Debug: log current user info
  console.log('Current user:', { userId, username, user });

  const [donations, setDonations] = useState<Donation[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDonations = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`${API_BASE}/api/donations/my-pickups/`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json', ...(authHeader() as Record<string,string>) }
        });
        if (!res.ok) {
          const txt = await res.text();
          throw new Error(txt || 'Failed to fetch donations');
        }
        const data = await res.json();
        // Map backend fields to frontend shape
        const mapped = Array.isArray(data) ? data.map((d: any) => {
          return {
            id: d.id?.toString() ?? Date.now().toString(),
            hotelName: d.hotel_name ?? d.hotelName ?? '',
            foodItems: d.food_items ?? d.foodItems ?? '',
            quantity: d.quantity ?? '',
            category: d.category ?? '',
            expiryDate: d.expiry_date ?? d.expiryDate ?? '',
            location: d.location ?? d.location_json ?? { address: '', coordinates: { lat: 0, lng: 0 } },
            qualityScore: d.quality_score ?? d.qualityScore ?? 0,
            status: d.status ?? 'available',
            reservedBy: d.reserved_by, // preserve full object
            pickupSchedule: d.pickup_schedule ?? d.pickupSchedule,
            createdAt: d.created_at ?? d.createdAt ?? new Date().toISOString(),
            imageUrl: d.image_url ?? d.imageUrl ?? '',
            rating: d.rating,
            servingSize: d.serving_size ?? d.servingSize ?? '',
            ownerId: d.owner_id,
          } as Donation;
        }) : [];
        // Debug: log mapped donations (summary)
        console.log('Mapped donations (summary):', mapped.map((m: any) => ({ id: m.id, status: m.status, reservedBy: m.reservedBy })));
        // Debug: per-donation check of reservation match with current user
        mapped.forEach((m: any) => {
          try {
            const matches = isReservedByCurrentUser(m.reservedBy, userId, username);
            console.log('Donation check:', { id: m.id, status: m.status, reservedBy: m.reservedBy, matchesCurrentUser: matches });
          } catch (e) {
            console.error('Donation check error', m.id, e);
          }
        });

        // Only keep donations that are relevant to this NGO's pickups: reserved / picked-up / completed
        const relevant = mapped.filter((m: any) => {
          const allowed = ['reserved', 'picked-up', 'completed'];
          if (!allowed.includes(m.status)) return false;
          return isReservedByCurrentUser(m.reservedBy, userId, username);
        });
        console.log('Filtered relevant donations for pickups:', relevant.map((r:any)=>({id: r.id, status: r.status})));
        setDonations(relevant);
      } catch (err: any) {
        setError(err?.message ?? 'Error fetching donations');
        toast.error(err?.message ?? 'Error fetching donations');
      } finally {
        setLoading(false);
      }
    };
    fetchDonations();
  }, []);

  // Only show donations reserved for this NGO
  const reserved = donations.filter(d => {
    if (d.status !== 'reserved') return false;
    // Debug: log filter comparison
    console.log('Filter reserved:', { reservedBy: d.reservedBy, userId, username });
    return isReservedByCurrentUser(d.reservedBy, userId, username);
  });
  const pickedUp = donations.filter(d => d.status === 'picked-up' && isReservedByCurrentUser(d.reservedBy, userId, username));
  const completed = donations.filter(d => d.status === 'completed' && isReservedByCurrentUser(d.reservedBy, userId, username));

  const handleMarkPickedUp = (id: string) => {
    // Simple flow: mark as completed and remove from local list so it disappears
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/api/donations/${id}/update-status/`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...(authHeader() as Record<string,string>) },
          body: JSON.stringify({ status: 'completed' })
        });
        if (!res.ok) {
          const txt = await res.text();
          throw new Error(txt || 'Failed to update donation status');
        }
        const updated = await res.json();
        // Update parent state and local state only after success
        try { updateDonation(id, { status: 'completed' }); } catch (_) {}
        setDonations(prev => prev.filter(d => d.id !== id));
        toast.success('Marked as completed! Thank you!');
      } catch (err: any) {
        console.error('Failed to mark picked up as completed', err);
        toast.error(err?.message ?? 'Failed to update donation');
      }
    })();
  };

  const handleMarkCompleted = (id: string) => {
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/api/donations/${id}/update-status/`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...(authHeader() as Record<string,string>) },
          body: JSON.stringify({ status: 'completed' })
        });
        if (!res.ok) {
          const txt = await res.text();
          throw new Error(txt || 'Failed to update donation status');
        }
        const updated = await res.json();
        try { updateDonation(id, { status: 'completed' }); } catch (_) {}
        setDonations(prev => prev.filter(d => d.id !== id));
        toast.success('Donation completed! Thank you for making a difference!');
      } catch (err: any) {
        console.error('Failed to mark completed', err);
        toast.error(err?.message ?? 'Failed to update donation');
      }
    })();
  };

  const getTimeUntilPickup = (schedule?: string) => {
    if (!schedule) return 'Not scheduled';
    const pickupTime = new Date(schedule);
    const now = new Date();
    const diff = pickupTime.getTime() - now.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (diff < 0) return 'Overdue';
    if (hours === 0) return `${minutes} minutes`;
    return `${hours}h ${minutes}m`;
  };

  // Open Google Maps for the donation location, mark as completed and remove from local pickups
  const handleGetDirections = (donation: Donation) => {
    try {
      const lat = donation.location?.coordinates?.lat;
      const lng = donation.location?.coordinates?.lng;
      let url = '';
      if (lat != null && lng != null) {
        url = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
      } else {
        const q = encodeURIComponent(donation.location?.address ?? donation.hotelName ?? '');
        url = `https://www.google.com/maps/search/?api=1&query=${q}`;
      }

      // Open directions in a new tab
      window.open(url, '_blank');

      // Update backend/state: mark as completed and remove from local list so it disappears
      (async () => {
        try {
          const res = await fetch(`${API_BASE}/api/donations/${donation.id}/update-status/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...(authHeader() as Record<string,string>) },
            body: JSON.stringify({ status: 'completed' })
          });
          if (!res.ok) {
            const txt = await res.text();
            throw new Error(txt || 'Failed to update donation status');
          }
          const updated = await res.json();
          try { updateDonation(donation.id, { status: 'completed' }); } catch (_) {}
          setDonations(prev => prev.filter(d => d.id !== donation.id));
          toast.success('Marked pickup as completed. Thank you!');
        } catch (err: any) {
          console.error('Failed to mark completed after directions', err);
          toast.error(err?.message ?? 'Failed to update donation');
        }
      })();
    } catch (err: any) {
      console.error('Error handling directions:', err);
      toast.error('Could not open directions.');
    }
  };

  const renderDonationCard = (donation: Donation, showActions: boolean) => {
    // In renderDonationCard, compute a safe display string for reservedBy
    const reservedByDisplay = (typeof donation.reservedBy === 'object' && donation.reservedBy !== null)
      ? (((donation.reservedBy as any).username) ?? ((donation.reservedBy as any).email) ?? String((donation.reservedBy as any).id ?? ''))
      : String(donation.reservedBy ?? '');

    return (
      <Card key={donation.id} className="hover:shadow-lg transition-shadow">
        <CardHeader>
          <div className="flex justify-between items-start mb-2">
            <div className="flex-1">
              <CardTitle className="text-lg">{donation.foodItems}</CardTitle>
              <CardDescription>{donation.hotelName}</CardDescription>
            </div>
            <QualityBadge score={donation.qualityScore} />
          </div>
          {donation.status === 'reserved' && (
            <Badge className="bg-blue-100 text-blue-800 w-fit">
              <Clock className="h-3 w-3 mr-1" />
              Scheduled
            </Badge>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="aspect-video rounded-lg overflow-hidden bg-gray-100">
            <img 
              src={donation.imageUrl} 
              alt={donation.foodItems}
              className="w-full h-full object-cover"
            />
          </div>

          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-gray-500">Quantity</p>
                <p className="font-medium">{donation.quantity}</p>
              </div>
              {/* <div>
                <p className="text-gray-500">Serving Size</p>
                <p className="font-medium">{donation.servingSize}</p>
              </div> */}
            </div>

            {donation.pickupSchedule && (
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Scheduled Pickup</p>
                    <p className="font-medium text-blue-900">
                      {new Date(donation.pickupSchedule).toLocaleString()}
                    </p>
                    <p className="text-xs text-blue-700 mt-1">
                      {getTimeUntilPickup(donation.pickupSchedule)}
                    </p>
                  </div>
                  <Clock className="h-8 w-8 text-blue-600" />
                </div>
              </div>
            )}

            <div className="p-3 bg-gray-50 rounded-lg">
              <div className="flex items-start gap-2 mb-2">
                <MapPin className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-medium">Pickup Location</p>
                  <p className="text-sm text-gray-600">{typeof donation.location === 'string' ? donation.location : (donation.location?.address ?? '')}</p>
                </div>
              </div>
              <Button 
                type="button"
                variant="outline" 
                size="sm" 
                className="w-full mt-2"
                onClick={() => handleGetDirections(donation)}
              >
                <Navigation className="mr-2 h-4 w-4" />
                Get Directions
              </Button>
            </div>
          </div>

          {showActions && (
            <div className="flex gap-2">
              {donation.status === 'reserved' && (
                <>
                  <ContactDialog
                    contactName={donation.hotelName}
                    contactEmail={`contact@${donation.hotelName.toLowerCase().replace(/\s+/g, '')}.com`}
                    contactPhone="+1 555-0100"
                    contactId={donation.ownerId}
                    trigger={
                      <Button 
                        type="button"
                        variant="outline" 
                        className="flex-1"
                      >
                        <Phone className="mr-2 h-4 w-4" />
                        Contact Hotel
                      </Button>
                    }
                  />
                  <Button 
                    type="button"
                    onClick={() => handleMarkPickedUp(donation.id)}
                    className="flex-1 bg-teal-600 hover:bg-teal-700"
                  >
                    <CheckCircle className="mr-2 h-4 w-4" />
                    Mark Picked Up
                  </Button>
                </>
              )}
              {donation.status === 'picked-up' && (
                <Button 
                  type="button"
                  onClick={() => handleMarkCompleted(donation.id)}
                  className="w-full bg-teal-600 hover:bg-teal-700"
                >
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Mark as Delivered
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1>My Pickups</h1>
        <p className="text-muted-foreground">Manage your scheduled and completed pickups</p>
      </div>

      <Tabs defaultValue="scheduled">
        <TabsList>
          <TabsTrigger value="scheduled">Scheduled ({reserved.length})</TabsTrigger>
          <TabsTrigger value="picked-up">In Transit ({pickedUp.length})</TabsTrigger>
          <TabsTrigger value="completed">Completed ({completed.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="scheduled" className="space-y-4">
          {reserved.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-gray-500">
                <Clock className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>No scheduled pickups</p>
                <p className="text-sm mt-2">Browse available donations to reserve one</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid md:grid-cols-2 gap-6">
              {reserved.map(donation => renderDonationCard(donation, true))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="picked-up" className="space-y-4">
          {pickedUp.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-gray-500">
                <Navigation className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>No pickups in transit</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid md:grid-cols-2 gap-6">
              {pickedUp.map(donation => renderDonationCard(donation, true))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="completed" className="space-y-4">
          {completed.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-gray-500">
                <CheckCircle className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>No completed deliveries yet</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid md:grid-cols-3 gap-4">
              {completed.map(donation => (
                <Card key={donation.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <CardTitle className="text-base">{donation.foodItems}</CardTitle>
                    <CardDescription className="text-xs">{donation.hotelName}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="aspect-video rounded-lg overflow-hidden bg-gray-100">
                      <img 
                        src={donation.imageUrl} 
                        alt={donation.foodItems}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="text-sm space-y-1">
                      <p><span className="text-gray-500">Quantity:</span> {donation.quantity}</p>
                      <p><span className="text-gray-500">Served:</span> {donation.servingSize}</p>
                      {donation.rating && (
                        <div className="flex items-center gap-1 pt-2">
                          <span className="text-yellow-500">★</span>
                          <span className="font-medium">{donation.rating}</span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}