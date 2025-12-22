'use client';

import { useEffect, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { collection, addDoc, updateDoc, doc, serverTimestamp } from 'firebase/firestore';
import { useFirestore, useUser, errorEmitter, FirestorePermissionError } from '@/firebase';
import type { Note } from '@/lib/types';

import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
    DialogTrigger,
} from '@/components/ui/dialog';
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
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

const formSchema = z.object({
    title: z.string().min(3, 'Title must be at least 3 characters.'),
    description: z.string().optional(),
});

type NoteFormProps = {
    note: Note | null;
    children: React.ReactNode;
    open: boolean;
    onOpenChange: (open: boolean) => void;
};

export function NoteFormDialog({ note, children, open, onOpenChange }: NoteFormProps) {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { toast } = useToast();
    const firestore = useFirestore();
    const { user } = useUser();

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            title: '',
            description: '',
        },
    });

    useEffect(() => {
        if (note) {
            form.reset({
                title: note.title,
                description: note.description,
            });
        } else {
            form.reset({
                title: '',
                description: '',
            });
        }
    }, [note, form, open]);

    async function onSubmit(values: z.infer<typeof formSchema>) {
        if (!firestore || !user) {
            toast({ variant: 'destructive', title: 'Error', description: 'You must be logged in.' });
            return;
        }

        setIsSubmitting(true);
        const operation = note ? 'update' : 'create';

        try {
            if (note) {
                // Update existing note
                const noteRef = doc(firestore, 'users', user.uid, 'notes', note.id);
                const payload = { ...values };
                await updateDoc(noteRef, payload).catch(e => {
                     const permissionError = new FirestorePermissionError({
                        path: noteRef.path,
                        operation: 'update',
                        requestResourceData: payload,
                    });
                    errorEmitter.emit('permission-error', permissionError);
                    throw e; // re-throw to be caught by outer catch
                });
            } else {
                // Create new note
                const notesRef = collection(firestore, 'users', user.uid, 'notes');
                const payload = {
                    ...values,
                    completed: false,
                    createdAt: serverTimestamp(),
                    userId: user.uid,
                };
                await addDoc(notesRef, payload).catch(e => {
                    const permissionError = new FirestorePermissionError({
                        path: notesRef.path,
                        operation: 'create',
                        requestResourceData: payload,
                    });
                    errorEmitter.emit('permission-error', permissionError);
                    throw e; // re-throw to be caught by outer catch
                });
            }

            toast({
                title: `Note ${operation === 'create' ? 'created' : 'updated'}`,
                description: `Your note has been successfully saved.`,
            });
            onOpenChange(false);
        } catch (error) {
            // Error is already emitted, the global handler will show it.
            // No need for a toast here unless you want a generic fallback.
        } finally {
            setIsSubmitting(false);
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogTrigger asChild>{children}</DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>{note ? 'Edit Note' : 'Add a new Note'}</DialogTitle>
                    <DialogDescription>
                        {note ? 'Update the details of your note below.' : 'Fill in the details for your new note.'}
                    </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField
                            control={form.control}
                            name="title"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Title</FormLabel>
                                    <FormControl>
                                        <Input placeholder="e.g., Check tyre pressure" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="description"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Description (Optional)</FormLabel>
                                    <FormControl>
                                        <Textarea
                                            placeholder="e.g., Front-left seems a bit low, check before long drive."
                                            {...field}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <DialogFooter>
                            <Button type="submit" disabled={isSubmitting}>
                                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                {note ? 'Save Changes' : 'Create Note'}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
