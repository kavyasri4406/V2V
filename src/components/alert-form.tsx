"use client";

import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { useFirestore, errorEmitter, FirestorePermissionError } from "@/firebase";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Send, Loader2 } from "lucide-react";
import type { AlertType } from "@/lib/types";

const alertTypes: AlertType[] = ["Traffic", "Weather", "Accident", "Road Hazard", "Collision"];

const formSchema = z.object({
  message: z.string().min(5, {
    message: "Alert message must be at least 5 characters.",
  }).max(140, {
    message: "Alert message must not exceed 140 characters.",
  }),
  type: z.enum(alertTypes as [string, ...string[]]),
});

export default function AlertForm() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const firestore = useFirestore();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      message: "",
      type: "Traffic",
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsSubmitting(true);
    if (!firestore) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Database not available. Please try again later.",
      });
      setIsSubmitting(false);
      return;
    }

    const alertsRef = collection(firestore, "alerts");
    const newAlert = {
      ...values,
      timestamp: serverTimestamp(),
    };

    addDoc(alertsRef, newAlert)
      .then(() => {
        toast({
          title: "Success",
          description: "Your alert has been broadcasted.",
        });
        form.reset();
      })
      .catch((error) => {
        const permissionError = new FirestorePermissionError({
          path: alertsRef.path,
          operation: 'create',
          requestResourceData: newAlert,
        });
        errorEmitter.emit('permission-error', permissionError);

        // Also show a generic error to the user in the UI
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to broadcast alert. Please try again.",
        });
      })
      .finally(() => {
        setIsSubmitting(false);
      });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Detailed Alert</CardTitle>
        <CardDescription>Submit a custom alert message.</CardDescription>
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
                      placeholder="e.g., Heavy traffic on I-5 North near downtown"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Alert Type</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select an alert type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {alertTypes.map((type) => (
                        <SelectItem key={type} value={type}>
                          {type}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
  );
}
