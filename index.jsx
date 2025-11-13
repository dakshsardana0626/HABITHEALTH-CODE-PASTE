import Layout from "./Layout.jsx";

import Home from "./Home";

import Onboarding from "./Onboarding";

import FoodLog from "./FoodLog";

import MealPlans from "./MealPlans";

import Workouts from "./Workouts";

import AICoach from "./AICoach";

import Progress from "./Progress";

import Profile from "./Profile";

import Marketplace from "./Marketplace";

import { BrowserRouter as Router, Route, Routes, useLocation } from 'react-router-dom';

const PAGES = {
    
    Home: Home,
    
    Onboarding: Onboarding,
    
    FoodLog: FoodLog,
    
    MealPlans: MealPlans,
    
    Workouts: Workouts,
    
    AICoach: AICoach,
    
    Progress: Progress,
    
    Profile: Profile,
    
    Marketplace: Marketplace,
    
}

function _getCurrentPage(url) {
    if (url.endsWith('/')) {
        url = url.slice(0, -1);
    }
    let urlLastPart = url.split('/').pop();
    if (urlLastPart.includes('?')) {
        urlLastPart = urlLastPart.split('?')[0];
    }

    const pageName = Object.keys(PAGES).find(page => page.toLowerCase() === urlLastPart.toLowerCase());
    return pageName || Object.keys(PAGES)[0];
}

// Create a wrapper component that uses useLocation inside the Router context
function PagesContent() {
    const location = useLocation();
    const currentPage = _getCurrentPage(location.pathname);
    
    return (
        <Layout currentPageName={currentPage}>
            <Routes>            
                
                    <Route path="/" element={<Home />} />
                
                
                <Route path="/Home" element={<Home />} />
                
                <Route path="/Onboarding" element={<Onboarding />} />
                
                <Route path="/FoodLog" element={<FoodLog />} />
                
                <Route path="/MealPlans" element={<MealPlans />} />
                
                <Route path="/Workouts" element={<Workouts />} />
                
                <Route path="/AICoach" element={<AICoach />} />
                
                <Route path="/Progress" element={<Progress />} />
                
                <Route path="/Profile" element={<Profile />} />
                
                <Route path="/Marketplace" element={<Marketplace />} />
                
            </Routes>
        </Layout>
    );
}

export default function Pages() {
    return (
        <Router>
            <PagesContent />
        </Router>
    );
}