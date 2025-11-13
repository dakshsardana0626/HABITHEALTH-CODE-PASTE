import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '../utils';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Sparkles, ChevronRight, ChevronLeft } from 'lucide-react';
import { toast } from 'sonner';

export default function Onboarding() {
  const [user, setUser] = useState(null);
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    age: '',
    gender: '',
    height_cm: '',
    current_weight_kg: '',
    goal_weight_kg: '',
    activity_level: 'moderately_active',
    primary_goal: 'improve_health',
    health_conditions: [],
    dietary_preferences: [],
    favorite_foods: '',
    disliked_foods: '',
  });

  useEffect(() => {
    const loadUser = async () => {
      const currentUser = await base44.auth.me();
      setUser(currentUser);
    };
    loadUser();
  }, []);

  const totalSteps = 4;
  const progressPercent = (step / totalSteps) * 100;

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

  const calculateTargets = () => {
    const weight = parseFloat(formData.current_weight_kg);
    const height = parseFloat(formData.height_cm);
    const age = parseInt(formData.age);
    
    let bmr;
    if (formData.gender === 'male') {
      bmr = 10 * weight + 6.25 * height - 5 * age + 5;
    } else {
      bmr = 10 * weight + 6.25 * height - 5 * age - 161;
    }

    const activityMultipliers = {
      sedentary: 1.2,
      lightly_active: 1.375,
      moderately_active: 1.55,
      very_active: 1.725,
      extremely_active: 1.9
    };

    let tdee = bmr * (activityMultipliers[formData.activity_level] || 1.55);

    if (formData.primary_goal === 'lose_weight') {
      tdee -= 500;
    } else if (formData.primary_goal === 'gain_muscle') {
      tdee += 300;
    }

    const protein = Math.round((tdee * 0.3) / 4);
    const carbs = Math.round((tdee * 0.4) / 4);
    const fat = Math.round((tdee * 0.3) / 9);

    return {
      daily_calorie_target: Math.round(tdee),
      protein_target_g: protein,
      carbs_target_g: carbs,
      fat_target_g: fat
    };
  };

  const handleComplete = async () => {
    try {
      const targets = calculateTargets();
      
      const profileData = {
        ...formData,
        age: parseInt(formData.age),
        height_cm: parseFloat(formData.height_cm),
        current_weight_kg: parseFloat(formData.current_weight_kg),
        goal_weight_kg: parseFloat(formData.goal_weight_kg),
        favorite_foods: formData.favorite_foods.split(',').map(f => f.trim()).filter(Boolean),
        disliked_foods: formData.disliked_foods.split(',').map(f => f.trim()).filter(Boolean),
        ...targets,
        onboarding_completed: true,
        current_streak: 0,
        total_points: 0
      };

      await base44.entities.UserProfile.create(profileData);
      
      toast.success('Welcome to HabitLoop Health! 🎉');
      window.location.href = createPageUrl('Home');
    } catch (error) {
      toast.error('Error completing onboarding');
      console.error(error);
    }
  };

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-slate-100 mb-2">Let's Get Started</h2>
              <p className="text-slate-400">Tell us about yourself</p>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <Label className="text-slate-300">Age</Label>
                <Input
                  type="number"
                  value={formData.age}
                  onChange={(e) => handleInputChange('age', e.target.value)}
                  placeholder="25"
                  className="mt-2 bg-slate-800/50 border-slate-700 text-slate-100"
                />
              </div>
              <div>
                <Label className="text-slate-300">Gender</Label>
                <Select value={formData.gender} onValueChange={(value) => handleInputChange('gender', value)}>
                  <SelectTrigger className="mt-2 bg-slate-800/50 border-slate-700 text-slate-100">
                    <SelectValue placeholder="Select gender" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                    <SelectItem value="prefer_not_to_say">Prefer not to say</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-slate-300">Height (cm)</Label>
                <Input
                  type="number"
                  value={formData.height_cm}
                  onChange={(e) => handleInputChange('height_cm', e.target.value)}
                  placeholder="170"
                  className="mt-2 bg-slate-800/50 border-slate-700 text-slate-100"
                />
              </div>
              <div>
                <Label className="text-slate-300">Current Weight (kg)</Label>
                <Input
                  type="number"
                  value={formData.current_weight_kg}
                  onChange={(e) => handleInputChange('current_weight_kg', e.target.value)}
                  placeholder="70"
                  className="mt-2 bg-slate-800/50 border-slate-700 text-slate-100"
                />
              </div>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-slate-100 mb-2">Your Goals</h2>
              <p className="text-slate-400">What would you like to achieve?</p>
            </div>

            <div>
              <Label className="text-slate-300">Goal Weight (kg)</Label>
              <Input
                type="number"
                value={formData.goal_weight_kg}
                onChange={(e) => handleInputChange('goal_weight_kg', e.target.value)}
                placeholder="65"
                className="mt-2 bg-slate-800/50 border-slate-700 text-slate-100"
              />
            </div>

            <div>
              <Label className="text-slate-300">Primary Goal</Label>
              <Select value={formData.primary_goal} onValueChange={(value) => handleInputChange('primary_goal', value)}>
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
              <Label className="text-slate-300">Activity Level</Label>
              <Select value={formData.activity_level} onValueChange={(value) => handleInputChange('activity_level', value)}>
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
        );

      case 3:
        const healthConditions = ['Diabetes', 'Hypertension', 'PCOS', 'High Cholesterol', 'Heart Disease', 'Thyroid Issues'];
        const dietaryPrefs = ['Vegetarian', 'Vegan', 'Gluten-Free', 'Dairy-Free', 'Keto', 'Low-Carb', 'Halal', 'Kosher'];

        return (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-slate-100 mb-2">Health & Preferences</h2>
              <p className="text-slate-400">Help us personalize your experience</p>
            </div>

            <div>
              <Label className="mb-3 block text-slate-300">Health Conditions (select all that apply)</Label>
              <div className="grid grid-cols-2 gap-3">
                {healthConditions.map(condition => (
                  <Button
                    key={condition}
                    type="button"
                    variant={formData.health_conditions?.includes(condition) ? 'default' : 'outline'}
                    onClick={() => handleArrayToggle('health_conditions', condition)}
                    className="justify-start"
                  >
                    {condition}
                  </Button>
                ))}
              </div>
            </div>

            <div>
              <Label className="mb-3 block text-slate-300">Dietary Preferences</Label>
              <div className="grid grid-cols-2 gap-3">
                {dietaryPrefs.map(pref => (
                  <Button
                    key={pref}
                    type="button"
                    variant={formData.dietary_preferences?.includes(pref) ? 'default' : 'outline'}
                    onClick={() => handleArrayToggle('dietary_preferences', pref)}
                    className="justify-start"
                  >
                    {pref}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-slate-100 mb-2">Food Preferences</h2>
              <p className="text-slate-400">We'll use this to create personalized meal plans</p>
            </div>

            <div>
              <Label className="text-slate-300">Favorite Foods</Label>
              <Textarea
                value={formData.favorite_foods}
                onChange={(e) => handleInputChange('favorite_foods', e.target.value)}
                placeholder="e.g., chicken, rice, broccoli, salmon, eggs (comma-separated)"
                className="mt-2 h-24 bg-slate-800/50 border-slate-700 text-slate-100"
              />
              <p className="text-xs text-slate-400 mt-2">List foods you love and eat regularly</p>
            </div>

            <div>
              <Label className="text-slate-300">Foods to Avoid</Label>
              <Textarea
                value={formData.disliked_foods}
                onChange={(e) => handleInputChange('disliked_foods', e.target.value)}
                placeholder="e.g., mushrooms, olives, cilantro (comma-separated)"
                className="mt-2 h-24 bg-slate-800/50 border-slate-700 text-slate-100"
              />
              <p className="text-xs text-slate-400 mt-2">Foods you dislike or want to avoid</p>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-950 flex items-center justify-center p-4">
      <Card className="max-w-2xl w-full p-8 shadow-2xl bg-slate-900/80 backdrop-blur-sm border-slate-800">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center shadow-lg">
            <Sparkles className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-100">HabitLoop Health</h1>
            <p className="text-sm text-slate-400">Step {step} of {totalSteps}</p>
          </div>
        </div>

        {/* Progress Bar */}
        <Progress value={progressPercent} className="h-2 mb-8" />

        {/* Step Content */}
        {renderStep()}

        {/* Navigation */}
        <div className="flex justify-between mt-8 pt-6 border-t border-slate-800">
          <Button
            variant="outline"
            onClick={() => setStep(step - 1)}
            disabled={step === 1}
            className="border-slate-700 text-slate-300"
          >
            <ChevronLeft className="w-4 h-4 mr-2" />
            Back
          </Button>

          {step < totalSteps ? (
            <Button
              onClick={() => setStep(step + 1)}
              className="bg-emerald-600 hover:bg-emerald-700"
              disabled={
                (step === 1 && (!formData.age || !formData.gender || !formData.height_cm || !formData.current_weight_kg)) ||
                (step === 2 && !formData.goal_weight_kg)
              }
            >
              Continue
              <ChevronRight className="w-4 h-4 ml-2" />
            </Button>
          ) : (
            <Button
              onClick={handleComplete}
              className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700"
            >
              Complete Setup
              <Sparkles className="w-4 h-4 ml-2" />
            </Button>
          )}
        </div>
      </Card>
    </div>
  );
}