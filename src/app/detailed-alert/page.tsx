'use client';

import { useState, useEffect } from 'react';
import { collection, addDoc, serverTimestamp, doc } from 'firebase/firestore';
import { useFirestore, errorEmitter, FirestorePermissionError, useUser, useDoc, useMemoFirebase } from '@/firebase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import type { UserProfile } from '@/lib/types';
import { 
  ShieldAlert, 
  TrafficCone, 
  Car, 
  Ambulance,
  Trash2,
  CircleOff,
  Waves,
  CloudRain,
  CloudFog,
  Wind,
  Snowflake,
  XCircle,
  Siren,
  Flame,
  TriangleAlert
} from 'lucide-react';


const quickActions = [
  { name: 'Collision Ahead', icon: ShieldAlert },
  { name: 'Road Hazard', icon: TrafficCone },
  { name: 'Traffic Jam', icon: Car },
  { name: 'Emergency Vehicle', icon: Ambulance },
  { name: 'Debris on Road', icon: Trash2 },
  { name: 'Pothole', icon: CircleOff },
  { name: 'Slippery Road', icon: Waves },
  { name: 'Heavy Rain', icon: CloudRain },
  { name: 'Fog', icon: CloudFog },
  { name: 'High Winds', icon: Wind },
  { name: 'Icy Conditions', icon: Snowflake },
  { name: 'Broken Down Vehicle', icon: ShieldAlert },
  { name: 'Road Closure', icon: XCircle },
  { name: 'Police Activity', icon: Siren },
  { name: 'Fire Truck', icon: Flame },
  { name: 'General Hazard', icon: TriangleAlert },
];

export default function DetailedAlertPage() {
  const [submittingType, setSubmittingType] = useState<string | null>(null);
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const firestore = useFirestore();
  const { toast } = useToast();
  const { user } = useUser();

  const userProfileRef = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return doc(firestore, 'users', user.uid);
  }, [firestore, user]);

  const { data: userProfile } = useDoc<UserProfile>(userProfileRef);


  useEffect(() => {
    // This effect runs only on the client, avoiding hydration errors
    const storedValue = localStorage.getItem('voiceAlertsEnabled') === 'true';
    setVoiceEnabled(storedValue);

    const handleStorageChange = () => {
        const updatedValue = localStorage.getItem('voiceAlertsEnabled') === 'true';
        setVoiceEnabled(updatedValue);
    }
    window.addEventListener('storage', handleStorageChange);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    }
  }, []);

  const handleQuickAction = async (message: string) => {
    setSubmittingType(message);
    if (!firestore || !user) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'You must be logged in to send an alert.',
      });
      setSubmittingType(null);
      return;
    }

    const alertsRef = collection(firestore, 'alerts');
    const newAlert = {
      driver_name: userProfile?.driverName || 'Anonymous',
      sender_vehicle: userProfile?.vehicleNumber || 'N/A',
      message: message,
      timestamp: serverTimestamp(),
      userId: user.uid,
    };

    addDoc(alertsRef, newAlert)
      .then(() => {
        toast({
          title: 'Alert Sent!',
          description: `"${message}" has been broadcasted.`,
        });
        if (voiceEnabled && 'speechSynthesis' in window) {
            const utterance = new SpeechSynthesisUtterance(message);
            window.speechSynthesis.speak(utterance);
        }
      })
      .catch(() => {
        const permissionError = new FirestorePermissionError({
          path: alertsRef.path,
          operation: 'create',
          requestResourceData: newAlert,
        });
        errorEmitter.emit('permission-error', permissionError);
        // The global error handler will show the error, no need for a toast here
      })
      .finally(() => {
        setSubmittingType(null);
      });
  };

  return (
      <div className="w-full max-w-4xl mx-auto">
          <Card>
              <CardHeader>
                  <CardTitle>Quick Alert</CardTitle>
                  <CardDescription>
                      Send an instant alert with one tap.
                  </CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {quickActions.map((action) => (
                  <Button
                    key={action.name}
                    variant="outline"
                    size="lg"
                    onClick={() => handleQuickAction(action.name)}
                    disabled={!!submittingType}
                    className="flex-col h-auto py-6 text-base transition-all duration-300 ease-in-out transform hover:scale-105 hover:shadow-lg hover:bg-accent/10 focus:ring-2 focus:ring-accent"
                  >
                    {submittingType === action.name ? (
                      <Loader2 className="animate-spin h-6 w-6 mb-2" />
                    ) : (
                      <action.icon className="h-6 w-6 mb-2 text-accent" />
                    )}
                    <span className="text-center">{action.name}</span>
                  </Button>
                ))}
              </CardContent>
          </Card>
        </div>
  );
}
