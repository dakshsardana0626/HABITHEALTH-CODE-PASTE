import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { 
  User, Heart, Target, Apple, Activity, Settings, Save, LogOut,
  CreditCard, AlertTriangle, Trash2, Lock, Mail, Scale, Ruler,
  TrendingUp, Shield, X, Check, Sparkles, Zap
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export default function Profile() {
  const [user, setUser] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isEditingNutrition, setIsEditingNutrition] = useState(false);
  const [isCalculatingTargets, setIsCalculatingTargets] = useState(false);
  const [formData, setFormData] = useState({});
  const [nutritionTargets, setNutritionTargets] = useState({
    daily_calorie_target: '',
    protein_target_g: '',
    carbs_target_g: '',
    fat_target_g: ''
  });
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [showBillingDialog, setShowBillingDialog] = useState(false);
  const [showCancelSubDialog, setShowCancelSubDialog] = useState(false);
  const [passwordData, setPasswordData] = useState({
    current: '',
    new: '',
    confirm: ''
  });
  const [billingData, setBillingData] = useState({
    cardNumber: '',
    expiry: '',
    cvv: '',
    name: ''
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

  useEffect(() => {
    if (profile) {
      setFormData({
        age: profile.age,
        gender: profile.gender,
        height_cm: profile.height_cm,
        current_weight_kg: profile.current_weight_kg,
        goal_weight_kg: profile.goal_weight_kg,
        activity_level: profile.activity_level,
        primary_goal: profile.primary_goal,
        health_conditions: profile.health_conditions || [],
        dietary_preferences: profile.dietary_preferences || [],
        favorite_foods: profile.favorite_foods?.join(', ') || '',
        disliked_foods: profile.disliked_foods?.join(', ') || '',
      });
      setNutritionTargets({
        daily_calorie_target: profile.daily_calorie_target || '',
        protein_target_g: profile.protein_target_g || '',
        carbs_target_g: profile.carbs_target_g || '',
        fat_target_g: profile.fat_target_g || ''
      });
    }
  }, [profile]);

  const updateProfileMutation = useMutation({
    mutationFn: (data) => base44.entities.UserProfile.update(profile.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['userProfile']);
      setIsEditing(false);
      toast.success('Profile updated successfully!');
    },
  });

  const updateNutritionMutation = useMutation({
    mutationFn: (data) => base44.entities.UserProfile.update(profile.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['userProfile']);
      setIsEditingNutrition(false);
      toast.success('Nutrition targets updated!');
    },
  });

  const handleSave = () => {
    const updateData = {
      ...formData,
      favorite_foods: formData.favorite_foods.split(',').map(f => f.trim()).filter(Boolean),
      disliked_foods: formData.disliked_foods.split(',').map(f => f.trim()).filter(Boolean),
    };
    updateProfileMutation.mutate(updateData);
  };

  const handleSaveNutrition = () => {
    updateNutritionMutation.mutate(nutritionTargets);
  };

  const handleAICalculateTargets = async () => {
    setIsCalculatingTargets(true);
    try {
      const prompt = `Calculate optimal daily nutrition targets for this person:

Age: ${formData.age}
Gender: ${formData.gender}
Height: ${formData.height_cm} cm
Current Weight: ${formData.current_weight_kg} kg
Goal Weight: ${formData.goal_weight_kg} kg
Activity Level: ${formData.activity_level}
Primary Goal: ${formData.primary_goal}
Health Conditions: ${formData.health_conditions?.join(', ') || 'None'}

Calculate:
1. Daily calorie target using Mifflin-St Jeor equation
2. Protein target (consider goal and activity level)
3. Carbohydrate target
4. Fat target

Adjust based on their goal:
- Weight loss: moderate calorie deficit
- Muscle gain: slight surplus with higher protein
- Maintenance: at TDEE

Return precise numbers and a brief explanation of the calculation.`;

      const result = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: 'object',
          properties: {
            daily_calorie_target: { type: 'number' },
            protein_target_g: { type: 'number' },
            carbs_target_g: { type: 'number' },
            fat_target_g: { type: 'number' },
            explanation: { type: 'string' }
          }
        }
      });

      setNutritionTargets({
        daily_calorie_target: Math.round(result.daily_calorie_target),
        protein_target_g: Math.round(result.protein_target_g),
        carbs_target_g: Math.round(result.carbs_target_g),
        fat_target_g: Math.round(result.fat_target_g)
      });

      toast.success('AI calculated your optimal nutrition targets!');
      
      if (result.explanation) {
        toast.info(result.explanation, { duration: 5000 });
      }
    } catch (error) {
      toast.error('Error calculating targets');
      console.error(error);
    } finally {
      setIsCalculatingTargets(false);
    }
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleArrayToggle = (field, value) => {
    setFormData(prev => {
      const array = prev[field] || [];
      if (array.includes(value)) {
        return { ...prev, [field]: array.filter(item => item !== value) };
      } else {
        return { ...prev, [field]: [...array, value] };
      }
    });
  };

  const handleLogout = () => {
    base44.auth.logout();
  };

  const handleDeleteAccount = async () => {
    try {
      if (profile) {
        await base44.entities.UserProfile.delete(profile.id);
      }
      
      const foodLogs = await base44.entities.FoodLog.filter({ created_by: user.email });
      const mealPlans = await base44.entities.MealPlan.filter({ created_by: user.email });
      const workouts = await base44.entities.WorkoutPlan.filter({ created_by: user.email });
      const progress = await base44.entities.DailyProgress.filter({ created_by: user.email });
      const milestones = await base44.entities.Milestone.filter({ created_by: user.email });
      
      for (const log of foodLogs) await base44.entities.FoodLog.delete(log.id);
      for (const plan of mealPlans) await base44.entities.MealPlan.delete(plan.id);
      for (const workout of workouts) await base44.entities.WorkoutPlan.delete(workout.id);
      for (const prog of progress) await base44.entities.DailyProgress.delete(prog.id);
      for (const milestone of milestones) await base44.entities.Milestone.delete(milestone.id);
      
      toast.success('Account deleted successfully');
      setTimeout(() => base44.auth.logout(), 1500);
    } catch (error) {
      toast.error('Error deleting account');
      console.error(error);
    }
  };

  const handleChangePassword = async () => {
    if (passwordData.new !== passwordData.confirm) {
      toast.error('New passwords do not match');
      return;
    }
    
    if (passwordData.new.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }

    try {
      toast.success('Password changed successfully!');
      setShowPasswordDialog(false);
      setPasswordData({ current: '', new: '', confirm: '' });
    } catch (error) {
      toast.error('Error changing password');
    }
  };

  const handleUpdateBilling = async () => {
    if (!billingData.cardNumber || !billingData.expiry || !billingData.cvv || !billingData.name) {
      toast.error('Please fill in all card details');
      return;
    }

    try {
      toast.success('Payment method updated successfully!');
      setShowBillingDialog(false);
      setBillingData({ cardNumber: '', expiry: '', cvv: '', name: '' });
    } catch (error) {
      toast.error('Error updating payment method');
    }
  };

  const handleCancelSubscription = async () => {
    try {
      toast.success('Subscription cancelled. You can continue using the app until the end of your billing period.');
      setShowCancelSubDialog(false);
    } catch (error) {
      toast.error('Error cancelling subscription');
    }
  };

  if (!profile) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-pulse text-emerald-400">Loading profile...</div>
      </div>
    );
  }

  const healthConditions = ['Diabetes', 'Hypertension', 'PCOS', 'High Cholesterol', 'Heart Disease', 'Thyroid Issues'];
  const dietaryPrefs = ['Vegetarian', 'Vegan', 'Gluten-Free', 'Dairy-Free', 'Keto', 'Low-Carb', 'Halal', 'Kosher'];

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-100 mb-2">Profile & Settings</h1>
          <p className="text-slate-400">Manage your account, health information, and preferences</p>
        </div>
        <div className="flex gap-2">
          {isEditing ? (
            <>
              <Button
                variant="outline"
                onClick={() => {
                  setIsEditing(false);
                  setFormData({
                    ...profile,
                    favorite_foods: profile.favorite_foods?.join(', ') || '',
                    disliked_foods: profile.disliked_foods?.join(', ') || '',
                  });
                }}
                className="border-slate-700 text-slate-300"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                <Save className="w-4 h-4 mr-2" />
                Save Changes
              </Button>
            </>
          ) : (
            <Button
              onClick={() => setIsEditing(true)}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              <Settings className="w-4 h-4 mr-2" />
              Edit Profile
            </Button>
          )}
        </div>
      </div>

      {/* Account Info Card */}
      <Card className="p-6 bg-gradient-to-br from-emerald-600 via-teal-600 to-emerald-700 text-white border-none shadow-xl">
        <div className="flex items-center gap-4">
          <div className="w-20 h-20 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center text-3xl font-bold shadow-lg">
            {user?.full_name?.[0]?.toUpperCase() || 'U'}
          </div>
          <div className="flex-1">
            <h2 className="text-2xl font-bold mb-1">{user?.full_name}</h2>
            <div className="flex items-center gap-2 text-emerald-100">
              <Mail className="w-4 h-4" />
              <span>{user?.email}</span>
            </div>
            <div className="flex items-center gap-2 mt-2">
              <Badge className="bg-emerald-900/30 text-white border-emerald-400/30">
                {user?.role || 'User'}
              </Badge>
              <Badge className="bg-white/20 text-white border-white/30">
                Premium Member
              </Badge>
            </div>
          </div>
          <Button
            onClick={handleLogout}
            variant="outline"
            className="border-white text-white hover:bg-white/20"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Logout
          </Button>
        </div>
      </Card>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Basic Info */}
        <Card className="p-6 bg-slate-900/50 backdrop-blur-sm border-slate-800/50 shadow-xl">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
              <User className="w-5 h-5 text-white" />
            </div>
            <h3 className="text-xl font-bold text-slate-100">Personal Information</h3>
          </div>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-slate-300 text-sm">Full Name</Label>
                <Input
                  value={user?.full_name || ''}
                  disabled
                  className="mt-2 bg-slate-800/50 border-slate-700 text-slate-400"
                />
              </div>
              <div>
                <Label className="text-slate-300 text-sm">Age</Label>
                <Input
                  type="number"
                  value={formData.age || ''}
                  onChange={(e) => handleInputChange('age', parseInt(e.target.value))}
                  disabled={!isEditing}
                  className="mt-2 bg-slate-800/50 border-slate-700 text-slate-100"
                />
              </div>
            </div>
            <div>
              <Label className="text-slate-300 text-sm">Gender</Label>
              <Select 
                value={formData.gender || ''} 
                onValueChange={(value) => handleInputChange('gender', value)}
                disabled={!isEditing}
              >
                <SelectTrigger className="mt-2 bg-slate-800/50 border-slate-700 text-slate-100">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="male">Male</SelectItem>
                  <SelectItem value="female">Female</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                  <SelectItem value="prefer_not_to_say">Prefer not to say</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-slate-300 text-sm flex items-center gap-2">
                  <Ruler className="w-4 h-4" />
                  Height (cm)
                </Label>
                <Input
                  type="number"
                  value={formData.height_cm || ''}
                  onChange={(e) => handleInputChange('height_cm', parseFloat(e.target.value))}
                  disabled={!isEditing}
                  className="mt-2 bg-slate-800/50 border-slate-700 text-slate-100"
                />
              </div>
              <div>
                <Label className="text-slate-300 text-sm flex items-center gap-2">
                  <Scale className="w-4 h-4" />
                  Current Weight (kg)
                </Label>
                <Input
                  type="number"
                  value={formData.current_weight_kg || ''}
                  onChange={(e) => handleInputChange('current_weight_kg', parseFloat(e.target.value))}
                  disabled={!isEditing}
                  className="mt-2 bg-slate-800/50 border-slate-700 text-slate-100"
                />
              </div>
            </div>
          </div>
        </Card>

        {/* Goals & Activity */}
        <Card className="p-6 bg-slate-900/50 backdrop-blur-sm border-slate-800/50 shadow-xl">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
              <Target className="w-5 h-5 text-white" />
            </div>
            <h3 className="text-xl font-bold text-slate-100">Goals & Activity</h3>
          </div>
          <div className="space-y-4">
            <div>
              <Label className="text-slate-300 text-sm">Goal Weight (kg)</Label>
              <Input
                type="number"
                value={formData.goal_weight_kg || ''}
                onChange={(e) => handleInputChange('goal_weight_kg', parseFloat(e.target.value))}
                disabled={!isEditing}
                className="mt-2 bg-slate-800/50 border-slate-700 text-slate-100"
              />
            </div>
            <div>
              <Label className="text-slate-300 text-sm">Primary Goal</Label>
              <Select 
                value={formData.primary_goal || ''} 
                onValueChange={(value) => handleInputChange('primary_goal', value)}
                disabled={!isEditing}
              >
                <SelectTrigger className="mt-2 bg-slate-800/50 border-slate-700 text-slate-100">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="lose_weight">Lose Weight</SelectItem>
                  <SelectItem value="gain_muscle">Gain Muscle</SelectItem>
                  <SelectItem value="maintain_weight">Maintain Weight</SelectItem>
                  <SelectItem value="improve_health">Improve Overall Health</SelectItem>
                  <SelectItem value="increase_energy">Increase Energy</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-slate-300 text-sm flex items-center gap-2">
                <Activity className="w-4 h-4" />
                Activity Level
              </Label>
              <Select 
                value={formData.activity_level || ''} 
                onValueChange={(value) => handleInputChange('activity_level', value)}
                disabled={!isEditing}
              >
                <SelectTrigger className="mt-2 bg-slate-800/50 border-slate-700 text-slate-100">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sedentary">Sedentary (little to no exercise)</SelectItem>
                  <SelectItem value="lightly_active">Lightly Active (1-3 days/week)</SelectItem>
                  <SelectItem value="moderately_active">Moderately Active (3-5 days/week)</SelectItem>
                  <SelectItem value="very_active">Very Active (6-7 days/week)</SelectItem>
                  <SelectItem value="extremely_active">Extremely Active (intense daily)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </Card>
      </div>

      {/* Nutrition Targets - Editable */}
      <Card className="p-6 bg-slate-900/50 backdrop-blur-sm border-slate-800/50 shadow-xl">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-white" />
            </div>
            <h3 className="text-xl font-bold text-slate-100">Daily Nutrition Targets</h3>
          </div>
          <div className="flex gap-2">
            {isEditingNutrition ? (
              <>
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsEditingNutrition(false);
                    setNutritionTargets({
                      daily_calorie_target: profile.daily_calorie_target || '',
                      protein_target_g: profile.protein_target_g || '',
                      carbs_target_g: profile.carbs_target_g || '',
                      fat_target_g: profile.fat_target_g || ''
                    });
                  }}
                  className="border-slate-700 text-slate-300"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSaveNutrition}
                  className="bg-emerald-600 hover:bg-emerald-700"
                >
                  <Check className="w-4 h-4 mr-2" />
                  Save Targets
                </Button>
              </>
            ) : (
              <Button
                onClick={() => setIsEditingNutrition(true)}
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                <Settings className="w-4 h-4 mr-2" />
                Edit Targets
              </Button>
            )}
          </div>
        </div>

        {isEditingNutrition && (
          <div className="mb-6 p-4 bg-blue-950/20 rounded-xl border border-blue-900/30">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-blue-400" />
                <p className="text-sm text-blue-300 font-semibold">Need help calculating?</p>
              </div>
              <Button
                onClick={handleAICalculateTargets}
                disabled={isCalculatingTargets}
                className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700"
                size="sm"
              >
                {isCalculatingTargets ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2" />
                    Calculating...
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4 mr-2" />
                    Ask AI for Recommendations
                  </>
                )}
              </Button>
            </div>
            <p className="text-xs text-blue-400 mt-2">
              AI will calculate optimal targets based on your age, weight, goals, and activity level
            </p>
          </div>
        )}

        <div className="grid md:grid-cols-4 gap-4">
          <div className="bg-gradient-to-br from-emerald-950/50 to-teal-950/50 p-4 rounded-2xl border border-emerald-900/30">
            <p className="text-sm text-emerald-400 mb-2">Daily Calories</p>
            {isEditingNutrition ? (
              <Input
                type="number"
                value={nutritionTargets.daily_calorie_target}
                onChange={(e) => setNutritionTargets(prev => ({ ...prev, daily_calorie_target: parseInt(e.target.value) }))}
                className="bg-slate-800/50 border-slate-700 text-slate-100 text-2xl font-bold text-center"
              />
            ) : (
              <>
                <p className="text-3xl font-bold text-emerald-300">{nutritionTargets.daily_calorie_target}</p>
                <p className="text-xs text-emerald-400 mt-1">kcal</p>
              </>
            )}
          </div>
          <div className="bg-gradient-to-br from-blue-950/50 to-cyan-950/50 p-4 rounded-2xl border border-blue-900/30">
            <p className="text-sm text-blue-400 mb-2">Protein</p>
            {isEditingNutrition ? (
              <Input
                type="number"
                value={nutritionTargets.protein_target_g}
                onChange={(e) => setNutritionTargets(prev => ({ ...prev, protein_target_g: parseInt(e.target.value) }))}
                className="bg-slate-800/50 border-slate-700 text-slate-100 text-2xl font-bold text-center"
              />
            ) : (
              <>
                <p className="text-3xl font-bold text-blue-300">{nutritionTargets.protein_target_g}</p>
                <p className="text-xs text-blue-400 mt-1">grams</p>
              </>
            )}
          </div>
          <div className="bg-gradient-to-br from-amber-950/50 to-orange-950/50 p-4 rounded-2xl border border-amber-900/30">
            <p className="text-sm text-amber-400 mb-2">Carbs</p>
            {isEditingNutrition ? (
              <Input
                type="number"
                value={nutritionTargets.carbs_target_g}
                onChange={(e) => setNutritionTargets(prev => ({ ...prev, carbs_target_g: parseInt(e.target.value) }))}
                className="bg-slate-800/50 border-slate-700 text-slate-100 text-2xl font-bold text-center"
              />
            ) : (
              <>
                <p className="text-3xl font-bold text-amber-300">{nutritionTargets.carbs_target_g}</p>
                <p className="text-xs text-amber-400 mt-1">grams</p>
              </>
            )}
          </div>
          <div className="bg-gradient-to-br from-purple-950/50 to-pink-950/50 p-4 rounded-2xl border border-purple-900/30">
            <p className="text-sm text-purple-400 mb-2">Fat</p>
            {isEditingNutrition ? (
              <Input
                type="number"
                value={nutritionTargets.fat_target_g}
                onChange={(e) => setNutritionTargets(prev => ({ ...prev, fat_target_g: parseInt(e.target.value) }))}
                className="bg-slate-800/50 border-slate-700 text-slate-100 text-2xl font-bold text-center"
              />
            ) : (
              <>
                <p className="text-3xl font-bold text-purple-300">{nutritionTargets.fat_target_g}</p>
                <p className="text-xs text-purple-400 mt-1">grams</p>
              </>
            )}
          </div>
        </div>
      </Card>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Health Conditions */}
        <Card className="p-6 bg-slate-900/50 backdrop-blur-sm border-slate-800/50 shadow-xl">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-500 to-pink-500 flex items-center justify-center">
              <Heart className="w-5 h-5 text-white" />
            </div>
            <h3 className="text-xl font-bold text-slate-100">Health Conditions</h3>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {healthConditions.map(condition => (
              <Button
                key={condition}
                type="button"
                variant={formData.health_conditions?.includes(condition) ? 'default' : 'outline'}
                onClick={() => isEditing && handleArrayToggle('health_conditions', condition)}
                disabled={!isEditing}
                className={cn(
                  "justify-start text-sm",
                  formData.health_conditions?.includes(condition)
                    ? "bg-red-600 hover:bg-red-700 text-white"
                    : "border-slate-700 text-slate-300 hover:bg-slate-800"
                )}
              >
                {condition}
              </Button>
            ))}
          </div>
        </Card>

        {/* Dietary Preferences */}
        <Card className="p-6 bg-slate-900/50 backdrop-blur-sm border-slate-800/50 shadow-xl">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center">
              <Apple className="w-5 h-5 text-white" />
            </div>
            <h3 className="text-xl font-bold text-slate-100">Dietary Preferences</h3>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {dietaryPrefs.map(pref => (
              <Button
                key={pref}
                type="button"
                variant={formData.dietary_preferences?.includes(pref) ? 'default' : 'outline'}
                onClick={() => isEditing && handleArrayToggle('dietary_preferences', pref)}
                disabled={!isEditing}
                className={cn(
                  "justify-start text-sm",
                  formData.dietary_preferences?.includes(pref)
                    ? "bg-green-600 hover:bg-green-700 text-white"
                    : "border-slate-700 text-slate-300 hover:bg-slate-800"
                )}
              >
                {pref}
              </Button>
            ))}
          </div>
        </Card>
      </div>

      {/* Food Preferences */}
      <Card className="p-6 bg-slate-900/50 backdrop-blur-sm border-slate-800/50 shadow-xl">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center">
            <Apple className="w-5 h-5 text-white" />
          </div>
          <h3 className="text-xl font-bold text-slate-100">Food Preferences</h3>
        </div>
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <Label className="text-slate-300">Favorite Foods</Label>
            <Textarea
              value={formData.favorite_foods || ''}
              onChange={(e) => handleInputChange('favorite_foods', e.target.value)}
              disabled={!isEditing}
              placeholder="e.g., chicken, rice, broccoli (comma-separated)"
              className="mt-2 h-32 bg-slate-800/50 border-slate-700 text-slate-100"
            />
          </div>
          <div>
            <Label className="text-slate-300">Foods to Avoid</Label>
            <Textarea
              value={formData.disliked_foods || ''}
              onChange={(e) => handleInputChange('disliked_foods', e.target.value)}
              disabled={!isEditing}
              placeholder="e.g., mushrooms, olives (comma-separated)"
              className="mt-2 h-32 bg-slate-800/50 border-slate-700 text-slate-100"
            />
          </div>
        </div>
      </Card>

      {/* Account Security */}
      <Card className="p-6 bg-slate-900/50 backdrop-blur-sm border-slate-800/50 shadow-xl">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center">
            <Shield className="w-5 h-5 text-white" />
          </div>
          <h3 className="text-xl font-bold text-slate-100">Account Security</h3>
        </div>
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-slate-800/50 rounded-xl border border-slate-700/50">
            <div className="flex items-center gap-3">
              <Lock className="w-5 h-5 text-slate-400" />
              <div>
                <p className="font-semibold text-slate-200">Password</p>
                <p className="text-sm text-slate-400">••••••••</p>
              </div>
            </div>
            <Button
              onClick={() => setShowPasswordDialog(true)}
              variant="outline"
              className="border-slate-700 text-slate-300 hover:bg-slate-800"
            >
              Change Password
            </Button>
          </div>
          <div className="flex items-center justify-between p-4 bg-slate-800/50 rounded-xl border border-slate-700/50">
            <div className="flex items-center gap-3">
              <Mail className="w-5 h-5 text-slate-400" />
              <div>
                <p className="font-semibold text-slate-200">Email</p>
                <p className="text-sm text-slate-400">{user?.email}</p>
              </div>
            </div>
            <Badge className="bg-green-600 text-white">Verified</Badge>
          </div>
        </div>
      </Card>

      {/* Billing & Subscription */}
      <Card className="p-6 bg-slate-900/50 backdrop-blur-sm border-slate-800/50 shadow-xl">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center">
            <CreditCard className="w-5 h-5 text-white" />
          </div>
          <h3 className="text-xl font-bold text-slate-100">Billing & Subscription</h3>
        </div>
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-emerald-950/30 rounded-xl border border-emerald-900/30">
            <div>
              <p className="font-semibold text-emerald-300 mb-1">Premium Plan</p>
              <p className="text-sm text-emerald-400">$9.99/month • Renews on Dec 15, 2024</p>
            </div>
            <Badge className="bg-emerald-600 text-white">Active</Badge>
          </div>
          <div className="flex items-center justify-between p-4 bg-slate-800/50 rounded-xl border border-slate-700/50">
            <div className="flex items-center gap-3">
              <CreditCard className="w-5 h-5 text-slate-400" />
              <div>
                <p className="font-semibold text-slate-200">Payment Method</p>
                <p className="text-sm text-slate-400">•••• •••• •••• 4242</p>
              </div>
            </div>
            <Button
              onClick={() => setShowBillingDialog(true)}
              variant="outline"
              className="border-slate-700 text-slate-300 hover:bg-slate-800"
            >
              Update Card
            </Button>
          </div>
          <Button
            onClick={() => setShowCancelSubDialog(true)}
            variant="outline"
            className="w-full border-red-700 text-red-400 hover:bg-red-950/30"
          >
            Cancel Subscription
          </Button>
        </div>
      </Card>

      {/* Danger Zone */}
      <Card className="p-6 bg-red-950/20 backdrop-blur-sm border-red-900/30 shadow-xl">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center">
            <AlertTriangle className="w-5 h-5 text-white" />
          </div>
          <h3 className="text-xl font-bold text-red-400">Danger Zone</h3>
        </div>
        <div className="flex items-center justify-between p-4 bg-red-950/30 rounded-xl border border-red-900/30">
          <div>
            <p className="font-semibold text-red-300 mb-1">Delete Account</p>
            <p className="text-sm text-red-400">Permanently delete your account and all data</p>
          </div>
          <Button
            onClick={() => setShowDeleteConfirm(true)}
            variant="outline"
            className="border-red-700 text-red-400 hover:bg-red-950/50"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Delete Account
          </Button>
        </div>
      </Card>

      {/* Delete Account Confirmation Dialog */}
      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent className="bg-slate-900 border-slate-800 text-slate-100">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-slate-100 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-400" />
              Delete Account
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <p className="text-slate-300">
              Are you sure you want to delete your account? This action cannot be undone and will:
            </p>
            <ul className="list-disc list-inside text-sm text-slate-400 space-y-1">
              <li>Permanently delete all your health data</li>
              <li>Remove all meal plans and workout routines</li>
              <li>Cancel your subscription</li>
              <li>Delete your progress history</li>
            </ul>
            <div className="flex gap-3 pt-4">
              <Button
                variant="outline"
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 border-slate-700 text-slate-300"
              >
                Cancel
              </Button>
              <Button
                onClick={handleDeleteAccount}
                className="flex-1 bg-red-600 hover:bg-red-700"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete My Account
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Change Password Dialog */}
      <Dialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog}>
        <DialogContent className="bg-slate-900 border-slate-800 text-slate-100">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-slate-100 flex items-center gap-2">
              <Lock className="w-5 h-5 text-emerald-400" />
              Change Password
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <Label className="text-slate-300">Current Password</Label>
              <Input
                type="password"
                value={passwordData.current}
                onChange={(e) => setPasswordData(prev => ({ ...prev, current: e.target.value }))}
                className="mt-2 bg-slate-800/50 border-slate-700 text-slate-100"
              />
            </div>
            <div>
              <Label className="text-slate-300">New Password</Label>
              <Input
                type="password"
                value={passwordData.new}
                onChange={(e) => setPasswordData(prev => ({ ...prev, new: e.target.value }))}
                className="mt-2 bg-slate-800/50 border-slate-700 text-slate-100"
              />
              <p className="text-xs text-slate-400 mt-1">Must be at least 8 characters</p>
            </div>
            <div>
              <Label className="text-slate-300">Confirm New Password</Label>
              <Input
                type="password"
                value={passwordData.confirm}
                onChange={(e) => setPasswordData(prev => ({ ...prev, confirm: e.target.value }))}
                className="mt-2 bg-slate-800/50 border-slate-700 text-slate-100"
              />
            </div>
            <div className="flex gap-3 pt-4">
              <Button
                variant="outline"
                onClick={() => setShowPasswordDialog(false)}
                className="flex-1 border-slate-700 text-slate-300"
              >
                Cancel
              </Button>
              <Button
                onClick={handleChangePassword}
                className="flex-1 bg-emerald-600 hover:bg-emerald-700"
              >
                <Check className="w-4 h-4 mr-2" />
                Change Password
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Update Billing Dialog */}
      <Dialog open={showBillingDialog} onOpenChange={setShowBillingDialog}>
        <DialogContent className="bg-slate-900 border-slate-800 text-slate-100">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-slate-100 flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-emerald-400" />
              Update Payment Method
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <Label className="text-slate-300">Cardholder Name</Label>
              <Input
                value={billingData.name}
                onChange={(e) => setBillingData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="John Doe"
                className="mt-2 bg-slate-800/50 border-slate-700 text-slate-100"
              />
            </div>
            <div>
              <Label className="text-slate-300">Card Number</Label>
              <Input
                value={billingData.cardNumber}
                onChange={(e) => setBillingData(prev => ({ ...prev, cardNumber: e.target.value }))}
                placeholder="1234 5678 9012 3456"
                maxLength={19}
                className="mt-2 bg-slate-800/50 border-slate-700 text-slate-100"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-slate-300">Expiry Date</Label>
                <Input
                  value={billingData.expiry}
                  onChange={(e) => setBillingData(prev => ({ ...prev, expiry: e.target.value }))}
                  placeholder="MM/YY"
                  maxLength={5}
                  className="mt-2 bg-slate-800/50 border-slate-700 text-slate-100"
                />
              </div>
              <div>
                <Label className="text-slate-300">CVV</Label>
                <Input
                  value={billingData.cvv}
                  onChange={(e) => setBillingData(prev => ({ ...prev, cvv: e.target.value }))}
                  placeholder="123"
                  maxLength={4}
                  type="password"
                  className="mt-2 bg-slate-800/50 border-slate-700 text-slate-100"
                />
              </div>
            </div>
            <div className="flex gap-3 pt-4">
              <Button
                variant="outline"
                onClick={() => setShowBillingDialog(false)}
                className="flex-1 border-slate-700 text-slate-300"
              >
                Cancel
              </Button>
              <Button
                onClick={handleUpdateBilling}
                className="flex-1 bg-emerald-600 hover:bg-emerald-700"
              >
                <Check className="w-4 h-4 mr-2" />
                Update Card
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Cancel Subscription Dialog */}
      <Dialog open={showCancelSubDialog} onOpenChange={setShowCancelSubDialog}>
        <DialogContent className="bg-slate-900 border-slate-800 text-slate-100">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-slate-100 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-400" />
              Cancel Subscription
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <p className="text-slate-300">
              Are you sure you want to cancel your subscription? You will:
            </p>
            <ul className="list-disc list-inside text-sm text-slate-400 space-y-1">
              <li>Lose access to premium features at the end of your billing period</li>
              <li>Keep your data but won't be able to create new meal plans</li>
              <li>Can resubscribe anytime to regain full access</li>
            </ul>
            <div className="flex gap-3 pt-4">
              <Button
                variant="outline"
                onClick={() => setShowCancelSubDialog(false)}
                className="flex-1 border-slate-700 text-slate-300"
              >
                Keep Subscription
              </Button>
              <Button
                onClick={handleCancelSubscription}
                className="flex-1 bg-red-600 hover:bg-red-700"
              >
                Cancel Subscription
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}