import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Camera, Plus, Sparkles, Apple, Coffee, Soup, Cookie, ChevronDown, Lightbulb } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export default function FoodLog() {
  const [user, setUser] = useState(null);
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [mealDescription, setMealDescription] = useState('');
  const [selectedMealType, setSelectedMealType] = useState('breakfast');
  
  const queryClient = useQueryClient();

  useEffect(() => {
    const loadUser = async () => {
      const currentUser = await base44.auth.me();
      setUser(currentUser);
    };
    loadUser();
  }, []);

  const { data: meals = [] } = useQuery({
    queryKey: ['meals', user?.email, selectedDate],
    queryFn: async () => {
      const results = await base44.entities.FoodLog.filter({
        created_by: user.email,
        meal_date: selectedDate
      }, '-created_date');
      return results || [];
    },
    enabled: !!user,
  });

  const { data: profile } = useQuery({
    queryKey: ['userProfile', user?.email],
    queryFn: async () => {
      const profiles = await base44.entities.UserProfile.filter({ created_by: user.email });
      return profiles[0] || null;
    },
    enabled: !!user,
  });

  const createMealMutation = useMutation({
    mutationFn: (mealData) => base44.entities.FoodLog.create(mealData),
    onSuccess: () => {
      queryClient.invalidateQueries(['meals']);
      queryClient.invalidateQueries(['todayProgress']);
      queryClient.invalidateQueries(['todayMeals']);
      setIsDialogOpen(false);
      setMealDescription('');
      toast.success('Meal logged successfully! 🍽️');
    },
  });

  const handleAIAnalyze = async () => {
    if (!mealDescription.trim()) {
      toast.error('Please describe what you ate');
      return;
    }

    setIsAnalyzing(true);
    try {
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `Analyze this meal and extract nutrition information. Meal description: "${mealDescription}"
        
Break down the foods into individual items with portions and estimate:
- Calories
- Protein (g)
- Carbs (g)
- Fat (g)

Also provide:
- A healthiness score from 1-10
- 2-3 suggestions for healthier alternatives or improvements
- Keep cultural context and preferences in mind

Return as JSON matching this exact structure.`,
        response_json_schema: {
          type: 'object',
          properties: {
            food_items: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  portion: { type: 'string' },
                  calories: { type: 'number' },
                  protein_g: { type: 'number' },
                  carbs_g: { type: 'number' },
                  fat_g: { type: 'number' }
                }
              }
            },
            total_calories: { type: 'number' },
            total_protein_g: { type: 'number' },
            total_carbs_g: { type: 'number' },
            total_fat_g: { type: 'number' },
            healthiness_score: { type: 'integer' },
            ai_suggestions: { type: 'string' }
          }
        }
      });

      const mealData = {
        meal_type: selectedMealType,
        meal_date: selectedDate,
        meal_time: format(new Date(), 'HH:mm'),
        notes: mealDescription,
        ...result
      };

      await createMealMutation.mutateAsync(mealData);

      // Update daily progress
      const todayProgress = await base44.entities.DailyProgress.filter({
        created_by: user.email,
        date: selectedDate
      });

      const progressData = {
        date: selectedDate,
        calories_consumed: (todayProgress[0]?.calories_consumed || 0) + result.total_calories,
        protein_consumed_g: (todayProgress[0]?.protein_consumed_g || 0) + result.total_protein_g,
        carbs_consumed_g: (todayProgress[0]?.carbs_consumed_g || 0) + result.total_carbs_g,
        fat_consumed_g: (todayProgress[0]?.fat_consumed_g || 0) + result.total_fat_g,
        meals_logged: (todayProgress[0]?.meals_logged || 0) + 1
      };

      if (todayProgress[0]) {
        await base44.entities.DailyProgress.update(todayProgress[0].id, progressData);
      } else {
        await base44.entities.DailyProgress.create(progressData);
      }

      // Update streak
      if (profile) {
        const newStreak = profile.current_streak + 1;
        await base44.entities.UserProfile.update(profile.id, {
          current_streak: newStreak,
          total_points: profile.total_points + 10
        });
      }

    } catch (error) {
      toast.error('Error analyzing meal');
      console.error(error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const mealIcons = {
    breakfast: Coffee,
    lunch: Soup,
    dinner: Apple,
    snack: Cookie
  };

  const mealTypeColors = {
    breakfast: 'from-amber-500 to-orange-500',
    lunch: 'from-emerald-500 to-teal-500',
    dinner: 'from-purple-500 to-pink-500',
    snack: 'from-blue-500 to-cyan-500'
  };

  const totalCalories = meals.reduce((sum, meal) => sum + (meal.total_calories || 0), 0);
  const calorieTarget = profile?.daily_calorie_target || 2000;
  const remaining = calorieTarget - totalCalories;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-800 mb-2">Food Log</h1>
          <p className="text-slate-600">Track your meals and nutrition</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 shadow-lg">
              <Plus className="w-5 h-5 mr-2" />
              Log Meal
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Log Your Meal</DialogTitle>
            </DialogHeader>
            <div className="space-y-6 mt-4">
              <div>
                <Label>Date</Label>
                <Input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="mt-2"
                />
              </div>

              <div>
                <Label>Meal Type</Label>
                <Select value={selectedMealType} onValueChange={setSelectedMealType}>
                  <SelectTrigger className="mt-2">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="breakfast">Breakfast</SelectItem>
                    <SelectItem value="lunch">Lunch</SelectItem>
                    <SelectItem value="dinner">Dinner</SelectItem>
                    <SelectItem value="snack">Snack</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>What did you eat?</Label>
                <Textarea
                  value={mealDescription}
                  onChange={(e) => setMealDescription(e.target.value)}
                  placeholder="e.g., 2 scrambled eggs, 2 slices whole wheat toast with butter, 1 cup of orange juice"
                  className="mt-2 h-32"
                />
                <p className="text-xs text-slate-500 mt-2">
                  Be as detailed as possible - include portions and preparation methods
                </p>
              </div>

              <Button
                onClick={handleAIAnalyze}
                disabled={isAnalyzing}
                className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
              >
                {isAnalyzing ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2" />
                    Analyzing with AI...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    Analyze with AI
                  </>
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Daily Summary */}
      <Card className="p-6 bg-gradient-to-br from-emerald-500 to-teal-500 text-white border-none shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold">Today's Overview</h3>
          <Input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="w-48 bg-white/20 border-white/30 text-white"
          />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white/20 backdrop-blur-sm p-4 rounded-2xl">
            <p className="text-emerald-100 text-sm mb-1">Consumed</p>
            <p className="text-3xl font-bold">{Math.round(totalCalories)}</p>
            <p className="text-emerald-100 text-xs">calories</p>
          </div>
          <div className="bg-white/20 backdrop-blur-sm p-4 rounded-2xl">
            <p className="text-emerald-100 text-sm mb-1">Target</p>
            <p className="text-3xl font-bold">{calorieTarget}</p>
            <p className="text-emerald-100 text-xs">calories</p>
          </div>
          <div className="bg-white/20 backdrop-blur-sm p-4 rounded-2xl">
            <p className="text-emerald-100 text-sm mb-1">Remaining</p>
            <p className="text-3xl font-bold">{Math.abs(Math.round(remaining))}</p>
            <p className="text-emerald-100 text-xs">{remaining > 0 ? 'left' : 'over'}</p>
          </div>
          <div className="bg-white/20 backdrop-blur-sm p-4 rounded-2xl">
            <p className="text-emerald-100 text-sm mb-1">Meals</p>
            <p className="text-3xl font-bold">{meals.length}</p>
            <p className="text-emerald-100 text-xs">logged</p>
          </div>
        </div>
      </Card>

      {/* Meals List */}
      <div className="space-y-4">
        {['breakfast', 'lunch', 'dinner', 'snack'].map(mealType => {
          const typeMeals = meals.filter(m => m.meal_type === mealType);
          const Icon = mealIcons[mealType];
          
          return (
            <Card key={mealType} className="p-6 bg-white/80 backdrop-blur-sm border-none shadow-lg">
              <div className="flex items-center gap-3 mb-4">
                <div className={cn(
                  "w-12 h-12 rounded-2xl bg-gradient-to-br flex items-center justify-center shadow-lg",
                  mealTypeColors[mealType]
                )}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-slate-800 capitalize">{mealType}</h3>
                  <p className="text-sm text-slate-500">
                    {typeMeals.length} {typeMeals.length === 1 ? 'entry' : 'entries'}
                  </p>
                </div>
                {typeMeals.length > 0 && (
                  <div className="text-right">
                    <p className="text-2xl font-bold text-slate-800">
                      {Math.round(typeMeals.reduce((sum, m) => sum + (m.total_calories || 0), 0))}
                    </p>
                    <p className="text-xs text-slate-500">calories</p>
                  </div>
                )}
              </div>

              {typeMeals.length > 0 ? (
                <div className="space-y-3">
                  {typeMeals.map((meal, idx) => (
                    <div key={idx} className="bg-slate-50 p-4 rounded-2xl">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <p className="font-semibold text-slate-700">{meal.meal_time}</p>
                          {meal.notes && (
                            <p className="text-sm text-slate-600 mt-1">{meal.notes}</p>
                          )}
                        </div>
                        {meal.healthiness_score && (
                          <div className="flex items-center gap-2 bg-emerald-100 px-3 py-1 rounded-full">
                            <span className="text-xs font-bold text-emerald-700">
                              {meal.healthiness_score}/10
                            </span>
                          </div>
                        )}
                      </div>

                      {meal.food_items && meal.food_items.length > 0 && (
                        <div className="space-y-2 mb-3">
                          {meal.food_items.map((item, i) => (
                            <div key={i} className="flex justify-between text-sm">
                              <span className="text-slate-700">
                                {item.name} ({item.portion})
                              </span>
                              <span className="text-slate-500">{Math.round(item.calories)} cal</span>
                            </div>
                          ))}
                        </div>
                      )}

                      <div className="grid grid-cols-4 gap-2 pt-3 border-t border-slate-200">
                        <div>
                          <p className="text-xs text-slate-500">Protein</p>
                          <p className="font-bold text-blue-600">{Math.round(meal.total_protein_g)}g</p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-500">Carbs</p>
                          <p className="font-bold text-amber-600">{Math.round(meal.total_carbs_g)}g</p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-500">Fat</p>
                          <p className="font-bold text-purple-600">{Math.round(meal.total_fat_g)}g</p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-500">Total</p>
                          <p className="font-bold text-emerald-600">{Math.round(meal.total_calories)} cal</p>
                        </div>
                      </div>

                      {meal.ai_suggestions && (
                        <div className="mt-3 p-3 bg-blue-50 rounded-xl flex gap-2">
                          <Lightbulb className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                          <p className="text-xs text-blue-700">{meal.ai_suggestions}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 text-slate-400">
                  <p className="text-sm">No {mealType} logged yet</p>
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}