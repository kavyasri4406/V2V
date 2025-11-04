'use client';

import { useState } from 'react';
import AlertForm from '@/components/alert-form';
import AlertList from '@/components/alert-list';
import Header from '@/components/header';
import { Car, TriangleAlert, TrafficCone, ShieldAlert } from 'lucide-react';
import type { AlertType } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useFirestore, errorEmitter, FirestorePermissionError } from '@/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

const quickActions: { name: AlertType; icon: React.ElementType }[] = [
  { name: 'Traffic', icon: TrafficCone },
  { name: 'Accident', icon: Car },
  { name: 'Collision', icon: ShieldAlert },
  { name: 'Road Hazard', icon: TriangleAlert },
];

export default function Home() {
  const [submittingType, setSubmittingType] = useState<AlertType | null>(null);
  const firestore = useFirestore();
  const { toast } = useToast();

  const handleQuickAction = async (type: AlertType) => {
    setSubmittingType(type);
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
      message: `Quick report for ${type}.`,
      type: type,
      timestamp: serverTimestamp(),
    };

    addDoc(alertsRef, newAlert)
      .then(() => {
        toast({
          title: 'Success',
          description: `Your ${type} alert has been broadcasted.`,
        });
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
    <div className="flex min-h-screen w-full flex-col bg-background">
      <Header />
      <main className="flex flex-1 flex-col items-center gap-8 p-4 md:p-8">
        <div className="w-full max-w-2xl">
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4 md:grid-cols-4">
              {quickActions.map((action) => (
                <Button
                  key={action.name}
                  variant="outline"
                  onClick={() => handleQuickAction(action.name)}
                  disabled={!!submittingType}
                >
                  {submittingType === action.name ? (
                    <Loader2 className="animate-spin" />
                  ) : (
                    <action.icon className="mr-2 h-4 w-4" />
                  )}
                  {action.name}
                </Button>
              ))}
            </CardContent>
          </Card>
        </div>
        <div className="w-full max-w-2xl">
          <AlertForm />
        </div>
        <div className="w-full max-w-2xl">
          <AlertList />
        </div>
      </main>
    </div>
  );
}
