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
import { formatFoodItems } from '../../lib/utils';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from "../ui/dialog";
import { Textarea } from "../ui/textarea";

interface MyPickupsViewProps {
  updateDonation: (id: string, updates: Partial<Donation>) => void;
}

function isReservedByCurrentUser(reservedBy: any, userId: string, username: string) {
  if (!reservedBy) return false;
  if (typeof reservedBy === 'object') {
    const r: any = reservedBy;
    return String(r.id ?? '').toString() === userId || r.username === username || r.email === username;
  }
  return reservedBy === userId || reservedBy === username;
}

export function MyPickupsView({ updateDonation }: MyPickupsViewProps) {

  const user = getCurrentUser ? getCurrentUser() : null;
  const userId = user?.id?.toString() ?? '';
  const username = user?.username?.toString() ?? '';

  const [donations, setDonations] = useState<Donation[]>([]);
  const [loading, setLoading] = useState(false);

  const [ratingDialogOpen, setRatingDialogOpen] = useState(false);
  const [selectedDonation, setSelectedDonation] = useState<Donation | null>(null);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");

  useEffect(() => {
    const fetchDonations = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/donations/my-pickups/`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json', ...(authHeader() as Record<string,string>) }
        });

        const data = await res.json();

        const mapped = data.map((d: any) => ({
          id: d.id?.toString(),
          hotelName: d.hotel_name,
          foodItems: d.food_items,
          quantity: d.quantity,
          expiryDate: d.expiry_date,
          location: d.location,
          qualityScore: d.quality_score,
          status: d.status,
          reservedBy: d.reserved_by,
          pickupSchedule: d.pickup_schedule,
          imageUrl: d.image_url,
          rating: d.rating,
          ownerId: d.owner_id
        }));

        const relevant = mapped.filter((m:any) =>
          ['reserved','picked-up','completed'].includes(m.status) &&
          isReservedByCurrentUser(m.reservedBy,userId,username)
        );

        setDonations(relevant);

      } catch (err:any) {
        toast.error(err?.message ?? "Failed to load pickups");
      }
    };

    fetchDonations();
  }, []);

  const reserved = donations.filter(d => d.status === 'reserved');
  const pickedUp = donations.filter(d => d.status === 'picked-up');
  const completed = donations.filter(d => d.status === 'completed');

  const handleMarkPickedUp = (donation: Donation) => {
    setSelectedDonation(donation);
    setRatingDialogOpen(true);
  };

  const submitRating = async () => {

    if (!selectedDonation) return;

    try {

      const res = await fetch(`${API_BASE}/api/donations/${selectedDonation.id}/update-status/`, {
        method:'POST',
        headers:{
          'Content-Type':'application/json',
          ...(authHeader() as Record<string,string>)
        },
        body: JSON.stringify({
          status:'completed',
          rating: rating,
          rating_comment: comment
        })
      });

      if(!res.ok){
        const txt = await res.text();
        throw new Error(txt || "Failed to submit rating");
      }

      updateDonation(selectedDonation.id,{status:'completed',rating});

      setDonations(prev => prev.filter(d => d.id !== selectedDonation.id));

      toast.success("Pickup completed! Thank you.");

      setRatingDialogOpen(false);
      setComment("");
      setRating(5);

    } catch(err:any){
      toast.error(err?.message ?? "Failed to submit rating");
    }
  };

  const renderDonationCard = (donation: Donation) => {

    return (

      <Card key={donation.id} className="hover:shadow-lg">

        <CardHeader>

          <div className="flex justify-between">

            <div>
              <CardTitle>{formatFoodItems(donation.foodItems)}</CardTitle>
              <CardDescription>{donation.hotelName}</CardDescription>
            </div>

            <QualityBadge score={donation.qualityScore} />

          </div>

        </CardHeader>

        <CardContent className="space-y-4">

          <img
            src={donation.imageUrl}
            className="rounded-lg"
          />

          <div className="text-sm">
            <p><b>Quantity:</b> {donation.quantity}</p>
            <p><b>Location:</b> {donation.location?.address}</p>
          </div>

          {donation.status === "reserved" && (
            <Button
              onClick={()=>handleMarkPickedUp(donation)}
              className="w-full bg-teal-600 hover:bg-teal-700"
            >
              <CheckCircle className="mr-2 h-4 w-4"/>
              Mark Picked Up
            </Button>
          )}

        </CardContent>

      </Card>
    );
  };

  return (

    <div className="p-6 space-y-6">

      <h1 className="text-2xl font-bold">My Pickups</h1>

      <Tabs defaultValue="scheduled">

        <TabsList>

          <TabsTrigger value="scheduled">
            Scheduled ({reserved.length})
          </TabsTrigger>

          <TabsTrigger value="completed">
            Completed ({completed.length})
          </TabsTrigger>

        </TabsList>

        <TabsContent value="scheduled">

          <div className="grid md:grid-cols-2 gap-6">
            {reserved.map(renderDonationCard)}
          </div>

        </TabsContent>

        <TabsContent value="completed">

          <div className="grid md:grid-cols-3 gap-6">
            {completed.map(renderDonationCard)}
          </div>

        </TabsContent>

      </Tabs>


      {/* RATING DIALOG */}

      <Dialog open={ratingDialogOpen} onOpenChange={setRatingDialogOpen}>

        <DialogContent>

          <DialogHeader>
            <DialogTitle>Rate the Food Quality</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">

            <div>

              <p className="text-sm mb-2">Rating</p>

          <div className="flex gap-2">

  {[1,2,3,4,5].map((star) => (
    <Star
      key={star}
      size={30}
      onClick={() => setRating(star)}
      className={`cursor-pointer transition ${
        star <= rating
          ? "fill-yellow-400 text-yellow-400"
          : "text-gray-300"
      }`}
    />
  ))}

</div>

            </div>

            <div>

              <p className="text-sm mb-2">Comment</p>

              <Textarea
                placeholder="Share feedback about food quality..."
                value={comment}
                onChange={(e)=>setComment(e.target.value)}
              />

            </div>

          </div>

          <DialogFooter>

            <Button
              variant="outline"
              onClick={()=>setRatingDialogOpen(false)}
            >
              Cancel
            </Button>

            <Button
              onClick={submitRating}
              className="bg-teal-600 hover:bg-teal-700"
            >
              Submit & Complete
            </Button>

          </DialogFooter>

        </DialogContent>

      </Dialog>

    </div>
  );
}