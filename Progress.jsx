import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { 
  TrendingUp, TrendingDown, Award, Calendar, 
  Flame, Target, Scale, Activity
} from 'lucide-react';
import { format, subDays } from 'date-fns';
import { cn } from '@/lib/utils';

export default function Progress() {
  const [user, setUser] = useState(null);
  const [timeRange, setTimeRange] = useState(30); // days

  useEffect(() => {
    const loadUser = async () => {
      const currentUser = await base44.auth.me();
      setUser(currentUser);
    };
    loadUser();
  }, []);

  const { data: profile } = useQuery({
    queryKey: ['userProfile', user?.email],
    queryFn: async () => {
      const profiles = await base44.entities.UserProfile.filter({ created_by: user.email });
      return profiles[0] || null;
    },
    enabled: !!user,
  });

  const { data: dailyProgress = [] } = useQuery({
    queryKey: ['dailyProgress', user?.email, timeRange],
    queryFn: async () => {
      const progress = await base44.entities.DailyProgress.filter({
        created_by: user.email
      }, '-date', timeRange);
      return progress || [];
    },
    enabled: !!user,
  });

  const { data: milestones = [] } = useQuery({
    queryKey: ['allMilestones', user?.email],
    queryFn: async () => {
      const achievements = await base44.entities.Milestone.filter({
        created_by: user.email
      }, '-achieved_date');
      return achievements || [];
    },
    enabled: !!user,
  });

  // Calculate stats
  const weightData = dailyProgress
    .filter(p => p.weight_kg)
    .sort((a, b) => new Date(a.date) - new Date(b.date))
    .map(p => ({
      date: format(new Date(p.date), 'MMM d'),
      weight: p.weight_kg
    }));

  const calorieData = dailyProgress
    .sort((a, b) => new Date(a.date) - new Date(b.date))
    .map(p => ({
      date: format(new Date(p.date), 'MMM d'),
      consumed: p.calories_consumed || 0,
      target: profile?.daily_calorie_target || 2000
    }));

  const averageCalories = dailyProgress.length > 0 
    ? dailyProgress.reduce((sum, p) => sum + (p.calories_consumed || 0), 0) / dailyProgress.length
    : 0;

  const workoutsCompleted = dailyProgress.filter(p => p.workout_completed).length;
  const workoutCompletionRate = dailyProgress.length > 0 
    ? (workoutsCompleted / dailyProgress.length) * 100 
    : 0;

  const startWeight = weightData.length > 0 ? weightData[0].weight : profile?.current_weight_kg;
  const currentWeight = weightData.length > 0 ? weightData[weightData.length - 1].weight : profile?.current_weight_kg;
  const weightChange = startWeight && currentWeight ? currentWeight - startWeight : 0;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-800 mb-2">Progress & Analytics</h1>
        <p className="text-slate-600">Track your health journey over time</p>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-6 bg-white border-none shadow-lg">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-slate-500 font-medium">Current Streak</p>
              <p className="text-3xl font-bold text-slate-800 mt-2">{profile?.current_streak || 0}</p>
              <p className="text-xs text-slate-500 mt-1">days</p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center">
              <Flame className="w-6 h-6 text-white" />
            </div>
          </div>
        </Card>

        <Card className="p-6 bg-white border-none shadow-lg">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-slate-500 font-medium">Total Points</p>
              <p className="text-3xl font-bold text-slate-800 mt-2">{profile?.total_points || 0}</p>
              <p className="text-xs text-slate-500 mt-1">earned</p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500 to-yellow-500 flex items-center justify-center">
              <Award className="w-6 h-6 text-white" />
            </div>
          </div>
        </Card>

        <Card className="p-6 bg-white border-none shadow-lg">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-slate-500 font-medium">Weight Change</p>
              <div className="flex items-baseline gap-2 mt-2">
                <p className="text-3xl font-bold text-slate-800">
                  {Math.abs(weightChange).toFixed(1)}
                </p>
                <p className="text-sm text-slate-500">kg</p>
              </div>
              <div className="flex items-center gap-1 mt-1">
                {weightChange < 0 ? (
                  <>
                    <TrendingDown className="w-3 h-3 text-green-600" />
                    <p className="text-xs text-green-600">Lost</p>
                  </>
                ) : weightChange > 0 ? (
                  <>
                    <TrendingUp className="w-3 h-3 text-blue-600" />
                    <p className="text-xs text-blue-600">Gained</p>
                  </>
                ) : (
                  <p className="text-xs text-slate-500">No change</p>
                )}
              </div>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center">
              <Scale className="w-6 h-6 text-white" />
            </div>
          </div>
        </Card>

        <Card className="p-6 bg-white border-none shadow-lg">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-slate-500 font-medium">Workouts</p>
              <p className="text-3xl font-bold text-slate-800 mt-2">{workoutsCompleted}</p>
              <p className="text-xs text-slate-500 mt-1">
                {workoutCompletionRate.toFixed(0)}% completion rate
              </p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
              <Activity className="w-6 h-6 text-white" />
            </div>
          </div>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Weight Trend */}
        {weightData.length > 0 && (
          <Card className="p-6 bg-white border-none shadow-lg">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-bold text-slate-800">Weight Trend</h3>
                <p className="text-sm text-slate-500">Last {timeRange} days</p>
              </div>
              <Scale className="w-5 h-5 text-emerald-600" />
            </div>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={weightData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis 
                  dataKey="date" 
                  stroke="#64748b"
                  style={{ fontSize: '12px' }}
                />
                <YAxis 
                  stroke="#64748b"
                  style={{ fontSize: '12px' }}
                  domain={['dataMin - 2', 'dataMax + 2']}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'white',
                    border: 'none',
                    borderRadius: '12px',
                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                  }}
                />
                <Line 
                  type="monotone" 
                  dataKey="weight" 
                  stroke="#10b981" 
                  strokeWidth={3}
                  dot={{ fill: '#10b981', r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </Card>
        )}

        {/* Calorie Tracking */}
        {calorieData.length > 0 && (
          <Card className="p-6 bg-white border-none shadow-lg">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-bold text-slate-800">Calorie Intake</h3>
                <p className="text-sm text-slate-500">Avg: {Math.round(averageCalories)} cal/day</p>
              </div>
              <Flame className="w-5 h-5 text-orange-600" />
            </div>
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart data={calorieData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis 
                  dataKey="date" 
                  stroke="#64748b"
                  style={{ fontSize: '12px' }}
                />
                <YAxis 
                  stroke="#64748b"
                  style={{ fontSize: '12px' }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'white',
                    border: 'none',
                    borderRadius: '12px',
                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                  }}
                />
                <Area 
                  type="monotone" 
                  dataKey="consumed" 
                  stroke="#f97316" 
                  fill="#fed7aa"
                  strokeWidth={2}
                />
                <Line 
                  type="monotone" 
                  dataKey="target" 
                  stroke="#64748b" 
                  strokeDasharray="5 5"
                  strokeWidth={2}
                  dot={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </Card>
        )}
      </div>

      {/* Milestones */}
      {milestones.length > 0 && (
        <Card className="p-6 bg-white border-none shadow-lg">
          <div className="flex items-center gap-3 mb-6">
            <Award className="w-6 h-6 text-amber-500" />
            <h3 className="text-lg font-bold text-slate-800">Achievements</h3>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {milestones.map((milestone, idx) => (
              <div 
                key={idx}
                className="bg-gradient-to-br from-amber-50 to-yellow-50 p-4 rounded-2xl border border-amber-200"
              >
                <div className="flex items-start justify-between mb-3">
                  <Award className="w-8 h-8 text-amber-500" />
                  <Badge className="bg-amber-100 text-amber-700 border-amber-300">
                    +{milestone.points_earned} pts
                  </Badge>
                </div>
                <h4 className="font-bold text-amber-900 mb-1">{milestone.title}</h4>
                <p className="text-sm text-amber-700 mb-2">{milestone.description}</p>
                {milestone.achieved_date && (
                  <p className="text-xs text-amber-600">
                    {format(new Date(milestone.achieved_date), 'MMM d, yyyy')}
                  </p>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Goals Summary */}
      <Card className="p-6 bg-gradient-to-br from-emerald-500 to-teal-500 text-white border-none shadow-xl">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center flex-shrink-0">
            <Target className="w-6 h-6" />
          </div>
          <div className="flex-1">
            <h3 className="text-xl font-bold mb-2">Your Health Goals</h3>
            <div className="grid md:grid-cols-2 gap-4 mt-4">
              <div className="bg-white/10 backdrop-blur-sm p-4 rounded-xl">
                <p className="text-emerald-100 text-sm mb-1">Current Weight</p>
                <p className="text-2xl font-bold">{profile?.current_weight_kg} kg</p>
              </div>
              <div className="bg-white/10 backdrop-blur-sm p-4 rounded-xl">
                <p className="text-emerald-100 text-sm mb-1">Goal Weight</p>
                <p className="text-2xl font-bold">{profile?.goal_weight_kg} kg</p>
              </div>
              <div className="bg-white/10 backdrop-blur-sm p-4 rounded-xl">
                <p className="text-emerald-100 text-sm mb-1">Primary Goal</p>
                <p className="text-lg font-semibold capitalize">
                  {profile?.primary_goal?.replace('_', ' ')}
                </p>
              </div>
              <div className="bg-white/10 backdrop-blur-sm p-4 rounded-xl">
                <p className="text-emerald-100 text-sm mb-1">Activity Level</p>
                <p className="text-lg font-semibold capitalize">
                  {profile?.activity_level?.replace('_', ' ')}
                </p>
              </div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}