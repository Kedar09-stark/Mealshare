import { Package, Clock, CheckCircle, MessageSquare, Heart, TrendingUp } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Progress } from '../ui/progress';
import { Donation, Message, DonationRequest } from '../../App';
import { API_BASE, authHeader, getCurrentUser } from '../../lib/auth';
import { QualityBadge } from '../QualityBadge';

interface HotelDashboardViewProps {
  donations: Donation[];
  messages: Message[];
  requests: DonationRequest[];
}

export function HotelDashboardView({ donations, messages, requests }: HotelDashboardViewProps) {
  const me = getCurrentUser();
  const myName = me?.username ?? '';
  const [liveDonations, setLiveDonations] = useState<Donation[]>(donations ?? []);
  const [liveMessages, setLiveMessages] = useState<Message[]>(messages ?? []);
  const [liveRequests, setLiveRequests] = useState<DonationRequest[]>(requests ?? []);

  useEffect(() => {
    const headers = { 'Content-Type': 'application/json', ...(authHeader() as Record<string,string>) };
    (async () => {
      try {
        const dRes = await fetch(`${API_BASE}/api/donations/`, { headers });
        if (dRes.ok) {
          const data = await dRes.json();
          const mapped: Donation[] = (Array.isArray(data) ? data : []).map((d: any) => {
            const loc = typeof d.location === 'string' ? { address: d.location, coordinates: { lat: 0, lng: 0 } } : (d.location ?? { address: '', coordinates: { lat: 0, lng: 0 } });
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
        const rRes = await fetch(`${API_BASE}/api/donations/requests/`, { headers });
        if (rRes.ok) {
          const data = await rRes.json();
          const mapped: DonationRequest[] = (Array.isArray(data) ? data : []).map((r: any) => ({
            id: String(r.id),
            ngoName: r.ngo_name ?? r.ngo ?? 'Unknown',
            requestedItems: r.requested_items ?? '',
            quantity: r.quantity ?? '',
            urgency: r.urgency ?? 'medium',
            beneficiaries: Number(r.beneficiaries ?? 0),
            purpose: r.purpose ?? '',
            location: r.location ?? '',
            createdAt: r.created_at ?? new Date().toISOString(),
            status: r.status ?? 'open',
            ngoId: r.ngo_id ?? undefined,
          }));
          setLiveRequests(mapped);
        }
      } catch {}
      try {
        const mRes = await fetch(`${API_BASE}/api/messages/`, { headers });
        if (mRes.ok) {
          const data = await mRes.json();
          const mapped: Message[] = (Array.isArray(data) ? data : []).map((m: any) => ({
            id: String(m.id),
            from: m.sender_name ?? 'Unknown',
            to: m.receiver_name ?? 'Unknown',
            message: m.content ?? '',
            timestamp: m.timestamp ?? new Date().toISOString(),
            read: typeof m.is_read === 'boolean' ? m.is_read : !(m.receiver_name === myName),
          }));
          setLiveMessages(mapped);
        }
      } catch {}
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const available = liveDonations.filter(d => d.status === 'available');
  const reserved = liveDonations.filter(d => d.status === 'reserved');
  const completed = liveDonations.filter(d => d.status === 'completed');
  const unreadMessages = liveMessages.filter(m => !m.read && m.to === myName);
  const openRequests = liveRequests.filter(r => r.status === 'open');

  // Calculate impact
  const totalMealsDonated = completed.length * 75;
  const peopleHelped = Math.floor(totalMealsDonated / 2);
  const wasteReduced = completed.reduce((acc, d) => acc + parseFloat(d.quantity.replace(/[^\d.]/g, '') || '0'), 0);

  // Monthly goal
  const monthlyGoal = 10;
  const monthlyProgress = (donations.length / monthlyGoal) * 100;

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      <div>
        <h1>Welcome Back!</h1>
        <p className="text-muted-foreground">Here's your donation impact overview</p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-teal-500 to-teal-600 text-white border-0">
          <CardHeader className="pb-3">
            <CardDescription className="text-teal-100">Total Donations</CardDescription>
            <CardTitle className="text-3xl">{liveDonations.length}</CardTitle>
          </CardHeader>
          <CardContent>
            <Package className="h-8 w-8 opacity-80" />
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-500 to-orange-600 text-white border-0">
          <CardHeader className="pb-3">
            <CardDescription className="text-orange-100">Available Now</CardDescription>
            <CardTitle className="text-3xl">{available.length}</CardTitle>
          </CardHeader>
          <CardContent>
            <Clock className="h-8 w-8 opacity-80" />
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white border-0">
          <CardHeader className="pb-3">
            <CardDescription className="text-purple-100">Reserved</CardDescription>
            <CardTitle className="text-3xl">{reserved.length}</CardTitle>
          </CardHeader>
          <CardContent>
            <CheckCircle className="h-8 w-8 opacity-80" />
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white border-0">
          <CardHeader className="pb-3">
            <CardDescription className="text-green-100">Completed</CardDescription>
            <CardTitle className="text-3xl">{completed.length}</CardTitle>
          </CardHeader>
          <CardContent>
            <Heart className="h-8 w-8 opacity-80" />
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Goal */}
        <Card>
          <CardHeader>
            <CardTitle>Monthly Donation Goal</CardTitle>
            <CardDescription>Track progress towards {monthlyGoal} donations</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-sm text-muted-foreground">Progress</span>
                <span className="text-sm">{liveDonations.length} / {monthlyGoal} donations</span>
              </div>
              <Progress value={monthlyProgress} className="h-3" />
              <p className="text-xs text-muted-foreground mt-2">
                {monthlyProgress.toFixed(1)}% of monthly goal achieved
              </p>
            </div>
            <div className="grid grid-cols-3 gap-4 pt-4 border-t">
              <div>
                <p className="text-sm text-muted-foreground">Meals</p>
                <p className="text-2xl">{totalMealsDonated}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">People</p>
                <p className="text-2xl">{peopleHelped}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Waste Saved</p>
                <p className="text-xl">{wasteReduced.toFixed(0)}kg</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* NGO Requests */}
        <Card>
          <CardHeader>
            <CardTitle>NGO Requests ({openRequests.length})</CardTitle>
            <CardDescription>See what NGOs are looking for</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {openRequests.slice(0, 3).map(request => (
              <div key={request.id} className="p-3 border rounded-lg hover:bg-gray-50 transition-colors">
                <div className="flex justify-between items-start mb-1">
                  <p className="font-medium">{request.requestedItems}</p>
                  <Badge className={
                    request.urgency === 'high' ? 'bg-red-100 text-red-800' :
                    request.urgency === 'medium' ? 'bg-orange-100 text-orange-800' :
                    'bg-blue-100 text-blue-800'
                  }>
                    {request.urgency}
                  </Badge>
                </div>
                <p className="text-sm text-gray-600">{request.ngoName}</p>
                <p className="text-xs text-gray-500 mt-1">{request.quantity} • {request.beneficiaries} beneficiaries</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Recent Donations */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Donations</CardTitle>
            <CardDescription>Your latest food donations</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {liveDonations.slice(0, 3).map(donation => (
              <div key={donation.id} className="flex items-start gap-3 p-3 border rounded-lg">
                <div className="w-16 h-16 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                  <img 
                    src={donation.imageUrl} 
                    alt={donation.foodItems}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{donation.foodItems}</p>
                  <p className="text-sm text-gray-600">{donation.quantity}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge className={
                      donation.status === 'available' ? 'bg-teal-100 text-teal-800' :
                      donation.status === 'reserved' ? 'bg-purple-100 text-purple-800' :
                      donation.status === 'completed' ? 'bg-green-100 text-green-800' :
                      'bg-gray-100 text-gray-800'
                    }>
                      {donation.status}
                    </Badge>
                    <QualityBadge score={donation.qualityScore} size="sm" />
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Messages */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Messages</CardTitle>
            <CardDescription>{unreadMessages.length} unread messages</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {liveMessages.slice(0, 3).map(msg => (
              <div key={msg.id} className={`p-3 rounded-lg ${msg.read ? 'bg-gray-50' : 'bg-teal-50 border border-teal-200'}`}>
                <div className="flex items-start justify-between mb-1">
                  <p className="font-medium text-sm">{msg.from}</p>
                  {!msg.read && <Badge className="bg-orange-600 text-white">New</Badge>}
                </div>
                <p className="text-sm text-gray-600 line-clamp-2">{msg.message}</p>
                <p className="text-xs text-gray-500 mt-1">
                  {new Date(msg.timestamp).toLocaleString()}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Impact Summary */}
      <Card className="bg-gradient-to-r from-teal-50 to-orange-50 border-teal-200">
        <CardHeader>
          <CardTitle className="text-teal-900">Your Impact This Month</CardTitle>
          <CardDescription className="text-teal-700">Making a difference in the community</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-4 gap-6 text-center">
            <div>
              <Heart className="h-10 w-10 text-teal-600 mx-auto mb-2" />
              <p className="text-3xl text-teal-900">{peopleHelped}</p>
              <p className="text-sm text-teal-700">People Helped</p>
            </div>
            <div>
              <Package className="h-10 w-10 text-orange-600 mx-auto mb-2" />
              <p className="text-3xl text-orange-900">{totalMealsDonated}</p>
              <p className="text-sm text-orange-700">Meals Donated</p>
            </div>
            <div>
              <TrendingUp className="h-10 w-10 text-green-600 mx-auto mb-2" />
              <p className="text-3xl text-green-900">{wasteReduced.toFixed(0)} kg</p>
              <p className="text-sm text-green-700">Waste Reduced</p>
            </div>
            <div>
              <CheckCircle className="h-10 w-10 text-purple-600 mx-auto mb-2" />
              <p className="text-3xl text-purple-900">{completed.length}</p>
              <p className="text-sm text-purple-700">Successful Donations</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}