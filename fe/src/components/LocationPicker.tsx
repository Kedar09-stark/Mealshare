import { useState, useEffect, useRef } from 'react';
import { MapPin, Search, X, Navigation } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { toast } from 'sonner';

interface LocationPickerProps {
  onSelect: (location: { address: string; coordinates: { lat: number; lng: number } }) => void;
  onClose: () => void;
  initialLocation?: { address: string; coordinates: { lat: number; lng: number } };
}

const PRESET_LOCATIONS = [
  { name: '123 Main St, Downtown', lat: 40.7128, lng: -74.0060 },
  { name: '456 Oak Ave, Uptown', lat: 40.7589, lng: -73.9851 },
  { name: '789 Beach Rd, Coastal Area', lat: 40.7489, lng: -73.9680 },
  { name: '321 Park Lane, Midtown', lat: 40.7549, lng: -73.9840 },
  { name: '654 River St, Waterfront', lat: 40.7189, lng: -74.0070 },
  { name: '987 Hill Rd, Heights', lat: 40.7689, lng: -73.9750 }
];

export function LocationPicker({ onSelect, onClose, initialLocation }: LocationPickerProps) {
  // Validate initialLocation has valid coordinates
  const validatedInitialLocation = initialLocation && 
    typeof initialLocation.coordinates.lat === 'number' && 
    typeof initialLocation.coordinates.lng === 'number' &&
    !isNaN(initialLocation.coordinates.lat) &&
    !isNaN(initialLocation.coordinates.lng)
    ? initialLocation
    : undefined;

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLocation, setSelectedLocation] = useState(validatedInitialLocation);
  const [hoveredLocation, setHoveredLocation] = useState<number | null>(null);
  const [searchResults, setSearchResults] = useState<typeof PRESET_LOCATIONS>([]);
  const [searching, setSearching] = useState(false);
  const searchTimeout = useRef<number | null>(null);

  // Debounced forward geocoding when searchQuery changes
  useEffect(() => {
    if (searchTimeout.current) window.clearTimeout(searchTimeout.current);
    if (!searchQuery || searchQuery.length <= 2) {
      setSearchResults([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    // debounce
    searchTimeout.current = window.setTimeout(async () => {
      try {
        const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&addressdetails=1&limit=8`);
        if (!res.ok) throw new Error('Geocode failed');
        const arr = await res.json();
        const mapped = arr
          .map((r: any) => {
            const lat = parseFloat(r.lat);
            const lng = parseFloat(r.lon);
            // Validate that both coordinates are valid numbers
            if (isNaN(lat) || isNaN(lng)) return null;
            return { name: r.display_name as string, lat, lng };
          })
          .filter((item): item is { name: string; lat: number; lng: number } => item !== null);
        setSearchResults(mapped);
      } catch (err) {
        setSearchResults([]);
      } finally {
        setSearching(false);
      }
    }, 450);
    return () => { if (searchTimeout.current) window.clearTimeout(searchTimeout.current); }
  }, [searchQuery]);

  const filteredPreset = PRESET_LOCATIONS.filter(loc =>
    loc.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const locationsToShow = (searchQuery.length > 2 || searchResults.length > 0) ? searchResults : filteredPreset;

  const handleSelectLocation = (location: typeof PRESET_LOCATIONS[0]) => {
    // Validate coordinates before setting
    if (typeof location.lat !== 'number' || typeof location.lng !== 'number' || isNaN(location.lat) || isNaN(location.lng)) {
      toast.error('Invalid location coordinates');
      return;
    }
    setSelectedLocation({
      address: location.name,
      coordinates: { lat: location.lat, lng: location.lng }
    });
  };

  const handleConfirm = () => {
    if (!selectedLocation) {
      toast.error('Please select a location');
      return;
    }
    onSelect(selectedLocation);
  };

  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation not supported by your browser');
      return;
    }
    toast('Detecting current location...');
    navigator.geolocation.getCurrentPosition(async (pos) => {
      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;
      
      // Validate coordinates
      if (typeof lat !== 'number' || typeof lng !== 'number' || isNaN(lat) || isNaN(lng)) {
        toast.error('Invalid geolocation coordinates');
        return;
      }
      
      try {
        const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`);
        if (res.ok) {
          const json = await res.json();
          const display = json.display_name ?? `Lat ${lat.toFixed(4)}, Lng ${lng.toFixed(4)}`;
          setSelectedLocation({ address: display + ' (Current Location)', coordinates: { lat, lng } });
          toast.success('Current location detected');
        } else {
          setSelectedLocation({ address: `Lat ${lat.toFixed(4)}, Lng ${lng.toFixed(4)} (Current Location)`, coordinates: { lat, lng } });
          toast.success('Current location detected');
        }
      } catch (err) {
        setSelectedLocation({ address: `Lat ${lat.toFixed(4)}, Lng ${lng.toFixed(4)} (Current Location)`, coordinates: { lat, lng } });
        toast.success('Current location detected');
      }
    }, (err) => {
      toast.error('Unable to retrieve current location');
    });
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between pb-3 border-b">
        <div>
          <h3 className="text-lg">Select Pickup Location</h3>
          <p className="text-sm text-gray-500 mt-1">Choose where NGOs can collect the food donation</p>
        </div>
        <Button variant="ghost" size="sm" onClick={onClose} className="hover:bg-gray-100">
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Left Side - Search and List */}
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search for an address..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          <Button 
            variant="outline" 
            className="w-full border-teal-200 hover:bg-teal-50 hover:border-teal-400"
            onClick={handleUseCurrentLocation}
          >
            <Navigation className="mr-2 h-4 w-4 text-teal-600" />
            Use Current Location
          </Button>

          <div className="space-y-2">
            <p className="text-sm text-gray-600">Available Locations:</p>
            <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
              {locationsToShow.map((location: { name: string; lat: number; lng: number }, index: number) => (
                <button
                  key={index}
                  onClick={() => handleSelectLocation(location)}
                  onMouseEnter={() => setHoveredLocation(index)}
                  onMouseLeave={() => setHoveredLocation(null)}
                  className={`w-full p-3 rounded-lg border-2 text-left transition-all ${
                    selectedLocation?.address === location.name
                      ? 'border-teal-500 bg-teal-50 shadow-sm'
                      : hoveredLocation === index
                      ? 'border-orange-300 bg-orange-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-start gap-2">
                    <MapPin className={`h-5 w-5 mt-0.5 flex-shrink-0 ${
                      selectedLocation?.address === location.name ? 'text-teal-600' : 'text-gray-400'
                    }`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm truncate">{location.name}</p>
                      <p className="text-xs text-gray-500">
                        {location.lat.toFixed(4)}, {location.lng.toFixed(4)}
                      </p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right Side - Map Preview */}
        <div className="space-y-4">
          <div className="aspect-square rounded-xl border-2 border-gray-300 bg-gray-50 relative overflow-hidden shadow-inner">
            {/* Interactive Map Visualization (OpenStreetMap embed) */}
            <div className="absolute inset-0">
              <div className="w-full h-full relative">
                {selectedLocation ? (
                  (() => {
                    const lat = selectedLocation.coordinates.lat;
                    const lng = selectedLocation.coordinates.lng;
                    
                    // Validate coordinates are valid numbers
                    if (typeof lat !== 'number' || typeof lng !== 'number' || isNaN(lat) || isNaN(lng)) {
                      return (
                        <div className="w-full h-full flex items-center justify-center bg-gray-100 text-sm text-gray-600">
                          Invalid coordinates. Please select a valid location.
                        </div>
                      );
                    }
                    
                    const delta = 0.01;
                    const left = lng - delta;
                    const right = lng + delta;
                    const bottom = lat - delta;
                    const top = lat + delta;
                    const bbox = `${left},${bottom},${right},${top}`;
                    const iframeSrc = `https://www.openstreetmap.org/export/embed.html?bbox=${encodeURIComponent(bbox)}&layer=mapnik&marker=${encodeURIComponent(lng + ',' + lat)}`;
                    return (
                      <div className="w-full h-full relative">
                        <iframe
                          title="pickup-map"
                          src={iframeSrc}
                          className="w-full h-full border-0"
                        />
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
                          <MapPin className="h-10 w-10 text-teal-600 drop-shadow-lg" />
                        </div>
                      </div>
                    );
                  })()
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-teal-100 via-blue-50 to-teal-100 relative">
                    <div 
                      className="absolute inset-0 opacity-20"
                      style={{
                        backgroundImage: `
                          linear-gradient(to right, #0d9488 1px, transparent 1px),
                          linear-gradient(to bottom, #0d9488 1px, transparent 1px)
                        `,
                        backgroundSize: '40px 40px'
                      }}
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Map Controls */}
            <div className="absolute top-3 right-3 flex flex-col gap-2">
              <Button size="sm" variant="secondary" className="shadow-lg w-8 h-8 p-0">+</Button>
              <Button size="sm" variant="secondary" className="shadow-lg w-8 h-8 p-0">-</Button>
            </div>

            {/* Compass */}
            <div className="absolute top-3 left-3 bg-white rounded-full p-2 shadow-lg">
              <Navigation className="h-5 w-5 text-teal-600" />
            </div>
          </div>

          {selectedLocation && (
            <div className="p-4 bg-teal-50 border-2 border-teal-200 rounded-lg">
              <div className="flex items-start gap-3">
                <MapPin className="h-5 w-5 text-teal-600 mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm">{selectedLocation.address}</p>
                  <p className="text-xs text-gray-600 mt-1">
                    Lat: {selectedLocation.coordinates.lat.toFixed(4)}, 
                    Lng: {selectedLocation.coordinates.lng.toFixed(4)}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3 pt-2 border-t">
        <Button variant="outline" onClick={onClose} className="flex-1">
          Cancel
        </Button>
        <Button 
          onClick={handleConfirm} 
          className="flex-1 bg-teal-600 hover:bg-teal-700"
          disabled={!selectedLocation}
        >
          <MapPin className="mr-2 h-4 w-4" />
          Confirm Location
        </Button>
      </div>
    </div>
  );
}
