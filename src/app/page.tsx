'use client';

import { useState } from 'react';
import AlertForm from '@/components/alert-form';
import AlertList from '@/components/alert-list';
import { Car, TriangleAlert, TrafficCone, ShieldAlert } from 'lucide-react';
import type { AlertType } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
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
    <div className="container mx-auto p-4 md:p-8">
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        <div className="lg:col-span-1 space-y-8">
            <Card>
                <CardHeader>
                    <CardTitle>Broadcast an Alert</CardTitle>
                    <CardDescription>
                        Use a quick action or fill out the form below.
                    </CardDescription>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-4">
                  {quickActions.map((action) => (
                    <Button
                      key={action.name}
                      variant="outline"
                      size="lg"
                      onClick={() => handleQuickAction(action.name)}
                      disabled={!!submittingType}
                      className="flex-col h-auto py-4"
                    >
                      {submittingType === action.name ? (
                        <Loader2 className="animate-spin" />
                      ) : (
                        <action.icon className="h-6 w-6 mb-2" />
                      )}
                      {action.name}
                    </Button>
                  ))}
                </CardContent>
            </Card>
            <AlertForm />
        </div>
        <div className="lg:col-span-2">
            <AlertList />
        </div>
      </div>
    </div>
  );
}
