import { useEffect, useState } from 'react';
import { MapPin, Clock, Phone, Calendar } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../ui/dialog';
import { Label } from '../ui/label';
import { toast } from 'sonner';
import { Donation } from '../../App';
import { QualityBadge } from '../QualityBadge';
import { API_BASE, authHeader } from '../../lib/auth';

interface AvailableDonationsViewProps {
  donations: Donation[];
  updateDonation: (id: string, updates: Partial<Donation>) => void;
}

export function AvailableDonationsView({ donations, updateDonation }: AvailableDonationsViewProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [selectedDonation, setSelectedDonation] = useState<Donation | null>(null);
  const [showReserveDialog, setShowReserveDialog] = useState(false);
  const [pickupTime, setPickupTime] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<Donation[]>(donations ?? []);
  const [lastResponseInfo, setLastResponseInfo] = useState<string | null>(null);

  const filteredDonations = (items || donations || []).filter(d => {
    const matchesSearch = d.foodItems.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         d.hotelName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || d.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const handleReserve = () => {
    if (!selectedDonation || !pickupTime) {
      toast.error('Please select a pickup time');
      return;
    }

    // Call backend to set status to reserved
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/api/donations/${selectedDonation.id}/update-status/`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...(authHeader() as Record<string,string>) },
          body: JSON.stringify({ status: 'reserved' })
        });
        if (!res.ok) {
          const txt = await res.text();
          throw new Error(txt || 'Failed to reserve donation');
        }
        const updated = await res.json();
        // remove reserved donation from available items so it no longer appears
        setItems(prev => prev.filter(i => i.id !== updated.id));
        // notify parent if provided
        updateDonation?.(selectedDonation.id, { status: 'reserved', reservedBy: updated.reserved_by ?? 'You', pickupSchedule: pickupTime });
        toast.success('Donation reserved successfully! Check My Pickups for details.');
      } catch (err: any) {
        console.error('reserve error', err);
        toast.error(err?.message ?? 'Error reserving donation');
      } finally {
        setShowReserveDialog(false);
        setSelectedDonation(null);
        setPickupTime('');
      }
    })();
  };

  const openReserveDialog = (donation: Donation) => {
    setSelectedDonation(donation);
    setShowReserveDialog(true);
  };

  const mapServer = (d: any): Donation => {
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

  const fetchAvailable = async () => {
    setLoading(true); setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/donations/`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json', ...(authHeader() as Record<string,string>) }
      });

      const status = res.status;
      const text = await res.text();
      setLastResponseInfo(`status=${status} body=${text?.slice(0,1000)}`);

      if (!res.ok) {
        // try to parse JSON error, otherwise include raw text
        let parsed: any = text;
        try { parsed = JSON.parse(text); } catch {}
        const errMsg = (parsed && parsed.detail) ? parsed.detail : (typeof parsed === 'string' ? parsed : JSON.stringify(parsed));
        throw new Error(errMsg || `Failed to load donations (status ${status})`);
      }
      const data = text ? JSON.parse(text) : [];
      const mapped = Array.isArray(data) ? data.map(mapServer) : [];
      mapped.sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      // Show only donations that are currently available
      const availableOnly = mapped.filter(d => d.status === 'available');
      setItems(availableOnly);
    } catch (err: any) {
      console.error('fetch available error', err);
      setError(err?.message ?? 'Error loading donations');
      toast.error(err?.message ?? 'Error loading donations');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAvailable(); /* eslint-disable-next-line */ }, []);

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      <div>
        <h1>Available Donations</h1>
        <p className="text-muted-foreground">Browse and reserve food donations from hotels</p>
      </div>

      {/* Filter Section */}
      <Card className="bg-teal-50 border-teal-200">
        <CardContent className="ptt-66">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Input 
              placeholder="Search by food items or hotel name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="max-w-md"
            />
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="Perishable">Perishable</SelectItem>
                <SelectItem value="Cooked Food">Cooked Food</SelectItem>
                <SelectItem value="Packaged">Packaged</SelectItem>
                <SelectItem value="Baked Goods">Baked Goods</SelectItem>
                <SelectItem value="Dairy Products">Dairy Products</SelectItem>
                <SelectItem value="Beverages">Beverages</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Results Summary */}
      <Card className="bg-teal-50 border-teal-200">
        <CardContent className="pt-6 pbt-6 pb-66">
          <p className="text-teal-900">
            <strong>{filteredDonations.length}</strong> donations available matching your criteria
          </p>
        </CardContent>
      </Card>

      <div className="flex items-center justify-between">
        <div />
        <div className="flex items-center gap-2">
          <Button size="sm" variant="ghost" onClick={() => fetchAvailable()}>
            Refresh
          </Button>
        </div>
      </div>

      {/* Donations Grid */}
      {filteredDonations.length === 0 ? (
        <>
          <Card>
            <CardContent className="py-12 text-center text-gray-500">
              {loading ? <p>Loading donations…</p> : <p>No donations found matching your criteria</p>}
              {error && (
                <p className="text-sm text-red-600 mt-2">Error: {error}</p>
              )}
              {lastResponseInfo && (
                <p className="text-xs text-gray-400 mt-2">Debug: {lastResponseInfo}</p>
              )}
            </CardContent>
          </Card>
        </>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredDonations.map(donation => {
            const expiryDate = new Date(donation.expiryDate);
            const hoursUntilExpiry = Math.floor((expiryDate.getTime() - new Date().getTime()) / (1000 * 60 * 60));
            const isUrgent = hoursUntilExpiry < 24;

            return (
              <Card key={donation.id} className={`hover:shadow-lg transition-all ${isUrgent ? 'border-orange-500 border-2' : ''}`}>
                <CardHeader>
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex-1">
                      <CardTitle className="text-lg">{donation.foodItems}</CardTitle>
                      <CardDescription>{donation.hotelName}</CardDescription>
                    </div>
                    <QualityBadge score={donation.qualityScore} />
                  </div>
                  {isUrgent && (
                    <Badge className="bg-orange-600 text-white w-fit">
                      <Clock className="h-3 w-3 mr-1" />
                      Urgent - {hoursUntilExpiry}h left
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

                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-gray-500">Quantity</p>
                      <p className="font-medium">{donation.quantity}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Category</p>
                      <p className="font-medium">{donation.category}</p>
                    </div>
                    <div>
                      {/* <p className="text-gray-500">Serving Size</p>
                      <p className="font-medium">{donation.servingSize}</p> */}
                    </div>
                    <div>
                      <p className="text-gray-500">Best Before</p>
                      <p className="font-medium">{expiryDate.toLocaleDateString()}</p>
                    </div>
                  </div>

                  <div className="pt-2 border-t">
                    <div className="flex items-start gap-2 text-sm">
                      <MapPin className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
                      <p className="text-gray-600">{typeof donation.location === 'string' ? donation.location : (donation.location?.address ?? '')}</p>
                    </div>
                  </div>

                  <Button 
                    onClick={() => openReserveDialog(donation)}
                    className="w-full bg-teal-600 hover:bg-teal-700"
                  >
                    Reserve Donation
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Reserve Dialog */}
      <Dialog open={showReserveDialog} onOpenChange={setShowReserveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reserve Donation</DialogTitle>
            <DialogDescription>
              Schedule a pickup time for this donation
            </DialogDescription>
          </DialogHeader>

          {selectedDonation && (
            <div className="space-y-4">
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="font-medium">{selectedDonation.foodItems}</p>
                <p className="text-sm text-gray-600">{selectedDonation.hotelName}</p>
                <div className="flex items-center gap-2 mt-2">
                  <MapPin className="h-4 w-4 text-gray-400" />
                  <p className="text-sm">{typeof selectedDonation.location === 'string' ? selectedDonation.location : (selectedDonation.location?.address ?? '')}</p>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Pickup Date & Time</Label>
                <Input 
                  type="datetime-local"
                  value={pickupTime}
                  onChange={(e) => setPickupTime(e.target.value)}
                  min={new Date().toISOString().slice(0, 16)}
                  max={selectedDonation.expiryDate.slice(0, 16)}
                />
                <p className="text-xs text-gray-500">
                  Must be before expiry: {new Date(selectedDonation.expiryDate).toLocaleString()}
                </p>
              </div>

              <div className="p-3 bg-teal-50 border border-teal-200 rounded-lg text-sm">
                <p className="text-teal-900">
                  <strong>Note:</strong> Please arrive within 30 minutes of your scheduled time. 
                  The hotel will be notified of your pickup schedule.
                </p>
              </div>

              <div className="flex gap-3">
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setShowReserveDialog(false);
                    setSelectedDonation(null);
                  }}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button 
                  onClick={handleReserve}
                  className="flex-1 bg-teal-600 hover:bg-teal-700"
                >
                  Confirm Reservation
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}