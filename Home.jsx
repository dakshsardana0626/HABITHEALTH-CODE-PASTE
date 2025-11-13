import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { 
  Camera, Flame, Target, TrendingUp, Award, Sparkles,
  CalendarDays, Dumbbell, Apple, Zap, ChevronRight, Heart
} from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

export default function Home() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const loadUser = async () => {
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);
        
        const profiles = await base44.entities.UserProfile.filter({ created_by: currentUser.email });
        if (profiles.length === 0 || !profiles[0].onboarding_completed) {
          window.location.href = createPageUrl('Onboarding');
        }
      } catch (error) {
        console.error('Error loading user:', error);
      }
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

  const { data: todayProgress } = useQuery({
    queryKey: ['todayProgress', user?.email],
    queryFn: async () => {
      const today = format(new Date(), 'yyyy-MM-dd');
      const progress = await base44.entities.DailyProgress.filter({ 
        created_by: user.email,
        date: today
      });
      return progress[0] || null;
    },
    enabled: !!user,
  });

  const { data: todayMeals } = useQuery({
    queryKey: ['todayMeals', user?.email],
    queryFn: async () => {
      const today = format(new Date(), 'yyyy-MM-dd');
      const meals = await base44.entities.FoodLog.filter({ 
        created_by: user.email,
        meal_date: today
      });
      return meals || [];
    },
    enabled: !!user,
  });

  const { data: activeMealPlan } = useQuery({
    queryKey: ['activeMealPlan', user?.email],
    queryFn: async () => {
      const plans = await base44.entities.MealPlan.filter({ 
        created_by: user.email,
        is_active: true
      }, '-created_date', 1);
      return plans[0] || null;
    },
    enabled: !!user,
  });

  const { data: activeWorkout } = useQuery({
    queryKey: ['activeWorkout', user?.email],
    queryFn: async () => {
      const plans = await base44.entities.WorkoutPlan.filter({ 
        created_by: user.email,
        is_active: true
      }, '-created_date', 1);
      return plans[0] || null;
    },
    enabled: !!user,
  });

  const { data: recentMilestones } = useQuery({
    queryKey: ['recentMilestones', user?.email],
    queryFn: async () => {
      const milestones = await base44.entities.Milestone.filter({ 
        created_by: user.email
      }, '-achieved_date', 3);
      return milestones || [];
    },
    enabled: !!user,
  });

  if (!profile) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-pulse text-emerald-400">Loading your health dashboard...</div>
      </div>
    );
  }

  const caloriesConsumed = todayProgress?.calories_consumed || 0;
  const calorieTarget = profile.daily_calorie_target || 2000;
  const calorieProgress = (caloriesConsumed / calorieTarget) * 100;

  const proteinConsumed = todayProgress?.protein_consumed_g || 0;
  const proteinTarget = profile.protein_target_g || 150;

  const quickActions = [
    { label: 'Log Meal', icon: Camera, page: 'FoodLog', gradient: 'from-emerald-500 to-teal-500' },
    { label: 'Start Workout', icon: Dumbbell, page: 'Workouts', gradient: 'from-purple-500 to-pink-500' },
    { label: 'AI Coach', icon: Sparkles, page: 'AICoach', gradient: 'from-blue-500 to-cyan-500' },
    { label: 'View Progress', icon: TrendingUp, page: 'Progress', gradient: 'from-orange-500 to-amber-500' },
  ];

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Welcome Header */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-600 via-teal-600 to-emerald-700 p-8 shadow-2xl shadow-emerald-900/50 border border-emerald-500/20">
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-400/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-teal-400/10 rounded-full blur-3xl"></div>
        <div className="relative z-10">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-emerald-100 text-sm font-medium mb-2">Welcome back</p>
              <h2 className="text-3xl font-bold text-white mb-3">
                {user?.full_name?.split(' ')[0] || 'There'}! 👋
              </h2>
              <p className="text-emerald-100 text-lg mb-4">
                Day {profile.current_streak} of your health journey
              </p>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 bg-emerald-900/30 backdrop-blur-sm px-4 py-2 rounded-full border border-emerald-400/30">
                  <Flame className="w-4 h-4 text-orange-400" />
                  <span className="text-white font-medium">{profile.current_streak} day streak</span>
                </div>
                <div className="flex items-center gap-2 bg-emerald-900/30 backdrop-blur-sm px-4 py-2 rounded-full border border-emerald-400/30">
                  <Award className="w-4 h-4 text-yellow-400" />
                  <span className="text-white font-medium">{profile.total_points} points</span>
                </div>
              </div>
            </div>
            <div className="bg-emerald-900/30 backdrop-blur-sm p-6 rounded-2xl border border-emerald-400/30">
              <Target className="w-12 h-12 text-emerald-300" />
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {quickActions.map((action) => {
          const Icon = action.icon;
          return (
            <Link key={action.page} to={createPageUrl(action.page)}>
              <Card className="p-6 hover:shadow-xl transition-all duration-300 cursor-pointer group border-slate-800/50 bg-slate-900/50 backdrop-blur-sm hover:bg-slate-800/50">
                <div className="flex flex-col items-center gap-3">
                  <div className={cn(
                    "w-14 h-14 rounded-2xl bg-gradient-to-br flex items-center justify-center",
                    "shadow-lg group-hover:scale-110 transition-transform duration-300",
                    action.gradient
                  )}>
                    <Icon className="w-7 h-7 text-white" />
                  </div>
                  <span className="font-semibold text-slate-200 text-center">{action.label}</span>
                </div>
              </Card>
            </Link>
          );
        })}
      </div>

      {/* Today's Overview */}
      <Card className="p-6 bg-slate-900/50 backdrop-blur-sm border-slate-800/50 shadow-xl">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-slate-100">Today's Nutrition</h3>
          <CalendarDays className="w-5 h-5 text-emerald-400" />
        </div>

        {/* Calorie Progress */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Flame className="w-5 h-5 text-orange-400" />
              <span className="font-semibold text-slate-200">Calories</span>
            </div>
            <span className="text-lg font-bold text-slate-100">
              {Math.round(caloriesConsumed)} / {calorieTarget}
            </span>
          </div>
          <Progress value={Math.min(calorieProgress, 100)} className="h-3" />
          <p className="text-xs text-slate-400 mt-2">
            {calorieTarget - caloriesConsumed > 0 
              ? `${Math.round(calorieTarget - caloriesConsumed)} calories remaining`
              : `${Math.round(caloriesConsumed - calorieTarget)} calories over target`
            }
          </p>
        </div>

        {/* Macros */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-gradient-to-br from-blue-950/50 to-cyan-950/50 p-4 rounded-2xl border border-blue-900/30">
            <p className="text-xs text-blue-400 font-medium mb-1">Protein</p>
            <p className="text-2xl font-bold text-blue-300">{Math.round(proteinConsumed)}g</p>
            <p className="text-xs text-blue-400 mt-1">of {proteinTarget}g</p>
          </div>
          <div className="bg-gradient-to-br from-amber-950/50 to-orange-950/50 p-4 rounded-2xl border border-amber-900/30">
            <p className="text-xs text-amber-400 font-medium mb-1">Carbs</p>
            <p className="text-2xl font-bold text-amber-300">
              {Math.round(todayProgress?.carbs_consumed_g || 0)}g
            </p>
            <p className="text-xs text-amber-400 mt-1">of {profile.carbs_target_g}g</p>
          </div>
          <div className="bg-gradient-to-br from-purple-950/50 to-pink-950/50 p-4 rounded-2xl border border-purple-900/30">
            <p className="text-xs text-purple-400 font-medium mb-1">Fat</p>
            <p className="text-2xl font-bold text-purple-300">
              {Math.round(todayProgress?.fat_consumed_g || 0)}g
            </p>
            <p className="text-xs text-purple-400 mt-1">of {profile.fat_target_g}g</p>
          </div>
        </div>
      </Card>

      {/* Meals & Workout Row */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Today's Meals */}
        <Card className="p-6 bg-slate-900/50 backdrop-blur-sm border-slate-800/50 shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-slate-100">Today's Meals</h3>
            <Apple className="w-5 h-5 text-emerald-400" />
          </div>
          {todayMeals && todayMeals.length > 0 ? (
            <div className="space-y-3">
              {todayMeals.map((meal, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 bg-slate-800/50 rounded-xl border border-slate-700/50">
                  <div>
                    <p className="font-semibold text-slate-200 capitalize">{meal.meal_type}</p>
                    <p className="text-xs text-slate-400">{meal.food_items?.length || 0} items</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-slate-100">{Math.round(meal.total_calories)} cal</p>
                    <p className="text-xs text-slate-400">{meal.meal_time}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Camera className="w-12 h-12 text-slate-600 mx-auto mb-3" />
              <p className="text-slate-400 mb-4">No meals logged yet today</p>
              <Link to={createPageUrl('FoodLog')}>
                <Button className="bg-emerald-600 hover:bg-emerald-700">
                  Log Your First Meal
                </Button>
              </Link>
            </div>
          )}
        </Card>

        {/* Workout Status */}
        <Card className="p-6 bg-slate-900/50 backdrop-blur-sm border-slate-800/50 shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-slate-100">Today's Workout</h3>
            <Dumbbell className="w-5 h-5 text-purple-400" />
          </div>
          {activeWorkout ? (
            <div className="space-y-4">
              <div className="bg-gradient-to-br from-purple-950/50 to-pink-950/50 p-4 rounded-2xl border border-purple-900/30">
                <p className="text-sm text-purple-300 font-medium mb-2">Active Plan</p>
                <p className="text-lg font-bold text-purple-200 mb-1">{activeWorkout.plan_name}</p>
                <p className="text-xs text-purple-300">{activeWorkout.fitness_level} level</p>
              </div>
              {todayProgress?.workout_completed ? (
                <div className="flex items-center gap-2 text-green-400 bg-green-950/30 p-3 rounded-xl border border-green-900/30">
                  <Heart className="w-5 h-5" />
                  <span className="font-medium">Workout completed today! 🎉</span>
                </div>
              ) : (
                <Link to={createPageUrl('Workouts')}>
                  <Button className="w-full bg-purple-600 hover:bg-purple-700">
                    Start Today's Workout
                    <ChevronRight className="w-4 h-4 ml-2" />
                  </Button>
                </Link>
              )}
            </div>
          ) : (
            <div className="text-center py-8">
              <Zap className="w-12 h-12 text-slate-600 mx-auto mb-3" />
              <p className="text-slate-400 mb-4">No workout plan yet</p>
              <Link to={createPageUrl('Workouts')}>
                <Button className="bg-purple-600 hover:bg-purple-700">
                  Generate Workout Plan
                </Button>
              </Link>
            </div>
          )}
        </Card>
      </div>

      {/* Recent Achievements */}
      {recentMilestones && recentMilestones.length > 0 && (
        <Card className="p-6 bg-slate-900/50 backdrop-blur-sm border-slate-800/50 shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-slate-100">Recent Achievements</h3>
            <Award className="w-5 h-5 text-amber-400" />
          </div>
          <div className="grid md:grid-cols-3 gap-4">
            {recentMilestones.map((milestone, idx) => (
              <div key={idx} className="bg-gradient-to-br from-amber-950/50 to-yellow-950/50 p-4 rounded-2xl border border-amber-900/30">
                <div className="flex items-start justify-between mb-2">
                  <Award className="w-8 h-8 text-amber-400" />
                  <span className="text-xs font-bold text-amber-300">+{milestone.points_earned} pts</span>
                </div>
                <p className="font-bold text-amber-200 mb-1">{milestone.title}</p>
                <p className="text-xs text-amber-400">{milestone.description}</p>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}