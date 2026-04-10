import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, Package, Calendar, MessageSquare, 
  Heart, Bell, ChevronRight, LogOut
} from 'lucide-react';
import { Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarProvider, SidebarTrigger } from './ui/sidebar';
import { Donation, DonationRequest, Message } from '../App';
import { DashboardView } from './ngo/DashboardView';
import { AvailableDonationsView } from './ngo/AvailableDonationsView';
import { MyPickupsView } from './ngo/MyPickupsView';
import { DonationRequestsView } from './ngo/DonationRequestsView';
import { MessagesView } from './ngo/MessagesView';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { getCurrentUser } from '../lib/auth';

interface NGODashboardProps {
  donations: Donation[];
  updateDonation: (id: string, updates: Partial<Donation>) => void;
  donationRequests: DonationRequest[];
  addDonationRequest: (request: DonationRequest) => void;
  messages: Message[];
  addMessage: (message: Message) => void;
  onLogout: () => void;
}

type ViewType = 'dashboard' | 'available' | 'pickups' | 'requests' | 'messages';

export function NGODashboard({ 
  donations, 
  updateDonation,
  donationRequests,
  addDonationRequest,
  messages,
  addMessage,
  onLogout 
}: NGODashboardProps) {
  const navigate = useNavigate();
  const location = useLocation();

  // derive current view from URL (/ngo/<view>) so refresh preserves the selected page
  const pathParts = location.pathname.split('/').filter(Boolean);
  const initial = (pathParts.length >= 2 && pathParts[0] === 'ngo') ? (pathParts[1] as ViewType) : 'dashboard';
  const [currentView, setCurrentView] = useState<ViewType>((initial as ViewType) ?? 'dashboard');

  // log view changes to help debug accidental navigation/unmounts
  useEffect(() => {
    console.debug('NGODashboard currentView ->', currentView);
  }, [currentView]);
  
  const user = getCurrentUser && typeof getCurrentUser === 'function' ? getCurrentUser() : null;
  const userId = user?.id?.toString() ?? '';
  const username = user?.username?.toString() ?? '';

  const unreadMessages = messages.filter(m => !m.read).length;
  const availableDonations = donations.filter(d => d.status === 'available');
  const myPickups = donations.filter(d => d.reservedBy === userId || d.reservedBy === username);

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'available', label: 'Available Donations', icon: Package, badge: availableDonations.length },
    { id: 'pickups', label: 'My Pickups', icon: Calendar, badge: myPickups.length },
    { id: 'requests', label: 'Donation Requests', icon: ChevronRight },
    { id: 'messages', label: 'Messages', icon: MessageSquare, badge: unreadMessages },
  ];

  const renderView = () => {
    switch (currentView) {
      case 'dashboard':
        return <DashboardView donations={donations} messages={messages} />;
      case 'available':
        return <AvailableDonationsView donations={availableDonations} updateDonation={updateDonation} />;
      case 'pickups':
        return <MyPickupsView updateDonation={updateDonation} />;
      case 'requests':
        return <DonationRequestsView />;
      case 'messages':
        return <MessagesView messages={messages} addMessage={addMessage} />;
      default:
        return <DashboardView donations={donations} messages={messages} />;
    }
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <Sidebar>
          <SidebarContent>
            <div className="p-4 border-b border-sidebar-border">
              <div className="flex items-center gap-2">
                <Heart className="h-8 w-8 text-teal-600" fill="currentColor" />
                <div>
                  <h2 className="text-lg text-sidebar-foreground">FoodShare</h2>
                  <p className="text-xs text-muted-foreground">Hope Foundation</p>
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
                          // update both local state and URL so it survives refresh
                          setCurrentView(item.id as ViewType);
                          navigate(`/ngo/${item.id}`);
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
                <h2 className="text-white hidden sm:block">NGO Dashboard</h2>
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