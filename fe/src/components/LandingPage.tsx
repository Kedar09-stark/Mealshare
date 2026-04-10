import { Building2, Heart, MapPin, Award, Users, TrendingUp } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { UserRole } from '../App';
import { ImageWithFallback } from './figma/ImageWithFallback';

interface LandingPageProps {
  onSelectRole: (role: UserRole) => void;
  onOpenAuth?: (action: 'login' | 'register', role: UserRole) => void;
}

export function LandingPage({ onSelectRole, onOpenAuth }: LandingPageProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 via-white to-orange-50">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Heart className="h-8 w-8 text-teal-600" fill="currentColor" />
            <span className="text-2xl text-teal-700">FoodShare</span>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenAuth ? onOpenAuth('login', 'hotel') : onSelectRole('hotel')} className="border-teal-600 text-teal-700 hover:bg-teal-50">
              Hotel Login
            </Button>
            <Button onClick={() => onOpenAuth ? onOpenAuth('login', 'ngo') : onSelectRole('ngo')} className="bg-teal-600 hover:bg-teal-700">
              NGO Login
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-16 text-center">
        <div className="max-w-3xl mx-auto space-y-6">
          <h1 className="text-5xl text-gray-900">
            Connect Hotels with NGOs to Fight Food Waste
          </h1>
          <p className="text-xl text-gray-600">
            A platform where hotel chains can donate excess quality food to NGOs, 
            ensuring no meal goes to waste while helping those in need.
          </p>
          <div className="flex gap-4 justify-center pt-4">
            <Button size="lg" onClick={() => onOpenAuth ? onOpenAuth('register', 'hotel') : onSelectRole('hotel')} className="bg-teal-600 hover:bg-teal-700">
              <Building2 className="mr-2 h-5 w-5" />
              I'm a Hotel Chain
            </Button>
            <Button size="lg" variant="outline" onClick={() => onOpenAuth ? onOpenAuth('register', 'ngo') : onSelectRole('ngo')} className="border-orange-600 text-orange-700 hover:bg-orange-50">
              <Heart className="mr-2 h-5 w-5" />
              I'm an NGO
            </Button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="container mx-auto px-4 py-16">
        <div className="grid md:grid-cols-3 gap-6">
          <Card className="border-2 hover:border-teal-500 transition-all hover:shadow-lg">
            <CardHeader>
              <MapPin className="h-12 w-12 text-teal-600 mb-2" />
              <CardTitle>Easy Location Tracking</CardTitle>
              <CardDescription>
                Precise pickup location selection ensures smooth coordination between hotels and NGOs
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="border-2 hover:border-orange-500 transition-all hover:shadow-lg">
            <CardHeader>
              <Award className="h-12 w-12 text-orange-600 mb-2" />
              <CardTitle>Quality Assurance</CardTitle>
              <CardDescription>
                Built-in quality scoring system ensures only safe, fresh food reaches those in need
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="border-2 hover:border-teal-500 transition-all hover:shadow-lg">
            <CardHeader>
              <Users className="h-12 w-12 text-teal-600 mb-2" />
              <CardTitle>Impact Tracking</CardTitle>
              <CardDescription>
                Track meals served, people helped, and environmental impact in real-time
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </section>

      {/* Stats Section */}
      <section className="container mx-auto px-4 py-16">
        <Card className="bg-gradient-to-r from-teal-600 to-orange-600 text-white border-0">
          <CardContent className="py-12">
            <div className="grid md:grid-cols-4 gap-8 text-center">
              <div>
                <div className="text-4xl mb-2">150+</div>
                <div className="text-teal-100">Hotels Registered</div>
              </div>
              <div>
                <div className="text-4xl mb-2">50K+</div>
                <div className="text-teal-100">Meals Donated</div>
              </div>
              <div>
                <div className="text-4xl mb-2">75+</div>
                <div className="text-teal-100">NGO Partners</div>
              </div>
              <div>
                <div className="text-4xl mb-2">25K+</div>
                <div className="text-teal-100">People Served</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* How it Works */}
      <section className="container mx-auto px-4 py-16">
        <h2 className="text-3xl text-center text-gray-900 mb-12">How It Works</h2>
        <div className="grid md:grid-cols-4 gap-6">
          <Card>
            <CardHeader>
              <div className="w-12 h-12 rounded-full bg-teal-100 flex items-center justify-center mb-4">
                <span className="text-xl text-teal-700">1</span>
              </div>
              <CardTitle>Hotels Donate</CardTitle>
              <CardDescription>
                Hotels list excess food with quality details and pickup location
              </CardDescription>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader>
              <div className="w-12 h-12 rounded-full bg-orange-100 flex items-center justify-center mb-4">
                <span className="text-xl text-orange-700">2</span>
              </div>
              <CardTitle>NGOs Browse</CardTitle>
              <CardDescription>
                NGOs view available donations and reserve what they need
              </CardDescription>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader>
              <div className="w-12 h-12 rounded-full bg-teal-100 flex items-center justify-center mb-4">
                <span className="text-xl text-teal-700">3</span>
              </div>
              <CardTitle>Schedule Pickup</CardTitle>
              <CardDescription>
                Coordinate pickup times and track in real-time
              </CardDescription>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader>
              <div className="w-12 h-12 rounded-full bg-orange-100 flex items-center justify-center mb-4">
                <span className="text-xl text-orange-700">4</span>
              </div>
              <CardTitle>Track Impact</CardTitle>
              <CardDescription>
                Monitor meals served and people helped
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t bg-gray-50 mt-16">
        <div className="container mx-auto px-4 py-8 text-center text-gray-600">
          <p>© 2025 FoodShare. Fighting hunger, reducing waste, one meal at a time.</p>
        </div>
      </footer>
    </div>
  );
}
