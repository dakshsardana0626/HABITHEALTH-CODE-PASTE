import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Sparkles, Clock, Flame, ChefHat, Calendar, 
  Apple, CheckCircle2, ChevronDown, ChevronUp, Settings,
  ShoppingCart, TrendingUp, X, Check, ListChecks, Trash2,
  Edit2, Eye, AlertCircle, BookOpen
} from 'lucide-react';
import { format, addDays, addMonths } from 'date-fns';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export default function MealPlans() {
  const [user, setUser] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showCustomize, setShowCustomize] = useState(false);
  const [showGroceryList, setShowGroceryList] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [previewPlan, setPreviewPlan] = useState(null);
  const [editingMeal, setEditingMeal] = useState(null);
  const [showMealEdit, setShowMealEdit] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [planToDelete, setPlanToDelete] = useState(null);
  const [showInstructions, setShowInstructions] = useState(null);
  const [useCustomNutrition, setUseCustomNutrition] = useState(false);
  const [planSettings, setPlanSettings] = useState({
    duration: '1_week',
    max_prep_time: 60,
    dietary_restrictions: [],
    other_restrictions: '',
    preferred_foods: '',
    avoid_foods: '',
    meal_complexity: 'moderate',
    custom_calories: '',
    custom_protein: '',
    custom_carbs: '',
    custom_fat: '',
  });
  const queryClient = useQueryClient();

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

  const { data: mealPlans = [] } = useQuery({
    queryKey: ['mealPlans', user?.email],
    queryFn: async () => {
      const plans = await base44.entities.MealPlan.filter({
        created_by: user.email
      }, '-created_date');
      return plans || [];
    },
    enabled: !!user,
  });

  const { data: foodLogs = [] } = useQuery({
    queryKey: ['recentFoodLogs', user?.email],
    queryFn: async () => {
      const logs = await base44.entities.FoodLog.filter({
        created_by: user.email
      }, '-created_date', 30);
      return logs || [];
    },
    enabled: !!user,
  });

  const { data: groceryList } = useQuery({
    queryKey: ['groceryList', mealPlans.find(p => p.is_active)?.id],
    queryFn: async () => {
      const activePlan = mealPlans.find(p => p.is_active);
      if (!activePlan) return null;
      const lists = await base44.entities.GroceryList.filter({
        created_by: user.email,
        meal_plan_id: activePlan.id
      });
      return lists[0] || null;
    },
    enabled: !!user && mealPlans.some(p => p.is_active),
  });

  const { data: tracking = [] } = useQuery({
    queryKey: ['mealTracking', mealPlans.find(p => p.is_active)?.id],
    queryFn: async () => {
      const activePlan = mealPlans.find(p => p.is_active);
      if (!activePlan) return [];
      const records = await base44.entities.MealPlanTracking.filter({
        created_by: user.email,
        meal_plan_id: activePlan.id
      }, '-date');
      return records || [];
    },
    enabled: !!user && mealPlans.some(p => p.is_active),
  });

  const createPlanMutation = useMutation({
    mutationFn: (planData) => base44.entities.MealPlan.create(planData),
    onSuccess: async (newPlan) => {
      queryClient.invalidateQueries(['mealPlans']);
      queryClient.invalidateQueries(['activeMealPlan']);
    },
  });

  const updatePlanMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.MealPlan.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['mealPlans']);
      toast.success('Meal plan updated!');
    },
  });

  const deletePlanMutation = useMutation({
    mutationFn: (id) => base44.entities.MealPlan.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['mealPlans']);
      toast.success('Meal plan deleted');
    },
  });

  const getDurationDays = (duration) => {
    switch(duration) {
      case '1_week': return 7;
      case '1_month': return 30;
      case '3_months': return 90;
      case '6_months': return 180;
      default: return 7;
    }
  };

  const handleGeneratePlan = async () => {
    if (!profile) {
      toast.error('Profile not found');
      return;
    }

    setIsGenerating(true);
    try {
      const mealTypeBreakdown = {};
      const foodFrequency = {};
      
      foodLogs.forEach(log => {
        if (!mealTypeBreakdown[log.meal_type]) {
          mealTypeBreakdown[log.meal_type] = [];
        }
        mealTypeBreakdown[log.meal_type].push(log);
        
        log.food_items?.forEach(item => {
          foodFrequency[item.name] = (foodFrequency[item.name] || 0) + 1;
        });
      });

      const frequentFoods = Object.entries(foodFrequency)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([food]) => food);

      const habitAnalysis = foodLogs.length > 0 ? 
        `Eating Pattern Analysis:
- Total meals logged: ${foodLogs.length}
- Breakfast habits: ${mealTypeBreakdown.breakfast?.length || 0} logged
- Lunch habits: ${mealTypeBreakdown.lunch?.length || 0} logged  
- Dinner habits: ${mealTypeBreakdown.dinner?.length || 0} logged
- Most frequent foods: ${frequentFoods.slice(0, 5).join(', ')}` : 
        'No previous meals logged - will create plan based on preferences';

      const durationDays = getDurationDays(planSettings.duration);
      const startDate = new Date();

      const customRestrictions = planSettings.other_restrictions 
        ? planSettings.other_restrictions.split(',').map(r => r.trim()).filter(Boolean)
        : [];
      
      const allDietaryRestrictions = [
        ...(profile.dietary_preferences || []), 
        ...planSettings.dietary_restrictions,
        ...customRestrictions
      ];
      const allAvoidFoods = [...(profile.disliked_foods || []), ...(planSettings.avoid_foods ? planSettings.avoid_foods.split(',').map(f => f.trim()) : [])];
      const allPreferredFoods = [
        ...(profile.favorite_foods || []), 
        ...frequentFoods,
        ...(planSettings.preferred_foods ? planSettings.preferred_foods.split(',').map(f => f.trim()) : [])
      ];

      const calorieTarget = useCustomNutrition && planSettings.custom_calories 
        ? parseInt(planSettings.custom_calories)
        : profile.daily_calorie_target;
      const proteinTarget = useCustomNutrition && planSettings.custom_protein
        ? parseInt(planSettings.custom_protein)
        : profile.protein_target_g;
      const carbsTarget = useCustomNutrition && planSettings.custom_carbs
        ? parseInt(planSettings.custom_carbs)
        : profile.carbs_target_g;
      const fatTarget = useCustomNutrition && planSettings.custom_fat
        ? parseInt(planSettings.custom_fat)
        : profile.fat_target_g;

      const prompt = `YOU MUST CREATE A COMPLETE ${durationDays}-DAY MEAL PLAN. DO NOT CREATE LESS THAN ${durationDays} DAYS.

I REPEAT: YOU MUST GENERATE EXACTLY ${durationDays} DAYS OF MEALS. NOT ${durationDays - 1}, NOT ${durationDays - 10}, BUT EXACTLY ${durationDays} DAYS.

EACH DAY MUST INCLUDE:
- Breakfast with full details
- Lunch with full details  
- Dinner with full details
- 2 snack options

START DATE: ${format(startDate, 'MMMM d, yyyy (EEEE)')}

**User Requirements:**
- Daily calories: ${calorieTarget} cal
- Protein: ${proteinTarget}g | Carbs: ${carbsTarget}g | Fat: ${fatTarget}g
- Goal: ${profile.primary_goal}
- Activity: ${profile.activity_level}
- Health: ${profile.health_conditions?.join(', ') || 'None'}
- Dietary restrictions: ${allDietaryRestrictions.join(', ') || 'None'}
- Preferred foods: ${allPreferredFoods.join(', ') || 'Variety'}
- Avoid: ${allAvoidFoods.join(', ') || 'None'}
- Max prep time: ${planSettings.max_prep_time} minutes

**${habitAnalysis}**

**MANDATORY OUTPUT:**
Generate ${durationDays} complete days. Label each day as:
- Day 1 (${format(startDate, 'MMM d')})
- Day 2 (${format(addDays(startDate, 1), 'MMM d')})
- Day 3 (${format(addDays(startDate, 2), 'MMM d')})
... continuing through Day ${durationDays} (${format(addDays(startDate, durationDays - 1), 'MMM d')})

For EVERY SINGLE DAY (all ${durationDays} days), provide:
- Complete breakfast, lunch, dinner
- EXACT ingredient quantities (e.g., "2 cups rice", "1 lb chicken")
- Precise macros per meal
- Prep time per meal
- DETAILED cooking instructions (5+ steps)
- 2 snacks

Variety across all ${durationDays} days while using preferred foods.

CONFIRM YOU WILL GENERATE ALL ${durationDays} DAYS BEFORE STARTING.`;

      const result = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: 'object',
          properties: {
            daily_plans: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  day: { type: 'string' },
                  breakfast: {
                    type: 'object',
                    properties: {
                      meal_name: { type: 'string' },
                      ingredients: { type: 'array', items: { type: 'string' } },
                      calories: { type: 'number' },
                      protein_g: { type: 'number' },
                      carbs_g: { type: 'number' },
                      fat_g: { type: 'number' },
                      prep_time_min: { type: 'integer' },
                      instructions: { type: 'string' }
                    }
                  },
                  lunch: {
                    type: 'object',
                    properties: {
                      meal_name: { type: 'string' },
                      ingredients: { type: 'array', items: { type: 'string' } },
                      calories: { type: 'number' },
                      protein_g: { type: 'number' },
                      carbs_g: { type: 'number' },
                      fat_g: { type: 'number' },
                      prep_time_min: { type: 'integer' },
                      instructions: { type: 'string' }
                    }
                  },
                  dinner: {
                    type: 'object',
                    properties: {
                      meal_name: { type: 'string' },
                      ingredients: { type: 'array', items: { type: 'string' } },
                      calories: { type: 'number' },
                      protein_g: { type: 'number' },
                      carbs_g: { type: 'number' },
                      fat_g: { type: 'number' },
                      prep_time_min: { type: 'integer' },
                      instructions: { type: 'string' }
                    }
                  },
                  snacks: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        name: { type: 'string' },
                        calories: { type: 'number' }
                      }
                    }
                  }
                }
              }
            },
            ai_notes: { type: 'string' }
          }
        }
      });

      if (result.daily_plans.length < durationDays) {
        toast.error(`ERROR: Only ${result.daily_plans.length} of ${durationDays} days generated. Please try again.`);
        setIsGenerating(false);
        return;
      }

      const totalCalories = result.daily_plans.reduce((sum, day) => {
        return sum + (day.breakfast?.calories || 0) + (day.lunch?.calories || 0) + (day.dinner?.calories || 0);
      }, 0);

      const endDate = addDays(startDate, durationDays - 1);

      const planData = {
        week_start_date: format(startDate, 'yyyy-MM-dd'),
        week_end_date: format(endDate, 'yyyy-MM-dd'),
        daily_plans: result.daily_plans,
        total_weekly_calories: totalCalories,
        based_on_habits: foodLogs.length > 0,
        ai_notes: result.ai_notes,
        is_active: false
      };

      setPreviewPlan(planData);
      setShowPreview(true);
      setShowCustomize(false);
      toast.success(`✅ Complete ${durationDays}-day meal plan generated! All days ready to view.`);
    } catch (error) {
      toast.error('Error generating meal plan');
      console.error(error);
    } finally {
      setIsGenerating(false);
    }
  };

  const generateGroceryList = async (mealPlan, dailyPlans) => {
    try {
      const allIngredients = [];
      
      dailyPlans.forEach(day => {
        [day.breakfast, day.lunch, day.dinner].forEach(meal => {
          if (meal?.ingredients) {
            meal.ingredients.forEach(ing => allIngredients.push(ing));
          }
        });
      });

      const prompt = `Given this list of ingredients from a meal plan, create a consolidated grocery list with:
- Combined quantities for duplicate items
- Organized by category (produce, protein, dairy, grains, pantry, spices, other)
- Estimated cost per item (rough estimate in USD)

Ingredients: ${allIngredients.join(', ')}

Return a structured grocery list.`;

      const result = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: 'object',
          properties: {
            items: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  item_name: { type: 'string' },
                  quantity: { type: 'string' },
                  category: { type: 'string', enum: ['produce', 'protein', 'dairy', 'grains', 'pantry', 'spices', 'other'] },
                  estimated_cost: { type: 'number' }
                }
              }
            },
            total_estimated_cost: { type: 'number' }
          }
        }
      });

      await base44.entities.GroceryList.create({
        meal_plan_id: mealPlan.id,
        plan_duration: planSettings.duration,
        items: result.items,
        total_estimated_cost: result.total_estimated_cost,
        generated_date: format(new Date(), 'yyyy-MM-dd')
      });

      queryClient.invalidateQueries(['groceryList']);
    } catch (error) {
      console.error('Error generating grocery list:', error);
    }
  };

  const handleToggleDietaryRestriction = (restriction) => {
    setPlanSettings(prev => ({
      ...prev,
      dietary_restrictions: prev.dietary_restrictions.includes(restriction)
        ? prev.dietary_restrictions.filter(r => r !== restriction)
        : [...prev.dietary_restrictions, restriction]
    }));
  };

  const handleApprovePlan = async () => {
    try {
      const otherPlans = mealPlans.filter(p => p.is_active);
      for (const plan of otherPlans) {
        await base44.entities.MealPlan.update(plan.id, { is_active: false });
      }

      const newPlan = await createPlanMutation.mutateAsync({
        ...previewPlan,
        is_active: true
      });
      
      await generateGroceryList(newPlan, previewPlan.daily_plans);
      
      const today = new Date();
      for (let i = 0; i < Math.min(7, previewPlan.daily_plans.length); i++) {
        await base44.entities.MealPlanTracking.create({
          meal_plan_id: newPlan.id,
          date: format(addDays(today, i), 'yyyy-MM-dd'),
          day_name: previewPlan.daily_plans[i].day,
          breakfast_completed: false,
          lunch_completed: false,
          dinner_completed: false,
          adherence_score: 0
        });
      }
      
      queryClient.invalidateQueries(['mealTracking']);
      setShowPreview(false);
      setPreviewPlan(null);
      toast.success('Meal plan approved and activated! 🎉');
    } catch (error) {
      toast.error('Error approving plan');
      console.error(error);
    }
  };

  const handleEditMeal = (dayIndex, mealType, isActivePlan = false) => {
    const plan = isActivePlan ? activePlan : previewPlan;
    const meal = plan.daily_plans[dayIndex][mealType];
    setEditingMeal({
      dayIndex,
      mealType,
      isActivePlan,
      planId: isActivePlan ? activePlan.id : null,
      data: { ...meal }
    });
    setShowMealEdit(true);
  };

  const handleSaveMealEdit = async () => {
    if (editingMeal.isActivePlan) {
      const updatedPlans = [...activePlan.daily_plans];
      updatedPlans[editingMeal.dayIndex][editingMeal.mealType] = editingMeal.data;
      
      await updatePlanMutation.mutateAsync({
        id: activePlan.id,
        data: { daily_plans: updatedPlans }
      });
    } else {
      const updatedPlans = [...previewPlan.daily_plans];
      updatedPlans[editingMeal.dayIndex][editingMeal.mealType] = editingMeal.data;
      
      setPreviewPlan({
        ...previewPlan,
        daily_plans: updatedPlans
      });
    }
    
    setShowMealEdit(false);
    setEditingMeal(null);
    toast.success('Meal updated!');
  };

  const handleDeletePlan = async (plan) => {
    setPlanToDelete(plan);
    setShowDeleteConfirm(true);
  };

  const confirmDeletePlan = async () => {
    if (!planToDelete) return;
    
    try {
      await deletePlanMutation.mutateAsync(planToDelete.id);
      setShowDeleteConfirm(false);
      setPlanToDelete(null);
    } catch (error) {
      toast.error('Error deleting plan');
    }
  };

  const handleDeleteAllPlans = async () => {
    try {
      for (const plan of mealPlans) {
        await deletePlanMutation.mutateAsync(plan.id);
      }
      setShowDeleteConfirm(false);
      setPlanToDelete(null);
      toast.success('All meal plans deleted');
    } catch (error) {
      toast.error('Error deleting plans');
      setShowDeleteConfirm(false);
      setPlanToDelete(null);
    }
  };

  const handleToggleGroceryItem = async (itemIndex) => {
    if (!groceryList) return;
    
    const updatedItems = groceryList.items.map((item, idx) => 
      idx === itemIndex ? { ...item, purchased: !item.purchased } : item
    );

    await base44.entities.GroceryList.update(groceryList.id, {
      items: updatedItems
    });

    queryClient.invalidateQueries(['groceryList']);
  };

  const activePlan = mealPlans.find(p => p.is_active);
  const inactivePlans = mealPlans.filter(p => !p.is_active);

  const dietaryOptions = ['Gluten-Free', 'Dairy-Free', 'Nut-Free', 'Soy-Free', 'Low-Sodium', 'Low-Sugar', 'Paleo', 'Whole30'];

  const MealCard = ({ meal, icon: Icon, gradient, dayIndex, mealType, editable, isActivePlan }) => {
    if (!meal) return null;

    return (
      <div className="bg-slate-900/50 backdrop-blur-sm border border-slate-800/50 rounded-2xl p-5 shadow-md">
        <div className="flex items-center gap-3 mb-4">
          <div className={cn("w-10 h-10 rounded-xl bg-gradient-to-br flex items-center justify-center", gradient)}>
            <Icon className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1">
            <h4 className="font-bold text-slate-100">{meal.meal_name}</h4>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="secondary" className="text-xs bg-slate-800 text-slate-300 border-slate-700">
                <Clock className="w-3 h-3 mr-1" />
                {meal.prep_time_min} min
              </Badge>
              <Badge variant="secondary" className="text-xs bg-slate-800 text-slate-300 border-slate-700">
                <Flame className="w-3 h-3 mr-1" />
                {Math.round(meal.calories)} cal
              </Badge>
            </div>
          </div>
          {editable && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => handleEditMeal(dayIndex, mealType, isActivePlan)}
              className="text-emerald-400 hover:text-emerald-300 hover:bg-slate-800"
            >
              <Edit2 className="w-4 h-4" />
            </Button>
          )}
        </div>

        <div className="grid grid-cols-3 gap-2 mb-4">
          <div className="bg-blue-950/50 p-2 rounded-lg text-center border border-blue-900/30">
            <p className="text-xs text-blue-400">Protein</p>
            <p className="font-bold text-blue-300">{Math.round(meal.protein_g)}g</p>
          </div>
          <div className="bg-amber-950/50 p-2 rounded-lg text-center border border-amber-900/30">
            <p className="text-xs text-amber-400">Carbs</p>
            <p className="font-bold text-amber-300">{Math.round(meal.carbs_g)}g</p>
          </div>
          <div className="bg-purple-950/50 p-2 rounded-lg text-center border border-purple-900/30">
            <p className="text-xs text-purple-400">Fat</p>
            <p className="font-bold text-purple-300">{Math.round(meal.fat_g)}g</p>
          </div>
        </div>

        <div className="space-y-3">
          <div>
            <p className="text-xs font-semibold text-slate-300 mb-2">Complete Ingredients:</p>
            <ul className="text-xs text-slate-400 space-y-1">
              {meal.ingredients?.map((ing, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="text-emerald-400">•</span>
                  {ing}
                </li>
              ))}
            </ul>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowInstructions({ meal, mealName: meal.meal_name })}
            className="w-full border-slate-700 text-slate-300 hover:bg-slate-800"
          >
            <BookOpen className="w-4 h-4 mr-2" />
            View Cooking Instructions
          </Button>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-100 mb-2">Meal Plans</h1>
          <p className="text-slate-400">AI-powered plans based on your eating habits</p>
        </div>
        <div className="flex gap-3">
          {mealPlans.length > 0 && (
            <Button
              variant="outline"
              onClick={() => {
                setPlanToDelete(null);
                setShowDeleteConfirm(true);
              }}
              className="border-red-700 text-red-400 hover:bg-red-950/30"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete All Plans
            </Button>
          )}
          <Button
            onClick={() => setShowCustomize(true)}
            className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 shadow-lg"
          >
            <Sparkles className="w-5 h-5 mr-2" />
            Create New Plan
          </Button>
        </div>
      </div>

      {/* Customize Dialog */}
      <Dialog open={showCustomize} onOpenChange={setShowCustomize}>
        <DialogContent className="max-w-3xl bg-slate-900 border-slate-800 text-slate-100 max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-slate-100">Customize Your Meal Plan</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6 mt-4">
            <div>
              <Label className="text-slate-300 mb-3 block">Plan Duration</Label>
              <div className="grid grid-cols-4 gap-3">
                {[
                  { value: '1_week', label: '1 Week', days: '7 days' },
                  { value: '1_month', label: '1 Month', days: '30 days' },
                  { value: '3_months', label: '3 Months', days: '90 days' },
                  { value: '6_months', label: '6 Months', days: '180 days' }
                ].map(option => (
                  <button
                    key={option.value}
                    onClick={() => setPlanSettings(prev => ({ ...prev, duration: option.value }))}
                    className={cn(
                      "p-4 rounded-xl border-2 transition-all text-center",
                      planSettings.duration === option.value
                        ? "border-emerald-500 bg-emerald-950/30"
                        : "border-slate-700 bg-slate-800/50 hover:border-slate-600"
                    )}
                  >
                    <p className="font-bold text-slate-100">{option.label}</p>
                    <p className="text-xs text-slate-400 mt-1">{option.days}</p>
                  </button>
                ))}
              </div>
              <p className="text-xs text-emerald-400 mt-3">
                ✓ All {getDurationDays(planSettings.duration)} days will be generated at once
              </p>
            </div>

            {/* Nutrition Targets */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-slate-300">Nutrition Targets</Label>
                <div className="flex items-center gap-2">
                  <Label className="text-sm text-slate-400">AI Recommended</Label>
                  <Checkbox
                    checked={useCustomNutrition}
                    onCheckedChange={setUseCustomNutrition}
                    className="border-slate-600"
                  />
                  <Label className="text-sm text-slate-400">Custom</Label>
                </div>
              </div>

              {useCustomNutrition ? (
                <div className="grid grid-cols-2 gap-4 p-4 bg-slate-800/50 rounded-xl border border-slate-700">
                  <div>
                    <Label className="text-slate-300 text-sm">Daily Calories</Label>
                    <Input
                      type="number"
                      value={planSettings.custom_calories}
                      onChange={(e) => setPlanSettings(prev => ({ ...prev, custom_calories: e.target.value }))}
                      placeholder={profile?.daily_calorie_target?.toString()}
                      className="mt-2 bg-slate-900/50 border-slate-700 text-slate-100"
                    />
                  </div>
                  <div>
                    <Label className="text-slate-300 text-sm">Protein (g)</Label>
                    <Input
                      type="number"
                      value={planSettings.custom_protein}
                      onChange={(e) => setPlanSettings(prev => ({ ...prev, custom_protein: e.target.value }))}
                      placeholder={profile?.protein_target_g?.toString()}
                      className="mt-2 bg-slate-900/50 border-slate-700 text-slate-100"
                    />
                  </div>
                  <div>
                    <Label className="text-slate-300 text-sm">Carbs (g)</Label>
                    <Input
                      type="number"
                      value={planSettings.custom_carbs}
                      onChange={(e) => setPlanSettings(prev => ({ ...prev, custom_carbs: e.target.value }))}
                      placeholder={profile?.carbs_target_g?.toString()}
                      className="mt-2 bg-slate-900/50 border-slate-700 text-slate-100"
                    />
                  </div>
                  <div>
                    <Label className="text-slate-300 text-sm">Fat (g)</Label>
                    <Input
                      type="number"
                      value={planSettings.custom_fat}
                      onChange={(e) => setPlanSettings(prev => ({ ...prev, custom_fat: e.target.value }))}
                      placeholder={profile?.fat_target_g?.toString()}
                      className="mt-2 bg-slate-900/50 border-slate-700 text-slate-100"
                    />
                  </div>
                </div>
              ) : (
                <div className="p-4 bg-emerald-950/20 rounded-xl border border-emerald-900/30">
                  <p className="text-sm text-emerald-300 mb-2">AI will use your profile targets:</p>
                  <div className="grid grid-cols-4 gap-3 text-center">
                    <div>
                      <p className="text-xs text-slate-400">Calories</p>
                      <p className="text-lg font-bold text-emerald-400">{profile?.daily_calorie_target}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-400">Protein</p>
                      <p className="text-lg font-bold text-blue-400">{profile?.protein_target_g}g</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-400">Carbs</p>
                      <p className="text-lg font-bold text-amber-400">{profile?.carbs_target_g}g</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-400">Fat</p>
                      <p className="text-lg font-bold text-purple-400">{profile?.fat_target_g}g</p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div>
              <Label className="text-slate-300">Maximum Prep Time per Meal</Label>
              <div className="flex items-center gap-4 mt-2">
                <Input
                  type="range"
                  min="15"
                  max="90"
                  step="15"
                  value={planSettings.max_prep_time}
                  onChange={(e) => setPlanSettings(prev => ({ ...prev, max_prep_time: parseInt(e.target.value) }))}
                  className="flex-1"
                />
                <Badge className="bg-emerald-600 text-white px-4 py-2 text-lg">
                  {planSettings.max_prep_time} min
                </Badge>
              </div>
            </div>

            <div>
              <Label className="text-slate-300 mb-3 block">Additional Dietary Restrictions</Label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {dietaryOptions.map(option => (
                  <button
                    key={option}
                    onClick={() => handleToggleDietaryRestriction(option)}
                    className={cn(
                      "px-3 py-2 rounded-lg text-sm transition-all border",
                      planSettings.dietary_restrictions.includes(option)
                        ? "bg-emerald-600 text-white border-emerald-500"
                        : "bg-slate-800/50 text-slate-300 border-slate-700 hover:border-slate-600"
                    )}
                  >
                    {option}
                  </button>
                ))}
              </div>
              
              <div className="mt-4">
                <Label className="text-slate-300 text-sm">Other Restrictions</Label>
                <Input
                  value={planSettings.other_restrictions}
                  onChange={(e) => setPlanSettings(prev => ({ ...prev, other_restrictions: e.target.value }))}
                  placeholder="e.g., Low-FODMAP, Kosher, Halal"
                  className="mt-2 bg-slate-800/50 border-slate-700 text-slate-100"
                />
              </div>
            </div>

            <div>
              <Label className="text-slate-300">Preferred Foods</Label>
              <Textarea
                value={planSettings.preferred_foods}
                onChange={(e) => setPlanSettings(prev => ({ ...prev, preferred_foods: e.target.value }))}
                placeholder="e.g., salmon, quinoa, avocado"
                className="mt-2 bg-slate-800/50 border-slate-700 text-slate-100"
              />
            </div>

            <div>
              <Label className="text-slate-300">Foods to Avoid</Label>
              <Textarea
                value={planSettings.avoid_foods}
                onChange={(e) => setPlanSettings(prev => ({ ...prev, avoid_foods: e.target.value }))}
                placeholder="e.g., shellfish, bell peppers"
                className="mt-2 bg-slate-800/50 border-slate-700 text-slate-100"
              />
            </div>

            <Button
              onClick={handleGeneratePlan}
              disabled={isGenerating}
              className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700"
              size="lg"
            >
              {isGenerating ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent mr-2" />
                  Generating All {getDurationDays(planSettings.duration)} Days...
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5 mr-2" />
                  Generate {getDurationDays(planSettings.duration)}-Day Meal Plan
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Instructions Dialog */}
      <Dialog open={!!showInstructions} onOpenChange={() => setShowInstructions(null)}>
        <DialogContent className="max-w-2xl bg-slate-900 border-slate-800 text-slate-100 max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-slate-100 flex items-center gap-2">
              <BookOpen className="w-6 h-6 text-emerald-400" />
              {showInstructions?.mealName}
            </DialogTitle>
          </DialogHeader>

          {showInstructions && (
            <div className="space-y-6 mt-4">
              <div>
                <h3 className="text-lg font-semibold text-slate-200 mb-3">Ingredients</h3>
                <ul className="space-y-2">
                  {showInstructions.meal.ingredients?.map((ing, i) => (
                    <li key={i} className="flex items-start gap-2 text-slate-300">
                      <span className="text-emerald-400 mt-1">•</span>
                      <span>{ing}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-slate-200 mb-3">Cooking Instructions</h3>
                <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700">
                  <p className="text-slate-300 whitespace-pre-line leading-relaxed">
                    {showInstructions.meal.instructions}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-4 gap-3 p-4 bg-slate-800/50 rounded-xl border border-slate-700">
                <div className="text-center">
                  <p className="text-xs text-slate-400">Prep Time</p>
                  <p className="text-lg font-bold text-slate-100">{showInstructions.meal.prep_time_min} min</p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-slate-400">Calories</p>
                  <p className="text-lg font-bold text-emerald-400">{Math.round(showInstructions.meal.calories)}</p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-slate-400">Protein</p>
                  <p className="text-lg font-bold text-blue-400">{Math.round(showInstructions.meal.protein_g)}g</p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-slate-400">Carbs</p>
                  <p className="text-lg font-bold text-amber-400">{Math.round(showInstructions.meal.carbs_g)}g</p>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-[95vw] bg-slate-900 border-slate-800 text-slate-100 max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-slate-100 flex items-center gap-2">
              <Eye className="w-6 h-6 text-emerald-400" />
              Your Complete {previewPlan?.daily_plans?.length}-Day Meal Plan
            </DialogTitle>
          </DialogHeader>

          {previewPlan && (
            <div className="space-y-6 mt-4">
              <div className="bg-emerald-950/30 border border-emerald-900/30 rounded-xl p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-xl font-bold text-slate-100 mb-2">
                      📅 All {previewPlan.daily_plans?.length} Days Generated
                    </h3>
                    <p className="text-slate-400">
                      {format(new Date(previewPlan.week_start_date), 'MMM d, yyyy')} - {format(new Date(previewPlan.week_end_date), 'MMM d, yyyy')}
                    </p>
                    <p className="text-emerald-400 text-sm mt-2">
                      ✓ Every single day from Day 1 to Day {previewPlan.daily_plans?.length} is shown below
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-emerald-400">Avg Daily Calories</p>
                    <p className="text-3xl font-bold text-emerald-300">
                      {Math.round(previewPlan.total_weekly_calories / (previewPlan.daily_plans?.length || 7))}
                    </p>
                  </div>
                </div>
                {previewPlan.ai_notes && (
                  <div className="bg-slate-800/50 p-4 rounded-lg border border-slate-700">
                    <p className="text-sm text-slate-300">{previewPlan.ai_notes}</p>
                  </div>
                )}
              </div>

              <div className="space-y-6">
                {previewPlan.daily_plans?.map((dayPlan, idx) => (
                  <Card key={idx} className="border-slate-800/50 bg-slate-900/50 backdrop-blur-sm p-6">
                    <div className="flex items-center gap-4 mb-6">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
                        <Calendar className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <h3 className="text-2xl font-bold text-slate-100">{dayPlan.day}</h3>
                        <p className="text-sm text-slate-400">
                          {Math.round((dayPlan.breakfast?.calories || 0) + (dayPlan.lunch?.calories || 0) + (dayPlan.dinner?.calories || 0))} total calories
                        </p>
                      </div>
                    </div>

                    <div className="grid lg:grid-cols-3 gap-4">
                      <MealCard 
                        meal={dayPlan.breakfast} 
                        icon={Apple} 
                        gradient="from-amber-500 to-orange-500"
                        dayIndex={idx}
                        mealType="breakfast"
                        editable={true}
                        isActivePlan={false}
                      />
                      <MealCard 
                        meal={dayPlan.lunch} 
                        icon={ChefHat} 
                        gradient="from-emerald-500 to-teal-500"
                        dayIndex={idx}
                        mealType="lunch"
                        editable={true}
                        isActivePlan={false}
                      />
                      <MealCard 
                        meal={dayPlan.dinner} 
                        icon={Flame} 
                        gradient="from-purple-500 to-pink-500"
                        dayIndex={idx}
                        mealType="dinner"
                        editable={true}
                        isActivePlan={false}
                      />
                    </div>

                    {dayPlan.snacks && dayPlan.snacks.length > 0 && (
                      <div className="mt-4 bg-slate-800/50 p-4 rounded-2xl border border-slate-700/50">
                        <p className="font-semibold text-slate-200 mb-3">Snack Options:</p>
                        <div className="grid md:grid-cols-2 gap-3">
                          {dayPlan.snacks.map((snack, i) => (
                            <div key={i} className="flex items-center justify-between bg-slate-900/50 p-3 rounded-xl border border-slate-700/50">
                              <span className="text-sm text-slate-300">{snack.name}</span>
                              <span className="text-sm font-bold text-emerald-400">
                                {Math.round(snack.calories)} cal
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </Card>
                ))}
              </div>

              <div className="flex gap-3 pt-4 border-t border-slate-800 sticky bottom-0 bg-slate-900 p-4 -m-4">
                <Button
                  variant="outline"
                  onClick={() => setShowPreview(false)}
                  className="flex-1 border-slate-700 text-slate-300"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleApprovePlan}
                  className="flex-1 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700"
                >
                  <Check className="w-5 h-5 mr-2" />
                  Approve & Start Plan
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Meal Edit Dialog */}
      <Dialog open={showMealEdit} onOpenChange={setShowMealEdit}>
        <DialogContent className="max-w-2xl bg-slate-900 border-slate-800 text-slate-100 max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-slate-100">Edit Meal</DialogTitle>
          </DialogHeader>

          {editingMeal && (
            <div className="space-y-4 mt-4">
              <div>
                <Label className="text-slate-300">Meal Name</Label>
                <Input
                  value={editingMeal.data.meal_name}
                  onChange={(e) => setEditingMeal(prev => ({
                    ...prev,
                    data: { ...prev.data, meal_name: e.target.value }
                  }))}
                  className="mt-2 bg-slate-800/50 border-slate-700 text-slate-100"
                />
              </div>

              <div>
                <Label className="text-slate-300">Ingredients (one per line)</Label>
                <Textarea
                  value={editingMeal.data.ingredients?.join('\n')}
                  onChange={(e) => setEditingMeal(prev => ({
                    ...prev,
                    data: { ...prev.data, ingredients: e.target.value.split('\n').filter(Boolean) }
                  }))}
                  className="mt-2 h-40 bg-slate-800/50 border-slate-700 text-slate-100"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-slate-300">Calories</Label>
                  <Input
                    type="number"
                    value={editingMeal.data.calories}
                    onChange={(e) => setEditingMeal(prev => ({
                      ...prev,
                      data: { ...prev.data, calories: parseFloat(e.target.value) }
                    }))}
                    className="mt-2 bg-slate-800/50 border-slate-700 text-slate-100"
                  />
                </div>
                <div>
                  <Label className="text-slate-300">Prep Time (min)</Label>
                  <Input
                    type="number"
                    value={editingMeal.data.prep_time_min}
                    onChange={(e) => setEditingMeal(prev => ({
                      ...prev,
                      data: { ...prev.data, prep_time_min: parseInt(e.target.value) }
                    }))}
                    className="mt-2 bg-slate-800/50 border-slate-700 text-slate-100"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label className="text-slate-300">Protein (g)</Label>
                  <Input
                    type="number"
                    value={editingMeal.data.protein_g}
                    onChange={(e) => setEditingMeal(prev => ({
                      ...prev,
                      data: { ...prev.data, protein_g: parseFloat(e.target.value) }
                    }))}
                    className="mt-2 bg-slate-800/50 border-slate-700 text-slate-100"
                  />
                </div>
                <div>
                  <Label className="text-slate-300">Carbs (g)</Label>
                  <Input
                    type="number"
                    value={editingMeal.data.carbs_g}
                    onChange={(e) => setEditingMeal(prev => ({
                      ...prev,
                      data: { ...prev.data, carbs_g: parseFloat(e.target.value) }
                    }))}
                    className="mt-2 bg-slate-800/50 border-slate-700 text-slate-100"
                  />
                </div>
                <div>
                  <Label className="text-slate-300">Fat (g)</Label>
                  <Input
                    type="number"
                    value={editingMeal.data.fat_g}
                    onChange={(e) => setEditingMeal(prev => ({
                      ...prev,
                      data: { ...prev.data, fat_g: parseFloat(e.target.value) }
                    }))}
                    className="mt-2 bg-slate-800/50 border-slate-700 text-slate-100"
                  />
                </div>
              </div>

              <div>
                <Label className="text-slate-300">Cooking Instructions</Label>
                <Textarea
                  value={editingMeal.data.instructions}
                  onChange={(e) => setEditingMeal(prev => ({
                    ...prev,
                    data: { ...prev.data, instructions: e.target.value }
                  }))}
                  className="mt-2 h-32 bg-slate-800/50 border-slate-700 text-slate-100"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  variant="outline"
                  onClick={() => setShowMealEdit(false)}
                  className="flex-1 border-slate-700 text-slate-300"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSaveMealEdit}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                >
                  Save Changes
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirm Dialog */}
      <Dialog open={showDeleteConfirm} onOpenChange={(open) => {
        setShowDeleteConfirm(open);
        if (!open) setPlanToDelete(null);
      }}>
        <DialogContent className="bg-slate-900 border-slate-800 text-slate-100">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-slate-100 flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-red-400" />
              Delete Meal Plans
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <p className="text-slate-300">
              {planToDelete 
                ? "Are you sure you want to delete this meal plan?"
                : `Are you sure you want to delete all ${mealPlans.length} meal plans? This will reset everything and you can start fresh.`
              }
            </p>
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setPlanToDelete(null);
                }}
                className="flex-1 border-slate-700 text-slate-300"
              >
                Cancel
              </Button>
              <Button
                onClick={planToDelete ? confirmDeletePlan : handleDeleteAllPlans}
                className="flex-1 bg-red-600 hover:bg-red-700"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Grocery List Dialog */}
      <Dialog open={showGroceryList} onOpenChange={setShowGroceryList}>
        <DialogContent className="max-w-4xl bg-slate-900 border-slate-800 text-slate-100 max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-slate-100 flex items-center gap-2">
              <ShoppingCart className="w-6 h-6 text-emerald-400" />
              Grocery List
            </DialogTitle>
          </DialogHeader>
          
          {groceryList && (
            <div className="space-y-6 mt-4">
              <div className="flex items-center justify-between p-4 bg-emerald-950/30 rounded-xl border border-emerald-900/30">
                <div>
                  <p className="text-sm text-emerald-300">Total Estimated Cost</p>
                  <p className="text-3xl font-bold text-emerald-400">
                    ${groceryList.total_estimated_cost?.toFixed(2)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-slate-400">Items</p>
                  <p className="text-2xl font-bold text-slate-100">{groceryList.items?.length}</p>
                </div>
              </div>

              {['produce', 'protein', 'dairy', 'grains', 'pantry', 'spices', 'other'].map(category => {
                const categoryItems = groceryList.items?.filter(item => item.category === category) || [];
                if (categoryItems.length === 0) return null;

                return (
                  <div key={category} className="space-y-3">
                    <h3 className="text-lg font-bold text-slate-100 capitalize flex items-center gap-2">
                      <ListChecks className="w-5 h-5 text-emerald-400" />
                      {category}
                    </h3>
                    <div className="space-y-2">
                      {categoryItems.map((item, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between p-3 bg-slate-800/50 rounded-xl border border-slate-700/50 hover:border-slate-600 transition-all"
                        >
                          <div className="flex items-center gap-3 flex-1">
                            <Checkbox
                              checked={item.purchased}
                              onCheckedChange={() => handleToggleGroceryItem(groceryList.items.indexOf(item))}
                              className="border-slate-600"
                            />
                            <div className="flex-1">
                              <p className={cn(
                                "font-medium",
                                item.purchased ? "line-through text-slate-500" : "text-slate-200"
                              )}>
                                {item.item_name}
                              </p>
                              <p className="text-sm text-slate-400">{item.quantity}</p>
                            </div>
                          </div>
                          <p className="text-emerald-400 font-semibold">${item.estimated_cost?.toFixed(2)}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Active Plan - Show ALL days */}
      {activePlan ? (
        <div className="space-y-6">
          <Card className="p-6 bg-gradient-to-br from-emerald-600 via-teal-600 to-emerald-700 text-white border-none shadow-xl">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <ChefHat className="w-6 h-6" />
                  <Badge className="bg-emerald-900/30 text-white border-emerald-400/30">Active Plan</Badge>
                </div>
                <h2 className="text-2xl font-bold mb-2">
                  Your {activePlan.daily_plans?.length}-Day Complete Meal Plan
                </h2>
                <p className="text-emerald-100 text-sm mb-2">
                  {format(new Date(activePlan.week_start_date), 'MMM d, yyyy')} - {format(new Date(activePlan.week_end_date), 'MMM d, yyyy')}
                </p>
                <p className="text-emerald-300 text-sm font-semibold">
                  📅 Showing all {activePlan.daily_plans?.length} days below
                </p>
                {activePlan.ai_notes && (
                  <p className="text-white/90 text-sm bg-emerald-900/30 p-4 rounded-xl backdrop-blur-sm border border-emerald-400/30 mt-4">
                    {activePlan.ai_notes}
                  </p>
                )}
              </div>
              <div className="bg-emerald-900/30 backdrop-blur-sm p-6 rounded-2xl text-center border border-emerald-400/30">
                <p className="text-emerald-100 text-sm mb-1">Avg Daily</p>
                <p className="text-3xl font-bold">{Math.round(activePlan.total_weekly_calories / (activePlan.daily_plans?.length || 7))}</p>
                <p className="text-emerald-100 text-xs">calories</p>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <Button
                onClick={() => setShowGroceryList(true)}
                className="bg-white/20 hover:bg-white/30 text-white border border-white/30"
              >
                <ShoppingCart className="w-4 h-4 mr-2" />
                View Grocery List
              </Button>
            </div>
          </Card>

          {tracking.length > 0 && (
            <Card className="p-6 bg-slate-900/50 backdrop-blur-sm border-slate-800/50 shadow-xl">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-emerald-400" />
                  Consistency Tracking
                </h3>
                <Badge className="bg-emerald-600 text-white">
                  {Math.round((tracking.filter(t => t.breakfast_completed && t.lunch_completed && t.dinner_completed).length / tracking.length) * 100)}% adherence
                </Badge>
              </div>
              <div className="grid grid-cols-7 gap-2">
                {tracking.slice(0, 7).map((day, idx) => {
                  const completed = day.breakfast_completed && day.lunch_completed && day.dinner_completed;
                  return (
                    <div
                      key={idx}
                      className={cn(
                        "p-3 rounded-lg text-center border",
                        completed
                          ? "bg-emerald-950/30 border-emerald-900/30"
                          : "bg-slate-800/50 border-slate-700"
                      )}
                    >
                      <p className="text-xs text-slate-400">{day.day_name?.split(' ')[1] || `Day ${idx + 1}`}</p>
                      {completed && <CheckCircle2 className="w-5 h-5 text-emerald-400 mx-auto mt-2" />}
                    </div>
                  );
                })}
              </div>
            </Card>
          )}

          <div className="bg-blue-950/20 border border-blue-900/30 rounded-xl p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-blue-300">
                Complete {activePlan.daily_plans?.length}-Day View
              </p>
              <p className="text-xs text-blue-400 mt-1">
                Every single day from Day 1 through Day {activePlan.daily_plans?.length} is displayed below. Scroll to see all days.
              </p>
            </div>
          </div>

          <div className="space-y-6">
            {activePlan.daily_plans?.map((dayPlan, idx) => (
              <Card key={idx} className="border-slate-800/50 bg-slate-900/50 backdrop-blur-sm shadow-lg p-6">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg">
                    <Calendar className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-slate-100">{dayPlan.day}</h3>
                    <p className="text-sm text-slate-400">
                      {Math.round((dayPlan.breakfast?.calories || 0) + (dayPlan.lunch?.calories || 0) + (dayPlan.dinner?.calories || 0))} total calories
                    </p>
                  </div>
                </div>

                <div className="grid lg:grid-cols-3 gap-4">
                  <MealCard 
                    meal={dayPlan.breakfast} 
                    icon={Apple} 
                    gradient="from-amber-500 to-orange-500"
                    dayIndex={idx}
                    mealType="breakfast"
                    editable={true}
                    isActivePlan={true}
                  />
                  <MealCard 
                    meal={dayPlan.lunch} 
                    icon={ChefHat} 
                    gradient="from-emerald-500 to-teal-500"
                    dayIndex={idx}
                    mealType="lunch"
                    editable={true}
                    isActivePlan={true}
                  />
                  <MealCard 
                    meal={dayPlan.dinner} 
                    icon={Flame} 
                    gradient="from-purple-500 to-pink-500"
                    dayIndex={idx}
                    mealType="dinner"
                    editable={true}
                    isActivePlan={true}
                  />
                </div>

                {dayPlan.snacks && dayPlan.snacks.length > 0 && (
                  <div className="mt-4 bg-slate-800/50 p-4 rounded-2xl border border-slate-700/50">
                    <p className="font-semibold text-slate-200 mb-3">Snack Options:</p>
                    <div className="grid md:grid-cols-2 gap-3">
                      {dayPlan.snacks.map((snack, i) => (
                        <div key={i} className="flex items-center justify-between bg-slate-900/50 p-3 rounded-xl border border-slate-700/50">
                          <span className="text-sm text-slate-300">{snack.name}</span>
                          <span className="text-sm font-bold text-emerald-400">
                            {Math.round(snack.calories)} cal
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </Card>
            ))}
          </div>
        </div>
      ) : (
        <Card className="p-12 text-center bg-slate-900/50 backdrop-blur-sm border-slate-800/50 shadow-xl">
          <div className="max-w-md mx-auto">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-emerald-500/20 to-teal-500/20 flex items-center justify-center mx-auto mb-6 border border-emerald-500/30">
              <ChefHat className="w-10 h-10 text-emerald-400" />
            </div>
            <h3 className="text-2xl font-bold text-slate-100 mb-3">
              No Active Meal Plan
            </h3>
            <p className="text-slate-400 mb-6">
              {foodLogs.length > 0 
                ? "We've analyzed your eating patterns. Let's create a personalized meal plan that fits your lifestyle!"
                : "Start by logging a few meals, then we'll create a personalized plan based on your habits."}
            </p>
            <Button
              onClick={() => setShowCustomize(true)}
              className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 shadow-lg"
              size="lg"
            >
              <Sparkles className="w-5 h-5 mr-2" />
              Create Your First Plan
            </Button>
          </div>
        </Card>
      )}

      {/* Previous Plans Section */}
      {inactivePlans.length > 0 && (
        <Card className="p-6 bg-slate-900/50 backdrop-blur-sm border-slate-800/50 shadow-xl">
          <h3 className="text-xl font-bold text-slate-100 mb-4">Previous Meal Plans</h3>
          <div className="space-y-3">
            {inactivePlans.map(plan => (
              <div key={plan.id} className="flex items-center justify-between p-4 bg-slate-800/50 rounded-xl border border-slate-700/50">
                <div>
                  <p className="font-semibold text-slate-200">
                    {format(new Date(plan.week_start_date), 'MMM d')} - {format(new Date(plan.week_end_date), 'MMM d, yyyy')}
                  </p>
                  <p className="text-sm text-slate-400">{plan.daily_plans?.length} days</p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDeletePlan(plan)}
                  className="text-red-400 hover:text-red-300 hover:bg-red-950/30"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}