'use client';

import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Activity, ShieldAlert, AlertTriangle, Zap, Info } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useFirebase } from '@/firebase';
import { ref, onValue, off } from 'firebase/database';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { Line, LineChart, XAxis, YAxis, CartesianGrid } from "recharts";
import { cn } from '@/lib/utils';

type AccelPoint = {
  time: string;
  x: number;
  y: number;
  z: number;
  total: number;
};

export default function AccelerometerPage() {
  const [active, setActive] = useState(false);
  const [data, setData] = useState<AccelPoint[]>([]);
  const [current, setCurrent] = useState<AccelPoint>({ time: '', x: 0, y: 0, z: 0, total: 0 });
  const [maxForceValue, setMaxForceValue] = useState(0);
  const { toast } = useToast();
  const { database } = useFirebase();
  const dataRef = useRef<AccelPoint[]>([]);

  const chartConfig = {
    x: { label: "X-Axis", color: "hsl(var(--primary))" },
    y: { label: "Y-Axis", color: "hsl(var(--accent))" },
    z: { label: "Z-Axis", color: "hsl(var(--chart-1))" },
    total: { label: "Magnitude", color: "hsl(var(--foreground))" },
  };

  useEffect(() => {
    if (!active || !database) return;

    const sensorRef = ref(database, 'car_kit/mpu6050_raw/gyroscope');
    
    const handleData = onValue(sensorRef, (snapshot) => {
      const val = snapshot.val();
      if (!val) return;

      const x = Number(val.x) || 0;
      const y = Number(val.y) || 0;
      const z = Number(val.z) || 0;
      
      // Calculate magnitude for the chart
      const total = Math.sqrt(x * x + y * y + z * z);
      const time = new Date().toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });

      const newPoint = { time, x, y, z, total };
      setCurrent(newPoint);
      
      // Update Peak G field using the highest of x, y, z as requested
      const highestAxis = Math.max(Math.abs(x), Math.abs(y), Math.abs(z));
      setMaxForceValue(prev => Math.max(prev, highestAxis));

      dataRef.current = [...dataRef.current, newPoint].slice(-30);
      setData([...dataRef.current]);
    });

    return () => {
      off(sensorRef);
    };
  }, [active, database]);

  const handleStart = () => {
    setActive(true);
    toast({ title: 'RTDB Connected', description: 'Monitoring live sensor data from car_kit.' });
  };

  // UI mapping: 
  // - Current G-force field using the x value
  // - Peak G field using the highest axis value encountered
  const currentGDisplay = current.x.toFixed(0);
  const peakGDisplay = maxForceValue.toFixed(0);

  return (
    <div className="w-full max-w-5xl mx-auto space-y-6 animate-in fade-in duration-150">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">V2V Diagnostics</h1>
          <p className="text-muted-foreground">Real-time RTDB sensor monitoring (car_kit).</p>
        </div>
        <Button 
          variant={active ? "destructive" : "default"} 
          size="lg" 
          onClick={() => active ? setActive(false) : handleStart()}
          className="w-full md:w-auto"
        >
          {active ? <Zap className="mr-2 fill-current" /> : <Activity className="mr-2" />}
          {active ? 'Disconnect' : 'Connect RTDB'}
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle className="text-sm font-medium">Current G-Force (X)</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center py-6">
            <div className={cn(
              "text-6xl font-black mb-2 transition-colors duration-150",
              Math.abs(current.x) > 15000 ? "text-destructive" : "text-primary"
            )}>
              {currentGDisplay}
            </div>
            <div className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Live X-Axis Value</div>
          </CardContent>
        </Card>

        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle className="text-sm font-medium">Peak G Encountered</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center py-6">
            <div className="text-6xl font-black mb-2 text-accent">
              {peakGDisplay}
            </div>
            <div className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Max(X, Y, Z) Recorded</div>
          </CardContent>
        </Card>

        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle className="text-sm font-medium">System Status</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center py-6 gap-2">
            {active ? (
              <div className="flex items-center gap-2 text-green-500 font-bold">
                <ShieldAlert className="animate-pulse" />
                LIVE
              </div>
            ) : (
              <div className="flex items-center gap-2 text-muted-foreground font-bold">
                <AlertTriangle />
                OFFLINE
              </div>
            )}
            <p className="text-[10px] text-center text-muted-foreground mt-2">
              Streaming from car_kit/mpu6050_raw/gyroscope.
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Motion Waveform</CardTitle>
          <CardDescription>Live telemetry from Realtime Database</CardDescription>
        </CardHeader>
        <CardContent className="h-[350px] pt-4">
          {!active ? (
            <div className="h-full w-full border-2 border-dashed rounded-xl flex flex-col items-center justify-center text-muted-foreground gap-2">
              <Info className="h-8 w-8 opacity-20" />
              <p>RTDB is disconnected. Click 'Connect RTDB' above.</p>
            </div>
          ) : (
            <ChartContainer config={chartConfig} className="h-full w-full">
              <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.2} />
                <XAxis 
                  dataKey="time" 
                  axisLine={false} 
                  tickLine={false} 
                  fontSize={10} 
                  interval="preserveStartEnd" 
                />
                <YAxis axisLine={false} tickLine={false} fontSize={10} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Line 
                  type="monotone" 
                  dataKey="x" 
                  stroke="var(--color-x)" 
                  strokeWidth={2} 
                  dot={false} 
                  isAnimationActive={false}
                />
                <Line 
                  type="monotone" 
                  dataKey="y" 
                  stroke="var(--color-y)" 
                  strokeWidth={2} 
                  dot={false} 
                  isAnimationActive={false}
                />
                <Line 
                  type="monotone" 
                  dataKey="z" 
                  stroke="var(--color-z)" 
                  strokeWidth={2} 
                  dot={false} 
                  isAnimationActive={false}
                />
                <Line 
                  type="monotone" 
                  dataKey="total" 
                  stroke="var(--color-total)" 
                  strokeWidth={3} 
                  dot={false} 
                  isAnimationActive={false}
                />
              </LineChart>
            </ChartContainer>
          )}
        </CardContent>
      </Card>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Telemetric Logic</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-4">
            <p>
              This dashboard is connected to the <strong>Firebase Realtime Database</strong>. 
              It bypasses the local hardware accelerometer to provide insights from remote vehicle modules.
            </p>
            <ul className="list-disc pl-5 space-y-2">
              <li><strong>Source:</strong> car_kit/mpu6050_raw/gyroscope</li>
              <li><strong>Updates:</strong> Instant (Sub-100ms latency)</li>
              <li><strong>Scaling:</strong> Raw values directly mapped from hardware.</li>
            </ul>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle className="text-lg text-destructive">Collision Logic</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-4">
            <p>
              Automated collision broadcasts monitor the magnitude of these raw vectors.
            </p>
            <p className="bg-muted p-3 rounded-lg font-mono text-xs">
              IF highest_axis > threshold THEN trigger_V2V_broadcast()
            </p>
            <p>
              This ensures that the entire V2V network is informed if any remote vehicle experiences a high-G impact event.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
