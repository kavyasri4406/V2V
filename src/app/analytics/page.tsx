'use client';

import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { 
  TrendingUp, 
  AlertTriangle, 
  Zap, 
  ShieldCheck, 
  Activity, 
  History,
  Info
} from 'lucide-react';
import { useFirebase } from '@/firebase';
import { ref, onValue, off } from 'firebase/database';
import { cn } from '@/lib/utils';

type EventLog = {
  type: 'Braking' | 'Acceleration' | 'Cornering' | 'Pothole';
  severity: 'Low' | 'Medium' | 'High';
  timestamp: string;
  value: string;
};

export default function AnalyticsPage() {
  const [active, setActive] = useState(false);
  const [score, setScore] = useState(100);
  const [events, setEvents] = useState<EventLog[]>([]);
  const [stats, setStats] = useState({
    harshBraking: 0,
    rapidAccel: 0,
    potholes: 0,
    peakG: 0
  });

  const { database } = useFirebase();
  const lastEventTime = useRef<number>(0);

  useEffect(() => {
    if (!active || !database) return;

    const sensorRef = ref(database, 'car_kit/mpu6050_raw/accelerometer');
    
    const unsubscribe = onValue(sensorRef, (snapshot) => {
      const val = snapshot.val();
      if (!val) return;

      // Convert to m/s2
      const ax = (Number(val.x) / 16384) * 9.81;
      const ay = (Number(val.y) / 16384) * 9.81;
      const az = (Number(val.z) / 16384) * 9.81;

      const totalG = Math.sqrt(ax * ax + ay * ay + az * az) / 9.81;
      setStats(prev => ({ ...prev, peakG: Math.max(prev.peakG, totalG) }));

      const now = Date.now();
      if (now - lastEventTime.current < 2000) return; // Cooldown between event logs

      let newEvent: EventLog | null = null;

      // 1. Detect Harsh Braking (Sudden negative longitudinal acceleration)
      if (ax < -6.0) {
        newEvent = { 
          type: 'Braking', 
          severity: ax < -9.0 ? 'High' : 'Medium', 
          timestamp: new Date().toLocaleTimeString(),
          value: `${(Math.abs(ax) / 9.81).toFixed(2)}G`
        };
        setStats(prev => ({ ...prev, harshBraking: prev.harshBraking + 1 }));
      } 
      // 2. Detect Rapid Acceleration
      else if (ax > 5.0) {
        newEvent = { 
          type: 'Acceleration', 
          severity: ax > 8.0 ? 'High' : 'Medium', 
          timestamp: new Date().toLocaleTimeString(),
          value: `${(ax / 9.81).toFixed(2)}G`
        };
        setStats(prev => ({ ...prev, rapidAccel: prev.rapidAccel + 1 }));
      }
      // 3. Detect Potholes / Vertical Impact
      else if (Math.abs(az - 9.81) > 8.0) {
        newEvent = { 
          type: 'Pothole', 
          severity: 'Medium', 
          timestamp: new Date().toLocaleTimeString(),
          value: 'Impact'
        };
        setStats(prev => ({ ...prev, potholes: prev.potholes + 1 }));
      }

      if (newEvent) {
        setEvents(prev => [newEvent!, ...prev].slice(0, 10));
        setScore(prev => Math.max(0, prev - (newEvent!.severity === 'High' ? 5 : 2)));
        lastEventTime.current = now;
      }
    });

    return () => off(sensorRef);
  }, [active, database]);

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6 pb-12">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-black tracking-tighter uppercase italic flex items-center gap-3">
            <TrendingUp className="h-8 w-8 text-primary" />
            Driving Insights
          </h1>
          <p className="text-muted-foreground text-[10px] font-black uppercase tracking-widest opacity-60">
            Behavioral analysis & safety metrics
          </p>
        </div>
        <Button 
          variant={active ? "destructive" : "default"} 
          onClick={() => setActive(!active)}
          className="font-black uppercase tracking-widest px-8"
        >
          {active ? "Stop Analysis" : "Start Analysis"}
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 overflow-hidden border-none shadow-2xl bg-gradient-to-br from-card to-muted/30">
          <CardHeader>
            <CardTitle className="text-xl font-bold uppercase italic tracking-tighter">Smoothness Score</CardTitle>
            <CardDescription>Based on acceleration stability and G-force peaks.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="relative w-48 h-48 flex items-center justify-center mb-8">
               <svg className="w-full h-full transform -rotate-90">
                 <circle cx="96" cy="96" r="88" fill="none" stroke="currentColor" strokeWidth="12" className="text-muted/20" />
                 <circle 
                   cx="96" cy="96" r="88" fill="none" stroke="currentColor" strokeWidth="12" 
                   strokeDasharray={553} 
                   strokeDashoffset={553 - (score / 100) * 553}
                   className={cn("transition-all duration-1000 ease-out", score > 80 ? "text-primary" : score > 50 ? "text-accent" : "text-destructive")}
                 />
               </svg>
               <div className="absolute inset-0 flex flex-col items-center justify-center">
                 <span className="text-6xl font-black tracking-tighter">{score}</span>
                 <span className="text-[10px] font-bold uppercase tracking-widest opacity-60">Safety Index</span>
               </div>
            </div>
            <div className="w-full max-w-md text-center space-y-2">
                <p className="text-sm font-bold uppercase tracking-widest italic">
                  {score > 90 ? "Excellent Riding" : score > 70 ? "Good Stability" : "Aggressive Behavior"}
                </p>
                <p className="text-xs text-muted-foreground px-8">
                  Keep acceleration and braking smooth to maintain a high safety score and improve vehicle longevity.
                </p>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="bg-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-primary" /> Performance Vitals
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold uppercase text-muted-foreground">Harsh Braking</span>
                <span className="font-black italic">{stats.harshBraking}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold uppercase text-muted-foreground">Rapid Accel</span>
                <span className="font-black italic">{stats.rapidAccel}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold uppercase text-muted-foreground">Potholes Detected</span>
                <span className="font-black italic text-accent">{stats.potholes}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold uppercase text-muted-foreground">Peak Load</span>
                <span className="font-black italic">{stats.peakG.toFixed(2)}G</span>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-destructive/5 border-destructive/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-black uppercase tracking-widest flex items-center gap-2 text-destructive">
                <AlertTriangle className="h-4 w-4" /> Active Hazards
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-[10px] leading-tight text-muted-foreground font-medium">
                Detected events are processed locally. High-severity impacts trigger automatic V2V network alerts.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-lg font-bold uppercase italic tracking-tighter flex items-center gap-2">
              <History className="h-5 w-5 text-primary" /> Event Log
            </CardTitle>
            <CardDescription>Real-time analysis of driving violations.</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {events.length > 0 ? (
              events.map((e, i) => (
                <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border/50 animate-in slide-in-from-left-2 duration-300">
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "p-2 rounded-md",
                      e.type === 'Braking' ? "bg-accent/10 text-accent" : 
                      e.type === 'Pothole' ? "bg-primary/10 text-primary" : "bg-chart-1/10 text-chart-1"
                    )}>
                      <Activity className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-sm font-bold uppercase italic tracking-tighter">Harsh {e.type}</p>
                      <p className="text-[10px] font-medium text-muted-foreground uppercase">{e.timestamp}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={cn(
                      "text-xs font-black uppercase tracking-widest",
                      e.severity === 'High' ? "text-destructive" : "text-accent"
                    )}>
                      {e.severity} Intensity
                    </p>
                    <p className="text-[10px] font-bold text-muted-foreground">{e.value}</p>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-12 space-y-2 opacity-40">
                <Info className="h-8 w-8 mx-auto" />
                <p className="text-xs font-bold uppercase tracking-widest">No violations detected</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
