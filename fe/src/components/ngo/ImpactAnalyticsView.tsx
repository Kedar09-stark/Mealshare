import { TrendingUp, Users, Package, Leaf, Heart, Award } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Progress } from '../ui/progress';
import { Donation } from '../../App';

interface ImpactAnalyticsViewProps {
  donations: Donation[];
}

export function ImpactAnalyticsView({ donations }: ImpactAnalyticsViewProps) {
  const completed = donations.filter(d => d.status === 'completed' && d.reservedBy === 'Hope Foundation');
  const totalMealsServed = completed.length * 75;
  const peopleHelped = Math.floor(totalMealsServed / 2);
  const foodSaved = completed.reduce((acc, d) => acc + parseFloat(d.quantity.replace(/[^\d.]/g, '') || '0'), 0);
  
  // Environmental impact - average 2.5kg CO2 per kg of food waste avoided
  const co2Saved = Math.round(foodSaved * 2.5);
  
  // Category breakdown
  const categoryStats = donations.reduce((acc: any, d) => {
    if (d.reservedBy === 'Hope Foundation') {
      acc[d.category] = (acc[d.category] || 0) + 1;
    }
    return acc;
  }, {});

  const monthlyData = [
    { month: 'Jan', meals: 3200, people: 1600 },
    { month: 'Feb', meals: 3800, people: 1900 },
    { month: 'Mar', meals: 4200, people: 2100 },
    { month: 'Apr', meals: 3900, people: 1950 },
    { month: 'May', meals: 4500, people: 2250 },
    { month: 'Jun', meals: 4800, people: 2400 },
  ];

  const qualityAverage = Math.round(
    donations.reduce((acc, d) => acc + d.qualityScore, 0) / donations.length
  );

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      <div>
        <h1>Impact & Analytics</h1>
        <p className="text-muted-foreground">Track your social impact and donation trends</p>
      </div>

      {/* Key Impact Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-teal-500 to-teal-600 text-white border-0">
          <CardHeader className="pb-3">
            <CardDescription className="text-teal-100">Total Meals Served</CardDescription>
            <CardTitle className="text-4xl">{totalMealsServed.toLocaleString()}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 text-teal-100">
              <TrendingUp className="h-4 w-4" />
              <span className="text-sm">+15% from last month</span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-500 to-orange-600 text-white border-0">
          <CardHeader className="pb-3">
            <CardDescription className="text-orange-100">People Helped</CardDescription>
            <CardTitle className="text-4xl">{peopleHelped.toLocaleString()}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 text-orange-100">
              <Users className="h-4 w-4" />
              <span className="text-sm">Across 12 locations</span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white border-0">
          <CardHeader className="pb-3">
            <CardDescription className="text-green-100">Food Saved</CardDescription>
            <CardTitle className="text-4xl">{foodSaved.toFixed(0)} kg</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 text-green-100">
              <Leaf className="h-4 w-4" />
              <span className="text-sm">{co2Saved} kg CO₂ avoided</span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white border-0">
          <CardHeader className="pb-3">
            <CardDescription className="text-purple-100">Donations Completed</CardDescription>
            <CardTitle className="text-4xl">{completed.length}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 text-purple-100">
              <Package className="h-4 w-4" />
              <span className="text-sm">From {new Set(completed.map(d => d.hotelName)).size} hotels</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Monthly Trend */}
      <Card>
        <CardHeader>
          <CardTitle>Monthly Impact Trend</CardTitle>
          <CardDescription>Your impact over the past 6 months</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {monthlyData.map((data, index) => (
              <div key={data.month} className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="font-medium">{data.month} 2025</span>
                  <span className="text-muted-foreground">{data.meals.toLocaleString()} meals • {data.people.toLocaleString()} people</span>
                </div>
                <Progress value={(data.meals / 5000) * 100} className="h-2" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Category Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle>Food Category Distribution</CardTitle>
            <CardDescription>Types of food donations received</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {Object.entries(categoryStats).map(([category, count]: [string, any]) => {
              const percentage = (count / Object.values(categoryStats).reduce((a: any, b: any) => a + b, 0) as number) * 100;
              return (
                <div key={category} className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="font-medium">{category}</span>
                    <span className="text-muted-foreground">{count} donations ({percentage.toFixed(0)}%)</span>
                  </div>
                  <Progress value={percentage} className="h-2" />
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* Quality & Achievements */}
        <Card>
          <CardHeader>
            <CardTitle>Quality & Achievements</CardTitle>
            <CardDescription>Your performance metrics</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-center gap-3">
                <Award className="h-8 w-8 text-yellow-600" />
                <div>
                  <p className="font-medium text-yellow-900">Quality Champion</p>
                  <p className="text-sm text-yellow-700">Average quality score: {qualityAverage}%</p>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-teal-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-teal-600 rounded-full flex items-center justify-center text-white">
                    <Heart className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-medium">Top Contributor</p>
                    <p className="text-sm text-gray-600">Most donations this month</p>
                  </div>
                </div>
                <span className="text-2xl">🏆</span>
              </div>

              <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-green-600 rounded-full flex items-center justify-center text-white">
                    <Leaf className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-medium">Eco Warrior</p>
                    <p className="text-sm text-gray-600">Reduced waste by 500+ kg</p>
                  </div>
                </div>
                <span className="text-2xl">🌱</span>
              </div>

              <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-purple-600 rounded-full flex items-center justify-center text-white">
                    <Users className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-medium">Community Hero</p>
                    <p className="text-sm text-gray-600">Served 2000+ people</p>
                  </div>
                </div>
                <span className="text-2xl">⭐</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Environmental Impact */}
      <Card className="bg-gradient-to-r from-green-50 to-teal-50 border-green-200">
        <CardHeader>
          <CardTitle className="text-green-900">Environmental Impact</CardTitle>
          <CardDescription className="text-green-700">Your contribution to sustainability</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="text-center">
              <Leaf className="h-12 w-12 text-green-600 mx-auto mb-2" />
              <p className="text-3xl text-green-900">{co2Saved} kg</p>
              <p className="text-sm text-green-700">CO₂ Emissions Avoided</p>
            </div>
            <div className="text-center">
              <Package className="h-12 w-12 text-teal-600 mx-auto mb-2" />
              <p className="text-3xl text-teal-900">{foodSaved.toFixed(0)} kg</p>
              <p className="text-sm text-teal-700">Food Waste Prevented</p>
            </div>
            <div className="text-center">
              <TrendingUp className="h-12 w-12 text-green-600 mx-auto mb-2" />
              <p className="text-3xl text-green-900">98%</p>
              <p className="text-sm text-green-700">Diversion Rate</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}