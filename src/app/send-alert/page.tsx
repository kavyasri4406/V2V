'use client';

import { useState, useEffect } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { collection, addDoc } from 'firebase/firestore';
import { useFirestore, errorEmitter, FirestorePermissionError } from '@/firebase';
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

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      message: '',
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsSubmitting(true);
    if (!firestore) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Database not available. Please try again later.',
      });
      setIsSubmitting(false);
      return;
    }

    const alertsRef = collection(firestore, 'alerts');
    const newAlert = {
      driver_name: 'Anonymous',
      sender_vehicle: 'N/A',
      message: values.message,
      timestamp: Date.now(),
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

        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'Failed to send alert. Please check permissions and try again.',
        });
      })
      .finally(() => {
        setIsSubmitting(false);
      });
  }

  return (
    <div className="w-full max-w-2xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle>Broadcast an Alert</CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="message"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Alert Message</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Describe the situation..."
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" disabled={isSubmitting} className="w-full">
                {isSubmitting ? (
                  <Loader2 className="animate-spin" />
                ) : (
                  <Send />
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
