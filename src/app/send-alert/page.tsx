'use client';

import { useState, useEffect } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { collection, addDoc, serverTimestamp, doc } from 'firebase/firestore';
import { useFirestore, errorEmitter, FirestorePermissionError, useUser, useDoc, useMemoFirebase } from '@/firebase';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Send, Loader2 } from 'lucide-react';
import type { UserProfile } from '@/lib/types';

const formSchema = z.object({
  message: z.string().min(5, {
    message: 'Alert message must be at least 5 characters.',
  }).max(280, {
    message: 'Alert message must not exceed 280 characters.',
  }),
});

export default function SendAlertPage() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const { toast } = useToast();
  const firestore = useFirestore();
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

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      message: '',
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsSubmitting(true);
    if (!firestore || !user) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'You must be logged in to send an alert.',
      });
      setIsSubmitting(false);
      return;
    }

    const alertsRef = collection(firestore, 'alerts');
    const newAlert = {
      driver_name: userProfile?.driverName || 'Anonymous',
      sender_vehicle: userProfile?.vehicleNumber || 'N/A',
      message: values.message,
      timestamp: serverTimestamp(),
      userId: user.uid,
    };

    addDoc(alertsRef, newAlert)
      .then(() => {
        toast({
          title: 'Alert sent successfully!',
        });
        if (voiceEnabled && 'speechSynthesis' in window) {
            const utterance = new SpeechSynthesisUtterance(values.message);
            window.speechSynthesis.speak(utterance);
        }
        form.reset();
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
        setIsSubmitting(false);
      });
  }

  return (
      <div className="w-full max-w-2xl mx-auto flex flex-col h-full">
        <Card className="flex flex-col flex-grow">
          <CardHeader>
            <CardTitle>Broadcast an Alert</CardTitle>
            <CardDescription>Describe the situation in detail.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col flex-grow">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 flex flex-col flex-grow">
                <FormField
                  control={form.control}
                  name="message"
                  render={({ field }) => (
                    <FormItem className="flex flex-col flex-grow">
                      <FormLabel>Alert Message</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="e.g., Standstill traffic on I-5 North due to an accident near the bridge."
                          className="flex-grow resize-none"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" disabled={isSubmitting} className="w-full">
                  {isSubmitting ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="mr-2 h-4 w-4" />
                  )}
                  Broadcast Alert
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
  );
}
