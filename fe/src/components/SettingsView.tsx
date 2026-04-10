import { useState } from 'react';
import { User, MapPin, Bell, Shield, CreditCard, Mail, Phone, Building } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Label } from './ui/label';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Switch } from './ui/switch';
import { Separator } from './ui/separator';
import { Textarea } from './ui/textarea';
import { toast } from 'sonner@2.0.3';

interface SettingsViewProps {
  userType: 'hotel' | 'ngo';
}

export function SettingsView({ userType }: SettingsViewProps) {
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [smsNotifications, setSmsNotifications] = useState(false);
  const [donationAlerts, setDonationAlerts] = useState(true);
  const [weeklyReports, setWeeklyReports] = useState(true);

  const handleSave = () => {
    toast.success('Settings saved successfully!');
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto space-y-6">
      <div>
        <h1>Settings</h1>
        <p className="text-muted-foreground">Manage your account and preferences</p>
      </div>

      {/* Profile Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5 text-teal-600" />
            Profile Information
          </CardTitle>
          <CardDescription>Update your {userType === 'hotel' ? 'hotel' : 'organization'} profile</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="orgName">{userType === 'hotel' ? 'Hotel Name' : 'Organization Name'}</Label>
              <Input 
                id="orgName" 
                defaultValue={userType === 'hotel' ? 'Grand Plaza Hotel' : 'Hope Foundation'} 
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contactPerson">Contact Person</Label>
              <Input id="contactPerson" defaultValue="John Smith" />
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <div className="flex gap-2">
                <Mail className="h-4 w-4 text-muted-foreground mt-3" />
                <Input id="email" type="email" defaultValue="contact@example.com" className="flex-1" />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <div className="flex gap-2">
                <Phone className="h-4 w-4 text-muted-foreground mt-3" />
                <Input id="phone" type="tel" defaultValue="+1 555-0123" className="flex-1" />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">Address</Label>
            <div className="flex gap-2">
              <MapPin className="h-4 w-4 text-muted-foreground mt-3" />
              <Textarea 
                id="address" 
                defaultValue="123 Main Street, Downtown, City, State 12345"
                rows={2}
                className="flex-1"
              />
            </div>
          </div>

          {userType === 'hotel' && (
            <div className="space-y-2">
              <Label htmlFor="license">Business License Number</Label>
              <div className="flex gap-2">
                <Building className="h-4 w-4 text-muted-foreground mt-3" />
                <Input id="license" defaultValue="BL-2024-12345" className="flex-1" />
              </div>
            </div>
          )}

          {userType === 'ngo' && (
            <div className="space-y-2">
              <Label htmlFor="registration">NGO Registration Number</Label>
              <div className="flex gap-2">
                <Building className="h-4 w-4 text-muted-foreground mt-3" />
                <Input id="registration" defaultValue="NGO-2024-67890" className="flex-1" />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Notification Preferences */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-teal-600" />
            Notification Preferences
          </CardTitle>
          <CardDescription>Configure how you receive updates</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between py-2">
            <div className="space-y-0.5">
              <Label>Email Notifications</Label>
              <p className="text-sm text-muted-foreground">Receive updates via email</p>
            </div>
            <Switch checked={emailNotifications} onCheckedChange={setEmailNotifications} />
          </div>
          
          <Separator />
          
          <div className="flex items-center justify-between py-2">
            <div className="space-y-0.5">
              <Label>SMS Notifications</Label>
              <p className="text-sm text-muted-foreground">Get text message alerts</p>
            </div>
            <Switch checked={smsNotifications} onCheckedChange={setSmsNotifications} />
          </div>
          
          <Separator />
          
          <div className="flex items-center justify-between py-2">
            <div className="space-y-0.5">
              <Label>{userType === 'hotel' ? 'Pickup Alerts' : 'Donation Alerts'}</Label>
              <p className="text-sm text-muted-foreground">
                {userType === 'hotel' ? 'When NGOs reserve your donations' : 'When new donations become available'}
              </p>
            </div>
            <Switch checked={donationAlerts} onCheckedChange={setDonationAlerts} />
          </div>
          
          <Separator />
          
          <div className="flex items-center justify-between py-2">
            <div className="space-y-0.5">
              <Label>Weekly Reports</Label>
              <p className="text-sm text-muted-foreground">Receive weekly impact summaries</p>
            </div>
            <Switch checked={weeklyReports} onCheckedChange={setWeeklyReports} />
          </div>
        </CardContent>
      </Card>

      {/* Security */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-teal-600" />
            Security
          </CardTitle>
          <CardDescription>Manage your password and security settings</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="currentPassword">Current Password</Label>
            <Input id="currentPassword" type="password" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="newPassword">New Password</Label>
            <Input id="newPassword" type="password" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirm New Password</Label>
            <Input id="confirmPassword" type="password" />
          </div>
          <Button className="bg-teal-600 hover:bg-teal-700">Update Password</Button>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex flex-col sm:flex-row gap-3 justify-end">
        <Button variant="outline" className="order-2 sm:order-1">Cancel</Button>
        <Button onClick={handleSave} className="bg-teal-600 hover:bg-teal-700 order-1 sm:order-2">
          Save Changes
        </Button>
      </div>
    </div>
  );
}
