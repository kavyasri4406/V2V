'use client';

import { useState } from 'react';
import { collection, query, orderBy } from 'firebase/firestore';
import { useFirestore, useUser, useCollection, useMemoFirebase } from '@/firebase';
import type { Note } from '@/lib/types';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Plus } from 'lucide-react';
import { NoteCard } from '@/components/note-card';
import { NoteFormDialog } from '@/components/note-form';
import { Skeleton } from '@/components/ui/skeleton';

export default function NotesPage() {
    const firestore = useFirestore();
    const { user, isUserLoading } = useUser();
    const [isFormOpen, setIsFormOpen] = useState(false);

    const notesQuery = useMemoFirebase(() => {
        if (!firestore || !user) return null;
        return query(collection(firestore, 'users', user.uid, 'notes'), orderBy('createdAt', 'desc'));
    }, [firestore, user]);

    const { data: notes, isLoading: areNotesLoading } = useCollection<Note>(notesQuery);

    const isLoading = isUserLoading || areNotesLoading;

    return (
        <div className="w-full max-w-4xl mx-auto">
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                        <CardTitle>To-Do / Notes</CardTitle>
                        <CardDescription>
                            Manage your vehicle-related reminders and travel notes.
                        </CardDescription>
                    </div>
                    <NoteFormDialog
                        open={isFormOpen}
                        onOpenChange={setIsFormOpen}
                        note={null} // Pass null for creating a new note
                    >
                        <Button onClick={() => setIsFormOpen(true)}>
                            <Plus className="mr-2 h-4 w-4" /> Add Note
                        </Button>
                    </NoteFormDialog>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        {isLoading ? (
                            Array.from({ length: 3 }).map((_, i) => (
                                <div key={i} className="flex items-center space-x-4 p-4 border rounded-lg">
                                    <Skeleton className="h-5 w-5 rounded-sm" />
                                    <div className="space-y-2 flex-1">
                                        <Skeleton className="h-4 w-3/4" />
                                        <Skeleton className="h-4 w-1/2" />
                                    </div>
                                    <Skeleton className="h-8 w-8 rounded-md" />
                                    <Skeleton className="h-8 w-8 rounded-md" />
                                </div>
                            ))
                        ) : notes && notes.length > 0 ? (
                            notes.map(note => <NoteCard key={note.id} note={note} />)
                        ) : (
                            <p className="text-muted-foreground text-center py-8">
                                You haven&apos;t added any notes yet.
                            </p>
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
