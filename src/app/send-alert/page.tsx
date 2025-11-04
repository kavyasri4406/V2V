'use client';

import { useState } from 'react';
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
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Send, Loader2 } from 'lucide-react';

const formSchema = z.object({
  driver_name: z.string().min(2, {
    message: 'Driver name must be at least 2 characters.',
  }),
  sender_vehicle: z.string().min(2, {
    message: 'Vehicle number must be at least 2 characters.',
  }),
  message: z.string().min(5, {
    message: 'Alert message must be at least 5 characters.',
  }).max(280, {
    message: 'Alert message must not exceed 280 characters.',
  }),
});

export default function SendAlertPage() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const firestore = useFirestore();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      driver_name: '',
      sender_vehicle: '',
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
      ...values,
      timestamp: Date.now(),
    };

    addDoc(alertsRef, newAlert)
      .then(() => {
        toast({
          title: 'Alert sent successfully!',
        });
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
          <CardDescription>Fill out the form below to send an alert to other vehicles on the network.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="driver_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Driver Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Jane Doe" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="sender_vehicle"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Your Vehicle Number</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., CA-123-XYZ" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
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
