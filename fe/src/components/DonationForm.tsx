import { useState } from 'react';
import { MapPin, Upload, Calendar } from 'lucide-react';
import { MapContainer, TileLayer, Marker } from 'react-leaflet';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { toast } from 'sonner';
import { Donation } from '../App';
import { LocationPicker } from './LocationPicker';
import { API_BASE, authHeader, getUser } from '../lib/auth';

interface DonationFormProps {
  onSubmit: (donation: Donation) => void;
  onCancel: () => void;
}

const FOOD_CATEGORIES = [
  'Perishable',
  'Cooked Food',
  'Packaged',
  'Baked Goods',
  'Dairy Products',
  'Beverages'
];

const IMAGE_URLS = [
  'https://images.unsplash.com/photo-1583331030773-1ac64d1d00db?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxmcmVzaCUyMGZvb2QlMjBidWZmZXQlMjBob3RlbHxlbnwxfHx8fDE3NjI1MjExNjN8MA&ixlib=rb-4.1.0&q=80&w=1080',
  'https://images.unsplash.com/photo-1593113630400-ea4288922497?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxmb29kJTIwZG9uYXRpb24lMjBjaGFyaXR5fGVufDF8fHx8MTc2MjQ5MTA1MHww&ixlib=rb-4.1.0&q=80&w=1080',
  'https://images.unsplash.com/photo-1758896846696-754e8fb6e403?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxyZXN0YXVyYW50JTIwa2l0Y2hlbiUyMGZvb2QlMjBwcmVwYXJhdGlvbnxlbnwxfHx8fDE3NjI1MjExNjR8MA&ixlib=rb-4.1.0&q=80&w=1080'
];

