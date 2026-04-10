import { TrendingUp, Package, Heart, Award } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Progress } from '../ui/progress';
import { Donation } from '../../App';

interface HotelAnalyticsViewProps {
  donations: Donation[];
}

export function HotelAnalyticsView({ donations }: HotelAnalyticsViewProps) {
  const completed = donations.filter(d => d.status === 'completed');
  const totalMealsDonated = completed.length * 75;
  const peopleHelped = Math.floor(totalMealsDonated / 2);
  const wasteReduced = completed.reduce((acc, d) => acc + parseFloat(d.quantity.replace(/[^\d.]/g, '') || '0'), 0);
  const avgQuality = Math.round(donations.reduce((acc, d) => acc + d.qualityScore, 0) / donations.length);

  const categoryStats = donations.reduce((acc: any, d) => {
    acc[d.category] = (acc[d.category] || 0) + 1;
    return acc;
  }, {});

  const monthlyData = [
    { month: 'Jan', donations: 8 },
    { month: 'Feb', donations: 12 },
    { month: 'Mar', donations: 10 },
    { month: 'Apr', donations: 15 },
    { month: 'May', donations: 18 },
    { month: 'Jun', donations: 22 },
  ];

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1>Analytics & Impact</h1>
        <p className="text-muted-foreground">Track your hotel's contribution to fighting hunger</p>
      </div>

      {/* Key Metrics */}
      <div className="grid md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-teal-500 to-teal-600 text-white border-0">
          <CardHeader className="pb-3">
            <CardDescription className="text-teal-100">Total Donations</CardDescription>
            <CardTitle className="text-4xl">{donations.length}</CardTitle>
          </CardHeader>
          <CardContent>
            <Package className="h-8 w-8 opacity-80" />
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-500 to-orange-600 text-white border-0">
          <CardHeader className="pb-3">
            <CardDescription className="text-orange-100">Meals Donated</CardDescription>
            <CardTitle className="text-4xl">{totalMealsDonated}</CardTitle>
          </CardHeader>
          <CardContent>
            <Heart className="h-8 w-8 opacity-80" />
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white border-0">
          <CardHeader className="pb-3">
            <CardDescription className="text-purple-100">People Helped</CardDescription>
            <CardTitle className="text-4xl">{peopleHelped}</CardTitle>
          </CardHeader>
          <CardContent>
            <TrendingUp className="h-8 w-8 opacity-80" />
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white border-0">
          <CardHeader className="pb-3">
            <CardDescription className="text-green-100">Waste Reduced</CardDescription>
            <CardTitle className="text-3xl">{wasteReduced.toFixed(0)} kg</CardTitle>
          </CardHeader>
          <CardContent>
            <Award className="h-8 w-8 opacity-80" />
          </CardContent>
        </Card>
      </div>

      {/* Monthly Trend */}
      <Card>
        <CardHeader>
          <CardTitle>Monthly Donation Trend</CardTitle>
          <CardDescription>Your donation activity over the past 6 months</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {monthlyData.map((data) => (
              <div key={data.month} className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="font-medium">{data.month} 2025</span>
                  <span className="text-muted-foreground">{data.donations} donations</span>
                </div>
                <Progress value={(data.donations / 25) * 100} className="h-2" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Category Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Donation by Category</CardTitle>
            <CardDescription>Types of food you've donated</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {Object.entries(categoryStats).map(([category, count]: [string, any]) => {
              const percentage = (count / donations.length) * 100;
              return (
                <div key={category} className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="font-medium">{category}</span>
                    <span className="text-muted-foreground">{count} ({percentage.toFixed(0)}%)</span>
                  </div>
                  <Progress value={percentage} className="h-2" />
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* Recognition */}
        <Card>
          <CardHeader>
            <CardTitle>Recognition & Badges</CardTitle>
            <CardDescription>Your achievements</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-center gap-3">
                <Award className="h-8 w-8 text-yellow-600" />
                <div>
                  <p className="font-medium text-yellow-900">Quality Champion</p>
                  <p className="text-sm text-yellow-700">Avg quality: {avgQuality}%</p>
                </div>
              </div>
            </div>

            <div className="p-4 bg-teal-50 border border-teal-200 rounded-lg">
              <div className="flex items-center gap-3">
                <span className="text-3xl">🏆</span>
                <div>
                  <p className="font-medium text-teal-900">Top Donor</p>
                  <p className="text-sm text-teal-700">Most donations this quarter</p>
                </div>
              </div>
            </div>

            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center gap-3">
                <span className="text-3xl">🌱</span>
                <div>
                  <p className="font-medium text-green-900">Sustainability Hero</p>
                  <p className="text-sm text-green-700">Reduced {wasteReduced.toFixed(0)}kg waste</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
