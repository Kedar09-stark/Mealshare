import { useEffect, useState } from 'react';
import { Plus, AlertCircle, Users, Calendar } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { toast } from 'sonner';
import { API_BASE, authHeader, getUser } from '../../lib/auth';
import { getSocket } from '../../lib/socket';

interface DonationRequestsViewProps {}

interface RequestItem {
  id: string;
  requestedItems: string;
  ngoName: string;
  quantity: string;
  urgency: string;
  beneficiaries: string | number;
  purpose: string;
  location: string;
  createdAt: string;
  status: string;
}

export function DonationRequestsView(_: DonationRequestsViewProps) {
  const [requests, setRequests] = useState<RequestItem[]>([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formData, setFormData] = useState({
    requestedItems: '',
    quantity: '',
    urgency: 'medium' as 'low' | 'medium' | 'high',
    beneficiaries: '',
    purpose: '',
    location: ''
  });

  const [loading, setLoading] = useState(false);

  useEffect(() => { fetchRequests(); }, []);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const headers: Record<string,string> = {};
      const ah = authHeader();
      if ((ah as any)?.Authorization) headers.Authorization = (ah as any).Authorization;
      const res = await fetch(`${API_BASE}/api/donations/requests/`, { headers });
      if (!res.ok) throw new Error('Failed to load requests');
      const data = await res.json();
      const mapped = data.map((r: any) => ({
        id: r.id,
        requestedItems: r.requested_items,
        ngoName: r.ngo_name,
        quantity: r.quantity,
        urgency: r.urgency,
        beneficiaries: r.beneficiaries,
        purpose: r.purpose,
        location: r.location,
        createdAt: r.created_at,
        status: r.status,
      }));
      setRequests(mapped);
    } catch (err) {
      console.error(err);
      toast.error('Could not load your requests');
    } finally {
      setLoading(false);
    }
  };

  const openRequests = requests.filter(r => r.status === 'open');
  const fulfilledRequests = requests.filter(r => r.status === 'fulfilled');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.requestedItems || !formData.quantity || !formData.beneficiaries || !formData.purpose || !formData.location) {
      toast.error('Please fill in all required fields');
      return;
    }

    const user = getUser();
    if (!user) {
      toast.error('You must be signed in to post a request');
      return;
    }

    try {
      const payload = {
        requested_items: formData.requestedItems,
        ngo_name: user.username,
        quantity: formData.quantity,
        beneficiaries: String(formData.beneficiaries),
        purpose: formData.purpose,
        location: formData.location,
        urgency: formData.urgency,
      };
      const headers: Record<string,string> = { 'Content-Type': 'application/json' };
      const ah = authHeader();
      if ((ah as any)?.Authorization) headers.Authorization = (ah as any).Authorization;
      const res = await fetch(`${API_BASE}/api/donations/requests/`, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const txt = await res.text();
        throw new Error(txt || 'Create failed');
      }
      const created = await res.json();
      // map server response to local shape and append
      const mapped = {
        id: created.id,
        requestedItems: created.requested_items,
        ngoName: created.ngo_name,
        quantity: created.quantity,
        urgency: created.urgency,
        beneficiaries: created.beneficiaries,
        purpose: created.purpose,
        location: created.location,
        createdAt: created.created_at,
        status: created.status,
      } as RequestItem;
      setRequests(prev => [mapped, ...prev]);
      try {
        const socket = getSocket();
        socket.emit('new_request', mapped);
      } catch (err) {
        // ignore socket errors in UI flow
      }
      toast.success('Request posted successfully! Hotels will be notified.');
      setIsFormOpen(false);
      setFormData({
        requestedItems: '',
        quantity: '',
        urgency: 'medium',
        beneficiaries: '',
        purpose: '',
        location: ''
      });
    } catch (err) {
      console.error(err);
      toast.error('Failed to post request');
    }
  };

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'high': return 'bg-red-100 text-red-800';
      case 'medium': return 'bg-orange-100 text-orange-800';
      case 'low': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1>Donation Requests</h1>
          <p className="text-muted-foreground">Post specific food needs for hotels to see</p>
        </div>
        <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
          <DialogTrigger asChild>
            <Button className="bg-teal-600 hover:bg-teal-700">
              <Plus className="mr-2 h-4 w-4" />
              New Request
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create Donation Request</DialogTitle>
              <DialogDescription>
                Post a request for specific food items that your NGO needs
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="requestedItems">Requested Food Items *</Label>
                <Textarea
                  id="requestedItems"
                  placeholder="E.g., Rice, Lentils, Fresh Vegetables, Cooking Oil..."
                  value={formData.requestedItems}
                  onChange={(e) => setFormData({ ...formData, requestedItems: e.target.value })}
                  required
                />
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="quantity">Quantity Needed *</Label>
                  <Input
                    id="quantity"
                    placeholder="E.g., 100 kg, 50 servings"
                    value={formData.quantity}
                    onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="beneficiaries">Number of Beneficiaries *</Label>
                  <Input
                    id="beneficiaries"
                    type="number"
                    placeholder="E.g., 200"
                    value={formData.beneficiaries}
                    onChange={(e) => setFormData({ ...formData, beneficiaries: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="urgency">Urgency Level *</Label>
                <Select value={formData.urgency} onValueChange={(value: any) => setFormData({ ...formData, urgency: value })}>
                  <SelectTrigger id="urgency">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low - Can wait a week</SelectItem>
                    <SelectItem value="medium">Medium - Needed in 2-3 days</SelectItem>
                    <SelectItem value="high">High - Urgent, needed today</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="purpose">Purpose / Event Details *</Label>
                <Textarea
                  id="purpose"
                  placeholder="Describe what this food will be used for..."
                  value={formData.purpose}
                  onChange={(e) => setFormData({ ...formData, purpose: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="location">Preferred Pickup/Delivery Location *</Label>
                <Input
                  id="location"
                  placeholder="E.g., Downtown Community Center"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  required
                />
              </div>

              <div className="flex gap-3 pt-4">
                <Button type="button" variant="outline" onClick={() => setIsFormOpen(false)} className="flex-1">
                  Cancel
                </Button>
                <Button type="submit" className="flex-1 bg-teal-600 hover:bg-teal-700">
                  Post Request
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Info Card */}
      <Card className="bg-teal-50 border-teal-200">
        <CardContent className="py-4">
          <p className="text-teal-900">
            <AlertCircle className="inline h-4 w-4 mr-1" />
            Hotels can view your requests and reach out if they have matching donations available
          </p>
        </CardContent>
      </Card>

      {/* Open Requests */}
      <div>
        <h3 className="mb-4">Active Requests ({openRequests.length})</h3>
        {openRequests.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-gray-500">
              <AlertCircle className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>No active requests</p>
              <p className="text-sm mt-2">Create a request to let hotels know what you need</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 gap-6">
            {openRequests.map(request => (
              <Card key={request.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex-1">
                      <CardTitle className="text-lg">{request.requestedItems}</CardTitle>
                      <CardDescription>Posted {new Date(request.createdAt).toLocaleDateString()}</CardDescription>
                    </div>
                    <Badge className={getUrgencyColor(request.urgency)}>
                      {request.urgency.toUpperCase()}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <p className="text-sm text-gray-500">Quantity</p>
                      <p className="font-medium">{request.quantity}</p>
                    </div>
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-gray-400" />
                        <div>
                          <p className="text-sm text-gray-500">Beneficiaries</p>
                          <p className="font-medium">{request.beneficiaries}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div>
                    <p className="text-sm text-gray-500 mb-1">Purpose</p>
                    <p className="text-sm">{request.purpose}</p>
                  </div>

                  <div>
                    <p className="text-sm text-gray-500 mb-1">Location</p>
                    <p className="text-sm">{request.location}</p>
                  </div>

                  <div className="flex gap-2 pt-2">
                    <Button variant="outline" className="flex-1">
                      Edit Request
                    </Button>
                    <Button variant="outline" className="flex-1 text-red-600 hover:text-red-700">
                      Cancel Request
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Fulfilled Requests */}
      {fulfilledRequests.length > 0 && (
        <div>
          <h3 className="mb-4">Fulfilled Requests ({fulfilledRequests.length})</h3>
          <div className="grid md:grid-cols-3 gap-4">
            {fulfilledRequests.map(request => (
              <Card key={request.id} className="border-green-200 bg-green-50">
                <CardHeader>
                  <CardTitle className="text-base">{request.requestedItems}</CardTitle>
                  <CardDescription className="text-xs">
                    Fulfilled on {new Date(request.createdAt).toLocaleDateString()}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Badge className="bg-green-600 text-white">
                    Fulfilled
                  </Badge>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}