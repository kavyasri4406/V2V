'use client';

import { useState, useEffect } from 'react';
import { collection, addDoc } from 'firebase/firestore';
import { useFirestore, errorEmitter, FirestorePermissionError } from '@/firebase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { ShieldAlert, TrafficCone, Car, Ambulance } from 'lucide-react';


const quickActions = [
  { name: 'Collision Ahead', icon: ShieldAlert },
  { name: 'Road Hazard', icon: TrafficCone },
  { name: 'Traffic Jam', icon: Car },
  { name: 'Emergency Vehicle Ahead', icon: Ambulance },
];

export default function DetailedAlertPage() {
  const [submittingType, setSubmittingType] = useState<string | null>(null);
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const firestore = useFirestore();
  const { toast } = useToast();

  useEffect(() => {
    if (typeof window !== 'undefined') {
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
    }
  }, []);

  const handleQuickAction = async (message: string) => {
    setSubmittingType(message);
    if (!firestore) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Database not available. Please try again later.',
      });
      setSubmittingType(null);
      return;
    }

    const alertsRef = collection(firestore, 'alerts');
    const newAlert = {
      driver_name: 'Quick Action',
      sender_vehicle: 'N/A',
      message: message,
      timestamp: Date.now(),
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
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'Failed to broadcast alert. Please try again.',
        });
      })
      .finally(() => {
        setSubmittingType(null);
      });
  };

  return (
      <div className="w-full max-w-2xl mx-auto">
          <Card>
              <CardHeader>
                  <CardTitle>Quick Alert</CardTitle>
                  <CardDescription>
                      Send an instant alert with one tap.
                  </CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
