import { Users, UserPlus, Mail, Phone, Clock, Award, Activity } from 'lucide-react';
import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Avatar, AvatarFallback } from '../ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { Label } from '../ui/label';
import { Input } from '../ui/input';
import { Volunteer } from '../../App';
import { toast } from 'sonner@2.0.3';
import { ContactDialog } from '../ContactDialog';

interface VolunteersViewProps {
  volunteers: Volunteer[];
  addVolunteer: (volunteer: Volunteer) => void;
  updateVolunteer: (id: string, updates: Partial<Volunteer>) => void;
}

export function VolunteersView({ volunteers, addVolunteer, updateVolunteer }: VolunteersViewProps) {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    availability: ''
  });

  const activeVolunteers = volunteers.filter(v => v.status === 'active');
  const inactiveVolunteers = volunteers.filter(v => v.status === 'inactive');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name || !formData.phone || !formData.email || !formData.availability) {
      toast.error('Please fill in all required fields');
      return;
    }

    const newVolunteer: Volunteer = {
      id: Date.now().toString(),
      name: formData.name,
      phone: formData.phone,
      email: formData.email,
      availability: formData.availability,
      tasksCompleted: 0,
      status: 'active'
    };

    addVolunteer(newVolunteer);
    toast.success('Volunteer added successfully!');
    setIsFormOpen(false);
    setFormData({ name: '', phone: '', email: '', availability: '' });
  };

  const handleToggleStatus = (volunteer: Volunteer) => {
    const newStatus = volunteer.status === 'active' ? 'inactive' : 'active';
    updateVolunteer(volunteer.id, { status: newStatus });
    toast.success(`Volunteer marked as ${newStatus}`);
  };

  const renderVolunteerCard = (volunteer: Volunteer) => (
    <Card key={volunteer.id} className="hover:shadow-lg transition-shadow">
      <CardHeader>
        <div className="flex items-start gap-4">
          <Avatar className="h-12 w-12">
            <AvatarFallback className="bg-teal-600 text-white">
              {volunteer.name.split(' ').map(n => n[0]).join('')}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <CardTitle className="text-lg">{volunteer.name}</CardTitle>
            <CardDescription>
              <div className="flex items-center gap-2 mt-1">
                <Badge className={volunteer.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>
                  {volunteer.status}
                </Badge>
                <div className="flex items-center gap-1 text-yellow-600">
                  <Award className="h-3 w-3" />
                  <span className="text-xs">{volunteer.tasksCompleted} tasks</span>
                </div>
              </div>
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-2 text-gray-600">
            <Phone className="h-4 w-4" />
            <span>{volunteer.phone}</span>
          </div>
          <div className="flex items-center gap-2 text-gray-600">
            <Mail className="h-4 w-4" />
            <span>{volunteer.email}</span>
          </div>
          <div className="flex items-center gap-2 text-gray-600">
            <Clock className="h-4 w-4" />
            <span>{volunteer.availability}</span>
          </div>
        </div>

        <div className="flex gap-2 pt-2">
          <Button 
            variant="outline" 
            size="sm" 
            className="flex-1"
            onClick={() => handleToggleStatus(volunteer)}
          >
            Mark as {volunteer.status === 'active' ? 'Inactive' : 'Active'}
          </Button>
          <ContactDialog
            contactName={volunteer.name}
            contactEmail={volunteer.email}
            contactPhone={volunteer.phone}
            trigger={
              <Button 
                variant="outline" 
                size="sm" 
                className="flex-1"
              >
                <Mail className="h-4 w-4 mr-1" />
                Contact
              </Button>
            }
          />
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1>Volunteers</h1>
          <p className="text-muted-foreground">Manage your volunteer team</p>
        </div>
        <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
          <DialogTrigger asChild>
            <Button className="bg-teal-600 hover:bg-teal-700">
              <UserPlus className="mr-2 h-4 w-4" />
              Add Volunteer
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Volunteer</DialogTitle>
              <DialogDescription>
                Register a new volunteer to your team
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name *</Label>
                <Input
                  id="name"
                  placeholder="John Doe"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number *</Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="+1-555-0123"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email Address *</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="john@example.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="availability">Availability *</Label>
                <Input
                  id="availability"
                  placeholder="E.g., Mon-Fri, 6PM-9PM"
                  value={formData.availability}
                  onChange={(e) => setFormData({ ...formData, availability: e.target.value })}
                  required
                />
              </div>

              <div className="flex gap-3 pt-4">
                <Button type="button" variant="outline" onClick={() => setIsFormOpen(false)} className="flex-1">
                  Cancel
                </Button>
                <Button type="submit" className="flex-1 bg-teal-600 hover:bg-teal-700">
                  Add Volunteer
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Total Volunteers</CardDescription>
            <CardTitle className="text-3xl">{volunteers.length}</CardTitle>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Active Volunteers</CardDescription>
            <CardTitle className="text-3xl text-green-600">{activeVolunteers.length}</CardTitle>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Total Tasks Completed</CardDescription>
            <CardTitle className="text-3xl text-teal-600">
              {volunteers.reduce((acc, v) => acc + v.tasksCompleted, 0)}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Volunteers List */}
      <Tabs defaultValue="active">
        <TabsList>
          <TabsTrigger value="active">Active ({activeVolunteers.length})</TabsTrigger>
          <TabsTrigger value="inactive">Inactive ({inactiveVolunteers.length})</TabsTrigger>
          <TabsTrigger value="all">All ({volunteers.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="space-y-4">
          {activeVolunteers.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-gray-500">
                <p>No active volunteers</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {activeVolunteers.map(renderVolunteerCard)}
            </div>
          )}
        </TabsContent>

        <TabsContent value="inactive" className="space-y-4">
          {inactiveVolunteers.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-gray-500">
                <p>No inactive volunteers</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {inactiveVolunteers.map(renderVolunteerCard)}
            </div>
          )}
        </TabsContent>

        <TabsContent value="all" className="space-y-4">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {volunteers.map(renderVolunteerCard)}
          </div>
        </TabsContent>
      </Tabs>

      {/* Top Performers */}
      {activeVolunteers.length > 0 && (
        <Card className="bg-gradient-to-r from-teal-50 to-orange-50 border-teal-200">
          <CardHeader>
            <CardTitle>🌟 Top Performers This Month</CardTitle>
            <CardDescription>Recognizing our most dedicated volunteers</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-3 gap-4">
              {volunteers
                .sort((a, b) => b.tasksCompleted - a.tasksCompleted)
                .slice(0, 3)
                .map((volunteer, index) => (
                  <div key={volunteer.id} className="p-4 bg-white rounded-lg border-2 border-teal-200">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="text-2xl">
                        {index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉'}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium">{volunteer.name}</p>
                        <p className="text-sm text-gray-600">{volunteer.tasksCompleted} tasks completed</p>
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}