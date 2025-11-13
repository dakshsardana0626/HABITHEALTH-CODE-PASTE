import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { 
  Store, Star, Clock, Award, Search, 
  MessageCircle, User, Calendar
} from 'lucide-react';
import { cn } from '@/lib/utils';

export default function Marketplace() {
  const [user, setUser] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSpecialization, setSelectedSpecialization] = useState('all');

  useEffect(() => {
    const loadUser = async () => {
      const currentUser = await base44.auth.me();
      setUser(currentUser);
    };
    loadUser();
  }, []);

  const { data: coaches = [] } = useQuery({
    queryKey: ['coaches'],
    queryFn: async () => {
      const results = await base44.entities.Coach.list('-rating');
      return results || [];
    },
  });

  const specializations = [
    'all',
    'Nutrition',
    'Strength Training',
    'Weight Loss',
    'Yoga',
    'CrossFit',
    'Running',
    'Bodybuilding'
  ];

  const filteredCoaches = coaches.filter(coach => {
    const matchesSearch = coach.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         coach.bio?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSpec = selectedSpecialization === 'all' || 
                       coach.specialization?.includes(selectedSpecialization);
    return matchesSearch && matchesSpec;
  });

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-800 mb-2">Coach Marketplace</h1>
          <p className="text-slate-600">Find certified coaches for personalized guidance</p>
        </div>
        <Store className="w-8 h-8 text-emerald-600" />
      </div>

      {/* Search and Filters */}
      <Card className="p-6 bg-white border-none shadow-lg">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search coaches by name or expertise..."
              className="pl-10"
            />
          </div>
          <div className="flex gap-2 overflow-x-auto pb-2">
            {specializations.map(spec => (
              <Button
                key={spec}
                variant={selectedSpecialization === spec ? 'default' : 'outline'}
                onClick={() => setSelectedSpecialization(spec)}
                className="whitespace-nowrap"
              >
                {spec === 'all' ? 'All' : spec}
              </Button>
            ))}
          </div>
        </div>
      </Card>

      {/* Featured Banner */}
      <Card className="p-8 bg-gradient-to-br from-purple-500 to-pink-500 text-white border-none shadow-xl overflow-hidden relative">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-3">
            <Award className="w-6 h-6" />
            <Badge className="bg-white/20 text-white border-white/30">Premium Feature</Badge>
          </div>
          <h2 className="text-2xl font-bold mb-3">AI + Human Coaching</h2>
          <p className="text-purple-100 mb-4 max-w-2xl">
            Get the best of both worlds! Our AI Trainer works seamlessly with certified human coaches to provide 
            you with 24/7 support and expert guidance when you need it most.
          </p>
          <div className="flex gap-4">
            <div className="bg-white/20 backdrop-blur-sm px-4 py-2 rounded-xl">
              <p className="text-sm text-purple-100">Real-time sync</p>
              <p className="text-white font-semibold">AI shares your data with coach</p>
            </div>
            <div className="bg-white/20 backdrop-blur-sm px-4 py-2 rounded-xl">
              <p className="text-sm text-purple-100">Hybrid support</p>
              <p className="text-white font-semibold">Best of automation + human touch</p>
            </div>
          </div>
        </div>
      </Card>

      {/* Coaches Grid */}
      {filteredCoaches.length > 0 ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCoaches.map((coach) => (
            <Card key={coach.id} className="overflow-hidden bg-white border-none shadow-lg hover:shadow-xl transition-all">
              <div className="h-32 bg-gradient-to-br from-emerald-400 to-teal-500 relative">
                {coach.profile_photo_url ? (
                  <img 
                    src={coach.profile_photo_url} 
                    alt={coach.full_name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <User className="w-16 h-16 text-white/50" />
                  </div>
                )}
                <div className="absolute -bottom-12 left-6">
                  <div className="w-24 h-24 rounded-2xl bg-white shadow-xl flex items-center justify-center text-3xl font-bold text-emerald-600">
                    {coach.full_name?.[0]}
                  </div>
                </div>
              </div>

              <div className="p-6 pt-16">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="text-xl font-bold text-slate-800 mb-1">
                      {coach.full_name}
                    </h3>
                    {coach.rating && (
                      <div className="flex items-center gap-1">
                        <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                        <span className="font-semibold text-slate-700">{coach.rating.toFixed(1)}</span>
                        <span className="text-sm text-slate-500">
                          ({coach.total_clients || 0} clients)
                        </span>
                      </div>
                    )}
                  </div>
                  <Badge 
                    className={cn(
                      coach.availability === 'available' ? 'bg-green-100 text-green-700' :
                      coach.availability === 'limited' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-red-100 text-red-700'
                    )}
                  >
                    {coach.availability}
                  </Badge>
                </div>

                <div className="flex flex-wrap gap-2 mb-4">
                  {coach.specialization?.slice(0, 3).map((spec, idx) => (
                    <Badge key={idx} variant="secondary" className="text-xs">
                      {spec}
                    </Badge>
                  ))}
                </div>

                <p className="text-sm text-slate-600 mb-4 line-clamp-3">
                  {coach.bio}
                </p>

                <div className="space-y-2 mb-4 text-sm text-slate-600">
                  {coach.years_experience && (
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-slate-400" />
                      <span>{coach.years_experience} years experience</span>
                    </div>
                  )}
                  {coach.certifications && coach.certifications.length > 0 && (
                    <div className="flex items-center gap-2">
                      <Award className="w-4 h-4 text-slate-400" />
                      <span>{coach.certifications.length} certifications</span>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between pt-4 border-t">
                  <div>
                    <p className="text-xs text-slate-500">From</p>
                    <p className="text-lg font-bold text-emerald-600">
                      ${coach.hourly_rate}/hr
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      className="border-emerald-600 text-emerald-600 hover:bg-emerald-50"
                    >
                      View Profile
                    </Button>
                    <Button 
                      size="sm"
                      className="bg-emerald-600 hover:bg-emerald-700"
                      disabled={coach.availability === 'fully_booked'}
                    >
                      <MessageCircle className="w-4 h-4 mr-1" />
                      Contact
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="p-12 text-center bg-white/80 backdrop-blur-sm border-none shadow-xl">
          <Store className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-slate-600 mb-2">
            {searchTerm || selectedSpecialization !== 'all' 
              ? 'No coaches found' 
              : 'Coming Soon'}
          </h3>
          <p className="text-slate-500">
            {searchTerm || selectedSpecialization !== 'all'
              ? 'Try adjusting your search or filters'
              : 'Our marketplace of certified coaches will be available soon'}
          </p>
        </Card>
      )}

      {/* How It Works */}
      <Card className="p-6 bg-slate-50 border-none">
        <h3 className="text-lg font-bold text-slate-800 mb-4">How It Works</h3>
        <div className="grid md:grid-cols-3 gap-6">
          <div className="flex gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center flex-shrink-0">
              <span className="font-bold text-emerald-600">1</span>
            </div>
            <div>
              <h4 className="font-semibold text-slate-800 mb-1">Browse & Select</h4>
              <p className="text-sm text-slate-600">
                Find a certified coach that matches your goals and preferences
              </p>
            </div>
          </div>
          <div className="flex gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center flex-shrink-0">
              <span className="font-bold text-emerald-600">2</span>
            </div>
            <div>
              <h4 className="font-semibold text-slate-800 mb-1">Schedule & Connect</h4>
              <p className="text-sm text-slate-600">
                Book sessions and communicate directly through the app
              </p>
            </div>
          </div>
          <div className="flex gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center flex-shrink-0">
              <span className="font-bold text-emerald-600">3</span>
            </div>
            <div>
              <h4 className="font-semibold text-slate-800 mb-1">AI Integration</h4>
              <p className="text-sm text-slate-600">
                Your AI Trainer syncs all data with your human coach automatically
              </p>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}