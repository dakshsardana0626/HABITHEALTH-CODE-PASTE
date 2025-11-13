import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Dumbbell, Sparkles, Zap, Clock, Target, 
  CheckCircle2, Play, Trophy, ChevronRight
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export default function Workouts() {
  const [user, setUser] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedDay, setSelectedDay] = useState(null);
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

  const { data: workoutPlans = [] } = useQuery({
    queryKey: ['workoutPlans', user?.email],
    queryFn: async () => {
      const plans = await base44.entities.WorkoutPlan.filter({
        created_by: user.email
      }, '-created_date');
      return plans || [];
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

  const createPlanMutation = useMutation({
    mutationFn: (planData) => base44.entities.WorkoutPlan.create(planData),
    onSuccess: async (newPlan) => {
      const otherPlans = workoutPlans.filter(p => p.is_active);
      for (const plan of otherPlans) {
        await base44.entities.WorkoutPlan.update(plan.id, { is_active: false });
      }
      
      queryClient.invalidateQueries(['workoutPlans']);
      queryClient.invalidateQueries(['activeWorkout']);
      toast.success('Workout plan generated! 💪');
    },
  });

  const handleGeneratePlan = async () => {
    if (!profile) {
      toast.error('Profile not found');
      return;
    }

    setIsGenerating(true);
    try {
      const prompt = `Create a personalized workout plan for a user with these details:

**Profile:**
- Primary goal: ${profile.primary_goal}
- Activity level: ${profile.activity_level}
- Age: ${profile.age}
- Health conditions: ${profile.health_conditions?.join(', ') || 'None'}

Create a 4-week workout plan with 4-5 workouts per week that:
1. Aligns with their fitness goal and current activity level
2. Considers their age and any health conditions
3. Includes progressive overload
4. Provides variety (strength, cardio, flexibility)
5. Can be done with minimal equipment (bodyweight, dumbbells, resistance bands)

For each workout day, provide:
- Day name (e.g., "Monday", "Tuesday")
- Workout type (e.g., "Upper Body Strength", "Cardio", "Full Body")
- Duration in minutes
- List of exercises with sets, reps, and rest periods
- Brief notes on form or modifications
- Estimated calories burned

Also include a brief explanation of why this plan fits their goals.`;

      const result = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: 'object',
          properties: {
            plan_name: { type: 'string' },
            fitness_level: { 
              type: 'string',
              enum: ['beginner', 'intermediate', 'advanced']
            },
            weekly_schedule: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  day: { type: 'string' },
                  workout_type: { type: 'string' },
                  duration_min: { type: 'integer' },
                  exercises: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        name: { type: 'string' },
                        sets: { type: 'integer' },
                        reps: { type: 'string' },
                        rest_sec: { type: 'integer' },
                        notes: { type: 'string' }
                      }
                    }
                  },
                  calories_burned_estimate: { type: 'number' }
                }
              }
            },
            ai_rationale: { type: 'string' }
          }
        }
      });

      const planData = {
        ...result,
        goal: profile.primary_goal === 'lose_weight' ? 'fat_loss' : 
              profile.primary_goal === 'gain_muscle' ? 'muscle_gain' : 'general_fitness',
        equipment_available: ['bodyweight', 'dumbbells', 'resistance bands'],
        weeks_duration: 4,
        is_active: true
      };

      await createPlanMutation.mutateAsync(planData);
    } catch (error) {
      toast.error('Error generating workout plan');
      console.error(error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCompleteWorkout = async () => {
    const today = format(new Date(), 'yyyy-MM-dd');
    
    if (todayProgress) {
      await base44.entities.DailyProgress.update(todayProgress.id, {
        workout_completed: true
      });
    } else {
      await base44.entities.DailyProgress.create({
        date: today,
        workout_completed: true
      });
    }

    if (profile) {
      await base44.entities.UserProfile.update(profile.id, {
        total_points: profile.total_points + 20
      });
    }

    queryClient.invalidateQueries(['todayProgress']);
    toast.success('Workout completed! +20 points 🎉');
  };

  const activePlan = workoutPlans.find(p => p.is_active);
  const todayDay = format(new Date(), 'EEEE');
  const todayWorkout = activePlan?.weekly_schedule?.find(w => w.day === todayDay);

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-800 mb-2">Workout Plans</h1>
          <p className="text-slate-600">AI-generated routines for your goals</p>
        </div>
        <Button
          onClick={handleGeneratePlan}
          disabled={isGenerating}
          className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 shadow-lg"
        >
          {isGenerating ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2" />
              Generating...
            </>
          ) : (
            <>
              <Sparkles className="w-5 h-5 mr-2" />
              Generate New Plan
            </>
          )}
        </Button>
      </div>

      {activePlan ? (
        <div className="space-y-6">
          {/* Plan Header */}
          <Card className="p-6 bg-gradient-to-br from-purple-500 to-pink-500 text-white border-none shadow-xl">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Dumbbell className="w-6 h-6" />
                  <Badge className="bg-white/20 text-white border-white/30">Active Plan</Badge>
                </div>
                <h2 className="text-2xl font-bold mb-2">{activePlan.plan_name}</h2>
                <div className="flex items-center gap-4 text-purple-100">
                  <div className="flex items-center gap-2">
                    <Target className="w-4 h-4" />
                    <span className="text-sm capitalize">{activePlan.goal.replace('_', ' ')}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Trophy className="w-4 h-4" />
                    <span className="text-sm capitalize">{activePlan.fitness_level}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    <span className="text-sm">{activePlan.weeks_duration} weeks</span>
                  </div>
                </div>
                {activePlan.ai_rationale && (
                  <p className="text-white/90 text-sm mt-4 bg-white/10 p-4 rounded-xl backdrop-blur-sm">
                    {activePlan.ai_rationale}
                  </p>
                )}
              </div>
            </div>
          </Card>

          {/* Today's Workout */}
          {todayWorkout && (
            <Card className="p-6 bg-white border-none shadow-xl">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <Badge className="bg-purple-100 text-purple-700 mb-3">Today's Workout</Badge>
                  <h3 className="text-2xl font-bold text-slate-800">{todayWorkout.workout_type}</h3>
                  <div className="flex items-center gap-4 mt-2 text-slate-600">
                    <div className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      <span className="text-sm">{todayWorkout.duration_min} minutes</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Zap className="w-4 h-4" />
                      <span className="text-sm">~{Math.round(todayWorkout.calories_burned_estimate)} calories</span>
                    </div>
                  </div>
                </div>
                {!todayProgress?.workout_completed && (
                  <Button
                    onClick={handleCompleteWorkout}
                    className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
                  >
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                    Mark Complete
                  </Button>
                )}
                {todayProgress?.workout_completed && (
                  <div className="flex items-center gap-2 text-green-600 bg-green-50 px-4 py-2 rounded-xl">
                    <CheckCircle2 className="w-5 h-5" />
                    <span className="font-semibold">Completed!</span>
                  </div>
                )}
              </div>

              <div className="space-y-3">
                {todayWorkout.exercises?.map((exercise, idx) => (
                  <div key={idx} className="bg-slate-50 p-4 rounded-2xl hover:bg-slate-100 transition-colors">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h4 className="font-bold text-slate-800">{exercise.name}</h4>
                        {exercise.notes && (
                          <p className="text-xs text-slate-500 mt-1">{exercise.notes}</p>
                        )}
                      </div>
                      <Badge variant="outline" className="ml-2">
                        {idx + 1}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-slate-600">
                      <span className="font-medium">{exercise.sets} sets</span>
                      <span>×</span>
                      <span className="font-medium">{exercise.reps} reps</span>
                      <span>•</span>
                      <span>{exercise.rest_sec}s rest</span>
                    </div>
                  </div>
                ))}
              </div>

              <Button className="w-full mt-6 bg-purple-600 hover:bg-purple-700" size="lg">
                <Play className="w-5 h-5 mr-2" />
                Start Workout
              </Button>
            </Card>
          )}

          {/* Weekly Schedule */}
          <Card className="p-6 bg-white border-none shadow-xl">
            <h3 className="text-xl font-bold text-slate-800 mb-4">Weekly Schedule</h3>
            <div className="grid gap-3">
              {activePlan.weekly_schedule?.map((workout, idx) => {
                const isToday = workout.day === todayDay;
                
                return (
                  <button
                    key={idx}
                    onClick={() => setSelectedDay(selectedDay === idx ? null : idx)}
                    className={cn(
                      "p-4 rounded-2xl text-left transition-all",
                      isToday 
                        ? "bg-gradient-to-r from-purple-100 to-pink-100 border-2 border-purple-300"
                        : "bg-slate-50 hover:bg-slate-100"
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "w-10 h-10 rounded-xl flex items-center justify-center",
                          isToday 
                            ? "bg-gradient-to-br from-purple-500 to-pink-500 text-white"
                            : "bg-white text-slate-600"
                        )}>
                          <Dumbbell className="w-5 h-5" />
                        </div>
                        <div>
                          <p className={cn(
                            "font-bold",
                            isToday ? "text-purple-800" : "text-slate-800"
                          )}>
                            {workout.day}
                            {isToday && <span className="ml-2 text-purple-600 text-sm">• Today</span>}
                          </p>
                          <p className="text-sm text-slate-600">{workout.workout_type}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <p className="text-sm text-slate-500">{workout.duration_min} min</p>
                          <p className="text-xs text-slate-400">{workout.exercises?.length} exercises</p>
                        </div>
                        <ChevronRight className={cn(
                          "w-5 h-5 transition-transform",
                          selectedDay === idx && "rotate-90",
                          isToday ? "text-purple-600" : "text-slate-400"
                        )} />
                      </div>
                    </div>

                    {selectedDay === idx && (
                      <div className="mt-4 pt-4 border-t space-y-2">
                        {workout.exercises?.map((ex, i) => (
                          <div key={i} className="flex items-center justify-between text-sm">
                            <span className="text-slate-700">{ex.name}</span>
                            <span className="text-slate-500">{ex.sets} × {ex.reps}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </Card>
        </div>
      ) : (
        <Card className="p-12 text-center bg-white/80 backdrop-blur-sm border-none shadow-xl">
          <div className="max-w-md mx-auto">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-purple-100 to-pink-100 flex items-center justify-center mx-auto mb-6">
              <Dumbbell className="w-10 h-10 text-purple-600" />
            </div>
            <h3 className="text-2xl font-bold text-slate-800 mb-3">
              No Workout Plan Yet
            </h3>
            <p className="text-slate-600 mb-6">
              Let's create a personalized workout plan tailored to your fitness level and goals!
            </p>
            <Button
              onClick={handleGeneratePlan}
              disabled={isGenerating}
              className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 shadow-lg"
              size="lg"
            >
              <Sparkles className="w-5 h-5 mr-2" />
              Generate Workout Plan
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}