export function DonationForm({ onSubmit, onCancel }: DonationFormProps) {
  const [formData, setFormData] = useState({
    hotelName: '',
    foodItems: '',
    quantity: '',
    category: '',
    expiryDate: '',
    location: {
      address: '',
      coordinates: { lat: 40.7128, lng: -74.0060 }
    }
  });

  const [showLocationPicker, setShowLocationPicker] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // Prevent non-hotel users from attempting to create donations
    const currentUser = getUser();
    if (!currentUser || currentUser.role !== 'hotel') {
      toast.error('Only hotel accounts may create donations. Please sign in with a hotel account.');
      return;
    }

    if (!formData.hotelName || !formData.foodItems || !formData.quantity || 
        !formData.category || !formData.expiryDate || !formData.location.address) {
      toast.error('Please fill in all required fields');
      return;
    }

    setSubmitting(true);

    // Calculate quality score based on various factors
    const daysUntilExpiry = Math.floor(
      (new Date(formData.expiryDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
    );
    const qualityScore = Math.min(95, Math.max(75, 85 + daysUntilExpiry * 2));

    try {
      // Use FormData so we can include an optional image file
      const form = new FormData();
      form.append('hotel_name', formData.hotelName);
      form.append('food_items', formData.foodItems);
      form.append('quantity', formData.quantity);
      form.append('category', formData.category);
      form.append('expiry_date', formData.expiryDate);
      form.append('location', JSON.stringify({ address: formData.location.address, coordinates: formData.location.coordinates }));
      form.append('quality_score', String(Math.round(qualityScore)));
      if (imageFile) form.append('image', imageFile);

      const headers = { ...(authHeader() as Record<string,string>) };

      console.debug('Submitting donation, headers:', headers);
      const res = await fetch(`${API_BASE}/api/donations/create-from-form/`, {
        method: 'POST',
        headers,
        body: form,
      });

      const status = res.status;
      const bodyText = await res.text();
      console.debug('Donation create response', { status, bodyText });
      if (!res.ok) {
        // surface server message for easier debugging
        throw new Error(bodyText || `Failed to create donation (status ${status})`);
      }

      const data = bodyText ? JSON.parse(bodyText) : null;

      const donation: Donation = data ? {
        id: data.id?.toString() ?? Date.now().toString(),
        hotelName: data.hotel_name ?? formData.hotelName,
        foodItems: data.food_items ?? formData.foodItems,
        quantity: data.quantity ?? formData.quantity,
        category: data.category ?? formData.category,
        expiryDate: data.expiry_date ?? formData.expiryDate,
        location: data.location ?? formData.location,
        qualityScore: data.quality_score ?? Math.round(qualityScore),
        status: data.status ?? 'pending',
        createdAt: data.created_at ?? new Date().toISOString(),
        imageUrl: data.image_url ?? IMAGE_URLS[Math.floor(Math.random() * IMAGE_URLS.length)]
      } : {
        id: Date.now().toString(),
        hotelName: formData.hotelName,
        foodItems: formData.foodItems,
        quantity: formData.quantity,
        category: formData.category,
        expiryDate: formData.expiryDate,
        location: formData.location,
        qualityScore: Math.round(qualityScore),
        status: 'pending',
        createdAt: new Date().toISOString(),
        imageUrl: IMAGE_URLS[Math.floor(Math.random() * IMAGE_URLS.length)]
      };

      onSubmit(donation);
      toast.success('Donation created successfully! Pending admin approval.');
    } catch (err: any) {
      console.error('Donation submit error', err);
      toast.error(err?.message ?? 'Failed to submit donation');
    } finally {
      setSubmitting(false);
    }
  };

  const handleLocationSelect = (location: { address: string; coordinates: { lat: number; lng: number } }) => {
    setFormData({ ...formData, location });
    setShowLocationPicker(false);
    toast.success('Location selected successfully');
  };

  return (
    <div className="space-y-6">
      {!showLocationPicker ? (
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Basic Information Section */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="hotelName">Hotel Name *</Label>
              <Input
                id="hotelName"
                placeholder="Enter your hotel name"
                value={formData.hotelName}
                onChange={(e) => setFormData({ ...formData, hotelName: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="foodItems">Food Items *</Label>
              <Textarea
                id="foodItems"
                placeholder="E.g., Fresh vegetables, fruits, cooked rice, bread..."
                value={formData.foodItems}
                onChange={(e) => setFormData({ ...formData, foodItems: e.target.value })}
                className="min-h-[80px]"
                required
              />
            </div>
          </div>

          {/* Donation Details Section */}
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="quantity">Quantity *</Label>
              <Input
                id="quantity"
                placeholder="E.g., 50 kg, 100 servings"
                value={formData.quantity}
                onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">Category *</Label>
              <Select value={formData.category} onValueChange={(value: string) => setFormData({ ...formData, category: value })}>
                <SelectTrigger id="category">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {FOOD_CATEGORIES.map(cat => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="imageFile">Food Photo (optional)</Label>
              <input
                id="imageFile"
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const f = e.target.files && e.target.files[0] ? e.target.files[0] : null;
                  setImageFile(f);
                  if (f) setImagePreview(URL.createObjectURL(f));
                  else setImagePreview(null);
                }}
                className="block w-full text-sm text-gray-600"
              />
              {imagePreview && (
                <div className="mt-2 w-40 h-28 overflow-hidden rounded shadow-sm">
                  <img src={imagePreview} alt="preview" className="w-full h-full object-cover" />
                </div>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="expiryDate">Best Before / Expiry Date *</Label>
            <div className="relative">
              <Input
                id="expiryDate"
                type="date"
                value={formData.expiryDate}
                onChange={(e) => setFormData({ ...formData, expiryDate: e.target.value })}
                min={new Date().toISOString().split('T')[0]}
                required
              />
              <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
            </div>
          </div>

          {/* Pickup Location Section */}
          <div className="space-y-2">
            <Label>Pickup Location *</Label>
            {formData.location.address ? (
              <div className="flex items-start gap-3 p-4 bg-teal-50 border-2 border-teal-200 rounded-lg">
                <MapPin className="h-5 w-5 text-teal-600 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-sm">{formData.location.address}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    Coordinates: {formData.location.coordinates.lat.toFixed(4)}, {formData.location.coordinates.lng.toFixed(4)}
                  </p>
                </div>
                {/* Small map preview that will remount when coordinates change */}
                <div className="w-40 h-28 rounded overflow-hidden shadow-sm">
                  {typeof formData.location?.coordinates?.lat === 'number' && typeof formData.location?.coordinates?.lng === 'number' ? (
                    <MapContainer
                      key={`${formData.location.coordinates.lat}-${formData.location.coordinates.lng}`}
                      center={[formData.location.coordinates.lat, formData.location.coordinates.lng]}
                      zoom={14}
                      scrollWheelZoom={false}
                      dragging={false}
                      doubleClickZoom={false}
                      attributionControl={false}
                      zoomControl={false}
                      className="w-full h-full"
                    >
                      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                      <Marker position={[formData.location.coordinates.lat, formData.location.coordinates.lng]} />
                    </MapContainer>
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gray-100 text-xs text-gray-500">No coordinates</div>
                  )}
                </div>
                <Button 
                  type="button"
                  size="sm" 
                  variant="outline"
                  className="border-teal-300 text-teal-700 hover:bg-teal-50"
                  onClick={() => setShowLocationPicker(true)}
                >
                  Change
                </Button>
              </div>
            ) : (
              <Button 
                type="button"
                variant="outline" 
                className="w-full border-2 border-dashed border-gray-300 hover:border-teal-400 hover:bg-teal-50"
                onClick={() => setShowLocationPicker(true)}
              >
                <MapPin className="mr-2 h-4 w-4" />
                Select Pickup Location
              </Button>
            )}
          </div>

          {/* Quality Assurance Notice */}
          <div className="p-4 bg-gradient-to-r from-teal-50 to-blue-50 border-l-4 border-teal-500 rounded-lg">
            <p className="text-sm text-gray-700">
              <strong className="text-teal-700">Quality Assurance:</strong> Your donation will be automatically assessed for quality based on 
              freshness, expiry date, and food safety standards. Only high-quality food (score 75+) will be accepted.
            </p>
          </div>

          {/* Form Actions */}
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" onClick={onCancel} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" className="flex-1 bg-teal-600 hover:bg-teal-700" disabled={(getUser()?.role ?? '') !== 'hotel'}>
              <Upload className="mr-2 h-4 w-4" />
              Submit Donation
            </Button>
          </div>
        </form>
      ) : (
        <LocationPicker 
          onSelect={handleLocationSelect}
          onClose={() => setShowLocationPicker(false)}
          initialLocation={formData.location}
        />
      )}
    </div>
  );
}
