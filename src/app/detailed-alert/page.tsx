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
  { name: 'Fire', icon: Flame },
  { name: 'General Hazard', icon: TriangleAlert },
];

export default function DetailedAlertPage() {
  const [submittingType, setSubmittingType] = useState<string | null>(null);
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [locationEnabled, setLocationEnabled] = useState(false);
  const firestore = useFirestore();
  const { toast } = useToast();
  const { user } = useUser();

  const userProfileRef = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return doc(firestore, 'users', user.uid);
  }, [firestore, user]);

  const { data: userProfile } = useDoc<UserProfile>(userProfileRef);


  useEffect(() => {
    const storedVoice = localStorage.getItem('voiceAlertsEnabled') === 'true';
    setVoiceEnabled(storedVoice);
    const storedLocation = localStorage.getItem('locationEnabled') === 'true';
    setLocationEnabled(storedLocation);

    const handleStorageChange = () => {
        const updatedVoice = localStorage.getItem('voiceAlertsEnabled') === 'true';
        setVoiceEnabled(updatedVoice);
        const updatedLocation = localStorage.getItem('locationEnabled') === 'true';
        setLocationEnabled(updatedLocation);
    }
    window.addEventListener('storage', handleStorageChange);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    }
  }, []);

  const sendAlert = (alertData: any) => {
    if (!firestore) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Firestore is not available.',
      });
      setSubmittingType(null);
      return;
    }
    const alertsRef = collection(firestore, 'alerts');
    addDoc(alertsRef, alertData)
      .then(() => {
        toast({
          title: 'Alert Sent!',
          description: `"${alertData.message}" has been broadcasted.`,
        });
        if (voiceEnabled && 'speechSynthesis' in window) {
            const utterance = new SpeechSynthesisUtterance(alertData.message);
            window.speechSynthesis.speak(utterance);
        }
      })
      .catch(() => {
        const permissionError = new FirestorePermissionError({
          path: alertsRef.path,
          operation: 'create',
          requestResourceData: alertData,
        });
        errorEmitter.emit('permission-error', permissionError);
      })
      .finally(() => {
        setSubmittingType(null);
      });
  }

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

    const baseAlert = {
      driver_name: userProfile?.driverName || 'Anonymous',
      sender_vehicle: userProfile?.vehicleNumber || 'N/A',
      message: message,
      timestamp: serverTimestamp(),
      userId: user.uid,
    };

    if (locationEnabled && navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const { latitude, longitude } = position.coords;
                sendAlert({ ...baseAlert, latitude, longitude });
            },
            () => {
                toast({
                    variant: 'destructive',
                    title: 'Location Error',
                    description: 'Could not get location. Alert sent without it.',
                });
                sendAlert(baseAlert);
            }
        );
    } else {
        sendAlert(baseAlert);
    }
  };

  return (
      <div className="w-full max-w-4xl mx-auto">
          <Card>
              <CardHeader>
                  <CardTitle>Quick Alert</CardTitle>
                  <CardDescription>
                      Send an instant alert with one tap. If enabled, your location will be attached.
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
                    className="flex-col h-auto py-6 text-center text-base transition-all duration-200 ease-in-out transform hover:scale-105 hover:shadow-lg focus:ring-2 focus:ring-accent"
                  >
                    {submittingType === action.name ? (
                      <Loader2 className="animate-spin h-6 w-6 mb-2" />
                    ) : (
                      <action.icon className="h-6 w-6 mb-2 text-accent" />
                    )}
                    <span>{action.name}</span>
                  </Button>
                ))}
              </CardContent>
          </Card>
        </div>
  );
}
