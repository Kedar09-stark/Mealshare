import { ChevronRight, User, MapPin, Users, AlertCircle, Calendar, Package } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { ContactDialog } from '../ContactDialog';
import { getUser } from '../../lib/auth';
import { useEffect, useState } from 'react';
import { API_BASE, authHeader } from '../../lib/auth';
import { toast } from 'sonner';
import { getSocket } from '../../lib/socket';

interface DonationRequestsListViewProps {}

interface RequestItem {
  id: string;
  requestedItems: string;
  ngo: string | null;
  ngoName: string;
  quantity: string;
  beneficiaries: string;
  purpose: string;
  location: string;
  urgency: string;
  status: string;
  createdAt: string;
  ngoId?: number;
}

export function DonationRequestsListView(_: DonationRequestsListViewProps) {
  const [requests, setRequests] = useState<RequestItem[]>([]);
  const [loading, setLoading] = useState(false);

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'high': return 'bg-red-100 text-red-800';
      case 'medium': return 'bg-orange-100 text-orange-800';
      case 'low': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const headers: Record<string, string> = {};
      const ah = authHeader();
      if ((ah as any)?.Authorization) headers.Authorization = (ah as any).Authorization;
      const res = await fetch(`${API_BASE}/api/donations/requests/`, { headers });
      if (!res.ok) throw new Error('Failed to load requests');
      const data = await res.json();
      const mapped = data.map((r: any) => ({
        id: r.id,
        requestedItems: r.requested_items,
        ngo: r.ngo,
        ngoName: r.ngo_name,
        quantity: r.quantity,
        beneficiaries: r.beneficiaries,
        purpose: r.purpose,
        location: r.location,
        urgency: r.urgency,
        status: r.status,
        createdAt: r.created_at,
        ngoId: r.ngo_id,
      }));
      setRequests(mapped);
    } catch (err) {
      console.error(err);
      toast.error('Could not load donation requests');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchRequests(); }, []);

  useEffect(() => {
    const socket = getSocket();
    const handler = (req: any) => {
      // prepend new request to the list
      setRequests(prev => [{
        id: req.id,
        requestedItems: req.requested_items || req.requestedItems || '',
        ngo: req.ngo || null,
        ngoName: req.ngo_name || req.ngoName || '',
        quantity: req.quantity || '',
        beneficiaries: req.beneficiaries || '',
        purpose: req.purpose || '',
        location: req.location || '',
        urgency: req.urgency || 'medium',
        status: req.status || 'open',
        createdAt: req.created_at || req.createdAt || new Date().toISOString(),
        ngoId: req.ngo_id,
      }, ...prev]);
    };
    socket.on('new_request', handler);
    return () => {
      try { socket.off('new_request', handler); } catch {}
    };
  }, []);

  const openRequests = requests.filter(r => r.status === 'open');

  return (
    <div className="p-4 sm:p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto lg:p-8 max-w-7xl mx-auto space-y-6">
      <div>
        <h1>NGO Donation Requests</h1>
        <p className="text-muted-foreground">See what NGOs need and fulfill their requests</p>
      </div>

      <Card className="bg-teal-50 border-teal-200">
        <CardContent className="pt-6 pbt-6 pb-66">
          <p className="text-teal-900">
            <AlertCircle className="inline h-4 w-4 mr-1" />
            NGOs post specific food requests here. If you have matching items, you can contact them directly
          </p>
        </CardContent>
      </Card>

      <div>
        <h3 className="mb-4">Open Requests ({openRequests.length})</h3>
        {openRequests.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-gray-500">
              <AlertCircle className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>No open requests at the moment</p>
              <p className="text-sm mt-2">Check back later for new requests from NGOs</p>
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
                      <CardDescription>{request.ngoName}</CardDescription>
                    </div>
                    <Badge className={getUrgencyColor(request.urgency)}>
                      {request.urgency.toUpperCase()}
                    </Badge>
                  </div>
                  <p className="text-xs text-gray-500">
                    Posted {new Date(request.createdAt).toLocaleDateString()}
                  </p>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <p className="text-sm text-gray-500">Quantity Needed</p>
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

                  <div className="space-y-2">
                    <ContactDialog
                    contactName={request.ngoName}
                    contactEmail={`contact@${request.ngoName.toLowerCase().replace(/\s+/g, '')}.org`}
                    contactPhone="+1 555-0200"
                    contactId={request.ngoId}
                    trigger={
                      <Button 
                        className="w-full bg-teal-600 hover:bg-teal-700"
                      >
                        Contact NGO
                      </Button>
                    }
                  />
                    {getUser()?.role === 'hotel' && (
                      <div className="flex flex-col gap-2 mt-2">
                        <Button
                          onClick={async () => {
                            try {
                              const headers: Record<string,string> = {};
                              const ah = authHeader();
                              if ((ah as any)?.Authorization) headers.Authorization = (ah as any).Authorization;
                              const res = await fetch(`${API_BASE}/api/donations/requests/${request.id}/reserve/`, {
                                method: 'POST',
                                headers,
                              });
                              if (!res.ok) {
                                const txt = await res.text();
                                throw new Error(txt || 'Reserve failed');
                              }
                              toast.success('Request status changed to reserved');
                              setRequests(prev => prev.filter(p => p.id !== request.id));
                            } catch (err) {
                              console.error(err);
                              toast.error('Failed to reserve request');
                            }
                          }}
                          className="w-full bg-indigo-600 hover:bg-indigo-700"
                        >
                          Reserve
                        </Button>
                        <Button
                          onClick={async () => {
                            try {
                              const headers: Record<string,string> = {};
                              const ah = authHeader();
                              if ((ah as any)?.Authorization) headers.Authorization = (ah as any).Authorization;
                              const res = await fetch(`${API_BASE}/api/donations/requests/${request.id}/claim/`, {
                                method: 'POST',
                                headers,
                              });
                              if (!res.ok) {
                                const txt = await res.text();
                                throw new Error(txt || 'Create Donation failed');
                              }
                              const donation = await res.json();
                              toast.success('Request converted to Donation — added to your My Donations');
                              setRequests(prev => prev.filter(p => p.id !== request.id));
                            } catch (err) {
                              console.error(err);
                              toast.error('Failed to create donation');
                            }
                          }}
                          className="w-full bg-teal-600 hover:bg-teal-700"
                        >
                          Create Donation
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
      <div className="mt-6">
        <div className="flex gap-2">
          <Button onClick={fetchRequests} className="bg-gray-100">Refresh</Button>
        </div>
      </div>
    </div>
  );
}