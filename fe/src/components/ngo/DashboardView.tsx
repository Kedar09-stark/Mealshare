import { Package, TrendingUp, Clock, Calendar, Heart, AlertCircle } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Progress } from '../ui/progress';
import { Donation, Message } from '../../App';
import { API_BASE, authHeader, getCurrentUser } from '../../lib/auth';
import { formatFoodItems } from '../../lib/utils';
import { QualityBadge } from '../QualityBadge';

interface DashboardViewProps {
  donations: Donation[];
  messages: Message[];
}

export function DashboardView({ donations, messages }: DashboardViewProps) {
  const me = getCurrentUser();
  const myName = me?.username ?? '';
  const [liveDonations, setLiveDonations] = useState<Donation[]>(donations ?? []);
  const [liveMessages, setLiveMessages] = useState<Message[]>(messages ?? []);

  useEffect(() => {
    const headers = { 'Content-Type': 'application/json', ...(authHeader() as Record<string,string>) };
    (async () => {
      try {
        const dRes = await fetch(`${API_BASE}/api/donations/`, { headers });
        if (dRes.ok) {
          const data = await dRes.json();
          const mapped: Donation[] = (Array.isArray(data) ? data : []).map((d: any) => {
            let loc: { address: string; coordinates: { lat: number; lng: number } };
            if (typeof d.location === 'string') {
              loc = { address: d.location, coordinates: { lat: 0, lng: 0 } };
            } else if (d.location && typeof d.location === 'object') {
              const lat = typeof d.location.coordinates?.lat === 'number' ? d.location.coordinates.lat : 0;
              const lng = typeof d.location.coordinates?.lng === 'number' ? d.location.coordinates.lng : 0;
              loc = {
                address: d.location.address || '',
                coordinates: {
                  lat: isNaN(lat) ? 0 : lat,
                  lng: isNaN(lng) ? 0 : lng
                }
              };
            } else {
              loc = { address: '', coordinates: { lat: 0, lng: 0 } };
            }
            return {
              id: String(d.id),
              hotelName: d.hotel_name ?? '',
              foodItems: d.food_items ?? '',
              quantity: d.quantity ?? '',
              category: d.category ?? '',
              expiryDate: d.expiry_date ?? '',
              location: loc,
              qualityScore: Number(d.quality_score ?? 0),
              status: d.status ?? 'available',
              reservedBy: typeof d.reserved_by === 'object' ? (d.reserved_by?.username ?? undefined) : (d.reserved_by ?? undefined),
              pickupSchedule: d.pickup_schedule ?? undefined,
              createdAt: d.created_at ?? new Date().toISOString(),
              imageUrl: d.image_url ?? '',
              servingSize: d.serving_size ?? '',
            } as Donation;
          });
          setLiveDonations(mapped);
        }
      } catch {}
      try {
        const mRes = await fetch(`${API_BASE}/api/messages/`, { headers });
        if (mRes.ok) {
          const data = await mRes.json();
          const seenIds = new Set<string>();
          const mapped: Message[] = (Array.isArray(data) ? data : [])
            .map((m: any) => ({
              id: String(m.id),
              from: m.sender_name ?? 'Unknown',
              to: m.receiver_name ?? 'Unknown',
              message: m.content ?? '',
              timestamp: m.timestamp ?? new Date().toISOString(),
              read: typeof m.is_read === 'boolean' ? m.is_read : !(m.receiver_name === myName),
            }))
            .filter((msg: Message) => {
              if (seenIds.has(msg.id)) return false;
              seenIds.add(msg.id);
              return true;
            });
          setLiveMessages(mapped);
        }
      } catch {}
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const available = liveDonations.filter(d => d.status === 'available');
  const myPickups = liveDonations.filter(d => d.reservedBy === myName);
  const completed = liveDonations.filter(d => d.status === 'completed' && d.reservedBy === myName);
  const unreadMessages = liveMessages.filter(m => !m.read && m.to === myName);

  // Calculate impact metrics
  const totalMealsServed = completed.length * 75; // Average meals per donation
  const peopleHelped = Math.floor(totalMealsServed / 2); // Estimate 2 meals per person
  const monthlyGoal = 5000;
  const monthlyProgress = (totalMealsServed / monthlyGoal) * 100;

  // Urgent pickups (today or expired)
  const urgentPickups = myPickups.filter(d => {
    const expiry = new Date(d.expiryDate);
    const today = new Date();
    return expiry <= today || d.pickupSchedule === new Date().toISOString().split('T')[0];
  });

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      <div>
        <h1>Welcome Back!</h1>
        <p className="text-muted-foreground">Here's your impact and activity overview</p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-teal-500 to-teal-600 text-white border-0">
          <CardHeader className="pb-3">
            <CardDescription className="text-teal-100">Available Now</CardDescription>
            <CardTitle className="text-3xl">{available.length}</CardTitle>
          </CardHeader>
          <CardContent>
            <Package className="h-8 w-8 opacity-80" />
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-500 to-orange-600 text-white border-0">
          <CardHeader className="pb-3">
            <CardDescription className="text-orange-100">My Pickups</CardDescription>
            <CardTitle className="text-3xl">{myPickups.length}</CardTitle>
          </CardHeader>
          <CardContent>
            <Calendar className="h-8 w-8 opacity-80" />
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white border-0">
          <CardHeader className="pb-3">
            <CardDescription className="text-purple-100">Meals Served</CardDescription>
            <CardTitle className="text-3xl">{totalMealsServed}</CardTitle>
          </CardHeader>
          <CardContent>
            <Heart className="h-8 w-8 opacity-80" />
          </CardContent>
        </Card>
      </div>

      {/* Urgent Alerts */}
      {urgentPickups.length > 0 && (
        <Card className="border-orange-200 bg-orange-50">
          <CardHeader>
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-orange-600" />
              <CardTitle className="text-orange-900">Urgent Pickups Required</CardTitle>
            </div>
            <CardDescription className="text-orange-700">
              {urgentPickups.length} donation(s) need immediate attention
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {urgentPickups.slice(0, 3).map(donation => (
              <div key={`urgent-${donation.id}`} className="flex items-center justify-between p-3 bg-white rounded-lg">
                <div className="flex-1">
                  <p className="font-medium">{formatFoodItems(donation.foodItems)}</p>
                  <p className="text-sm text-gray-600">{donation.hotelName}</p>
                </div>
                <Badge className="bg-orange-600 text-white">Urgent</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <div className="grid md:grid-cols-2 gap-6">
        {/* Monthly Goal Progress */}
        <Card>
          <CardHeader>
            <CardTitle>Monthly Impact Goal</CardTitle>
            <CardDescription>Track your progress towards {monthlyGoal.toLocaleString()} meals</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-sm text-muted-foreground">Progress</span>
                <span className="text-sm">{totalMealsServed} / {monthlyGoal} meals</span>
              </div>
              <Progress value={monthlyProgress} className="h-3" />
              <p className="text-xs text-muted-foreground mt-2">
                {monthlyProgress.toFixed(1)}% of monthly goal achieved
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4 pt-4 border-t">
              <div>
                <p className="text-sm text-muted-foreground">People Helped</p>
                <p className="text-2xl">{peopleHelped}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Donations Received</p>
                <p className="text-2xl">{completed.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Recent Available Donations */}
        <Card>
          <CardHeader>
            <CardTitle>Recently Added Donations</CardTitle>
            <CardDescription>Fresh donations available for pickup</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {available.slice(0, 3).map(donation => (
              <div key={`available-${donation.id}`} className="flex items-start gap-3 p-3 border rounded-lg hover:bg-gray-50 transition-colors">
                <div className="w-16 h-16 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                  <img 
                    src={donation.imageUrl} 
                    alt={formatFoodItems(donation.foodItems)}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{formatFoodItems(donation.foodItems)}</p>
                  <p className="text-sm text-gray-600">{donation.hotelName}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <QualityBadge score={donation.qualityScore} size="sm" />
                    <span className="text-xs text-gray-500">{donation.servingSize}</span>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Unread Messages */}
      {unreadMessages.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Unread Messages ({unreadMessages.length})</CardTitle>
            <CardDescription>You have new messages from hotels</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {unreadMessages.slice(0, 3).map(msg => (
              <div key={`message-${msg.id}`} className="p-3 bg-teal-50 border border-teal-200 rounded-lg">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="font-medium text-teal-900">{msg.from}</p>
                    <p className="text-sm text-teal-700 mt-1">{msg.message}</p>
                    <p className="text-xs text-teal-600 mt-1">
                      {new Date(msg.timestamp).toLocaleString()}
                    </p>
                  </div>
                  <Badge className="bg-orange-600 text-white">New</Badge>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-4">
            <button className="p-4 border-2 border-dashed border-teal-300 rounded-lg hover:bg-teal-50 hover:border-teal-500 transition-colors text-left">
              <Package className="h-6 w-6 text-teal-600 mb-2" />
              <p className="font-medium">Browse Donations</p>
              <p className="text-sm text-gray-600">View all available food</p>
            </button>
            <button className="p-4 border-2 border-dashed border-orange-300 rounded-lg hover:bg-orange-50 hover:border-orange-500 transition-colors text-left">
              <Calendar className="h-6 w-6 text-orange-600 mb-2" />
              <p className="font-medium">Schedule Pickup</p>
              <p className="text-sm text-gray-600">Plan your collections</p>
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}