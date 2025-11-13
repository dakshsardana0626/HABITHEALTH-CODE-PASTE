
import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from './utils';
import { Home, Camera, UtensilsCrossed, Dumbbell, Bot, User } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function Layout({ children, currentPageName }) {
  const navItems = [
    { name: 'Home', page: 'Home', icon: Home },
    { name: 'Food Log', page: 'FoodLog', icon: Camera },
    { name: 'Meal Plans', page: 'MealPlans', icon: UtensilsCrossed },
    { name: 'Workouts', page: 'Workouts', icon: Dumbbell },
    { name: 'AI Coach', page: 'AICoach', icon: Bot },
    { name: 'Profile', page: 'Profile', icon: User },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-950">
      <style>{`
        :root {
          --primary: 16 185 129;
          --primary-dark: 5 150 105;
          --secondary: 20 184 166;
          --accent: 139 92 246;
          --background: 2 6 23;
          --foreground: 248 250 252;
        }
      `}</style>
      
      {/* Header */}
      <header className="bg-slate-900/80 backdrop-blur-xl border-b border-emerald-900/30 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <Link to={createPageUrl('Home')} className="flex items-center gap-3 group">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/30 group-hover:shadow-emerald-500/50 transition-all duration-300">
                <span className="text-white font-bold text-xl">H</span>
              </div>
              <div>
                <h1 className="text-xl font-bold bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">
                  HabitLoop Health
                </h1>
                <p className="text-xs text-slate-400">Your AI Health Companion</p>
              </div>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-24">
        {children}
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-slate-900/95 backdrop-blur-xl border-t border-slate-800/50 shadow-2xl shadow-slate-950/50 z-50">
        <div className="max-w-7xl mx-auto px-2">
          <div className="flex justify-around items-center py-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentPageName === item.page;
              
              return (
                <Link
                  key={item.page}
                  to={createPageUrl(item.page)}
                  className={cn(
                    "flex flex-col items-center gap-1 px-3 py-2 rounded-2xl transition-all duration-300",
                    isActive 
                      ? "bg-gradient-to-br from-emerald-500/20 to-teal-500/20 text-emerald-400 border border-emerald-500/30" 
                      : "text-slate-400 hover:text-emerald-400 hover:bg-slate-800/50"
                  )}
                >
                  <Icon className={cn(
                    "w-5 h-5 transition-all duration-300",
                    isActive && "scale-110"
                  )} />
                  <span className="text-xs font-medium">{item.name}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </nav>
    </div>
  );
}
