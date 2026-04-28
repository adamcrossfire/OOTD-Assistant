import { Switch, Route, Router } from 'wouter';
import { useHashLocation } from 'wouter/use-hash-location';
import { queryClient } from './lib/queryClient';
import { QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';

import { AppProvider, useApp } from './store';
import { GenderPicker } from './components/GenderPicker';
import { PhoneShell } from './components/PhoneShell';
import { BottomNav } from './components/BottomNav';
import { Daily } from './pages/Daily';
import { Wardrobe } from './pages/Wardrobe';
import { Travel } from './pages/Travel';
import { Favorites } from './pages/Favorites';
import NotFound from '@/pages/not-found';

function MainShell() {
  return (
    <PhoneShell>
      <Switch>
        <Route path="/" component={Daily} />
        <Route path="/wardrobe" component={Wardrobe} />
        <Route path="/travel" component={Travel} />
        <Route path="/favorites" component={Favorites} />
        <Route component={NotFound} />
      </Switch>
      <BottomNav />
    </PhoneShell>
  );
}

function Gate() {
  const { gender } = useApp();
  if (!gender) {
    return (
      <PhoneShell>
        <GenderPicker />
      </PhoneShell>
    );
  }
  return <MainShell />;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <AppProvider>
          <Router hook={useHashLocation}>
            <Gate />
          </Router>
        </AppProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
