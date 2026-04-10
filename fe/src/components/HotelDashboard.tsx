import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, Plus, Package, ListChecks, MessageSquare, 
  Building2, Bell, LogOut
} from 'lucide-react';
import { Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarProvider, SidebarTrigger } from './ui/sidebar';
import { Donation, DonationRequest, Message } from '../App';
import { HotelDashboardView } from './hotel/HotelDashboardView';
import { MyDonationsView } from './hotel/MyDonationsView';
import { DonationRequestsListView } from './hotel/DonationRequestsListView';
import { HotelMessagesView } from './hotel/HotelMessagesView';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { DonationForm } from './DonationForm';

interface HotelDashboardProps {
  donations: Donation[];
  addDonation: (donation: Donation) => void;
  updateDonation: (id: string, updates: Partial<Donation>) => void;
  donationRequests: DonationRequest[];
  messages: Message[];
  addMessage: (message: Message) => void;
  onLogout: () => void;
}

type ViewType = 'dashboard' | 'donations' | 'requests' | 'messages';

export function HotelDashboard({ 
  donations, 
  addDonation,
  updateDonation,
  donationRequests,
  messages,
  addMessage,
  onLogout 
}: HotelDashboardProps) {
  const navigate = useNavigate();
  const location = useLocation();

  const pathParts = location.pathname.split('/').filter(Boolean);
  const initial = (pathParts.length >= 2 && pathParts[0] === 'hotel') ? (pathParts[1] as ViewType) : 'dashboard';
  const [currentView, setCurrentView] = useState<ViewType>((initial as ViewType) ?? 'dashboard');
  const [isFormOpen, setIsFormOpen] = useState(false);
  
  const unreadMessages = messages.filter(m => !m.read && m.to !== 'Hope Foundation').length;
  const openRequests = donationRequests.filter(r => r.status === 'open').length;

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'donations', label: 'My Donations', icon: Package, badge: donations.length },
    { id: 'requests', label: 'NGO Requests', icon: ListChecks, badge: openRequests },
    { id: 'messages', label: 'Messages', icon: MessageSquare, badge: unreadMessages },
  ];

  const handleFormSubmit = (donation: Donation) => {
    addDonation(donation);
    setIsFormOpen(false);
  };

  const renderView = () => {
    switch (currentView) {
      case 'dashboard':
        return <HotelDashboardView donations={donations} messages={messages} requests={donationRequests} />;
      case 'donations':
        return <MyDonationsView donations={donations} updateDonation={updateDonation} />;
      case 'requests':
        return <DonationRequestsListView requests={donationRequests} />;
      case 'messages':
        return <HotelMessagesView messages={messages} addMessage={addMessage} />;
      default:
        return <HotelDashboardView donations={donations} messages={messages} requests={donationRequests} />;
    }
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <Sidebar>
          <SidebarContent>
            <div className="p-4 border-b border-sidebar-border">
              <div className="flex items-center gap-2">
                <Building2 className="h-8 w-8 text-teal-600" />
                <div>
                  <h2 className="text-lg text-sidebar-foreground">FoodShare</h2>
                  <p className="text-xs text-muted-foreground">Grand Plaza Hotel</p>
                </div>
              </div>
            </div>

            <SidebarGroup>
              <SidebarGroupLabel>Main Menu</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {menuItems.map((item) => (
                    <SidebarMenuItem key={item.id}>
                      <SidebarMenuButton 
                        onClick={() => {
                          setCurrentView(item.id as ViewType);
                          navigate(`/hotel/${item.id}`);
                        }}
                        isActive={currentView === item.id}
                        className="w-full"
                      >
                        <item.icon className="h-4 w-4" />
                        <span className="flex-1">{item.label}</span>
                        {item.badge !== undefined && item.badge > 0 && (
                          <Badge className="bg-orange-600 text-white">{item.badge}</Badge>
                        )}
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>

            <div className="mt-auto p-4 border-t border-sidebar-border">
              <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
                <DialogTrigger asChild>
                  <Button className="w-full bg-teal-600 hover:bg-teal-700 mb-2">
                    <Plus className="mr-2 h-4 w-4" />
                    New Donation
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Create New Donation</DialogTitle>
                  </DialogHeader>
                  <DonationForm onSubmit={handleFormSubmit} onCancel={() => setIsFormOpen(false)} />
                </DialogContent>
              </Dialog>
              <Button 
                variant="outline" 
                className="w-full" 
                onClick={onLogout}
              >
                <LogOut className="mr-2 h-4 w-4" />
                Logout
              </Button>
            </div>
          </SidebarContent>
        </Sidebar>

        <div className="flex-1 flex flex-col">
          <header className="border-b bg-gradient-to-r from-teal-600 to-teal-700 sticky top-0 z-40 shadow-md">
            <div className="flex items-center gap-4 px-4 py-3">
              <SidebarTrigger className="text-white hover:bg-teal-500/30" />
              <div className="flex-1">
                <h2 className="text-white hidden sm:block">Hotel Dashboard</h2>
              </div>
              <Button variant="ghost" size="icon" className="relative text-white hover:bg-teal-500/30">
                <Bell className="h-5 w-5" />
                {unreadMessages > 0 && (
                  <span className="absolute top-0 right-0 h-2 w-2 bg-orange-500 rounded-full ring-2 ring-white" />
                )}
              </Button>
            </div>
          </header>

          <main className="flex-1 bg-gray-50 overflow-auto">
            {renderView()}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}