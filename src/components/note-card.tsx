'use client';

import { useState } from 'react';
import { doc, deleteDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { useFirestore, useUser, errorEmitter, FirestorePermissionError } from '@/firebase';
import type { Note } from '@/lib/types';
import { formatDistanceToNow } from 'date-fns';

import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Trash2, Edit, Loader2 } from 'lucide-react';
import { NoteFormDialog } from '@/components/note-form';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

type NoteCardProps = {
    note: Note;
};

export function NoteCard({ note }: NoteCardProps) {
    const firestore = useFirestore();
    const { user } = useUser();
    const { toast } = useToast();
    const [isDeleting, setIsDeleting] = useState(false);
    const [isCompleting, setIsCompleting] = useState(false);
    const [isFormOpen, setIsFormOpen] = useState(false);

    const noteRef = doc(firestore, `users/${user?.uid}/notes`, note.id);

    const handleDelete = () => {
        setIsDeleting(true);
        deleteDoc(noteRef)
            .then(() => {
                toast({ title: 'Note deleted successfully.' });
            })
            .catch(() => {
                const permissionError = new FirestorePermissionError({
                    path: noteRef.path,
                    operation: 'delete',
                });
                errorEmitter.emit('permission-error', permissionError);
            })
            .finally(() => {
                setIsDeleting(false);
            });
    };

    const handleToggleComplete = () => {
        setIsCompleting(true);
        updateDoc(noteRef, { completed: !note.completed })
            .catch(() => {
                const permissionError = new FirestorePermissionError({
                    path: noteRef.path,
                    operation: 'update',
                    requestResourceData: { completed: !note.completed },
                });
                errorEmitter.emit('permission-error', permissionError);
            })
            .finally(() => {
                setIsCompleting(false);
            });
    };

    const createdAt = typeof note.createdAt === 'number' ? new Date(note.createdAt) : (note.createdAt as any)?.toDate();


    return (
        <Card className={cn('transition-all', note.completed && 'bg-muted/50')}>
            <CardContent className="p-4 flex items-start gap-4">
                <div className="flex items-center h-full pt-1">
                    {isCompleting ? <Loader2 className="h-5 w-5 animate-spin" /> :
                        <Checkbox
                            id={`note-${note.id}`}
                            checked={note.completed}
                            onCheckedChange={handleToggleComplete}
                            aria-label={`Mark "${note.title}" as ${note.completed ? 'incomplete' : 'complete'}`}
                        />
                    }
                </div>
                <div className="flex-1 space-y-1">
                    <label
                        htmlFor={`note-${note.id}`}
                        className={cn('font-semibold text-card-foreground cursor-pointer', note.completed && 'line-through text-muted-foreground')}
                    >
                        {note.title}
                    </label>
                    {note.description && <p className={cn("text-sm text-muted-foreground", note.completed && 'line-through')}>{note.description}</p>}
                    <p className="text-xs text-muted-foreground">
                        {createdAt ? formatDistanceToNow(createdAt, { addSuffix: true }) : 'just now'}
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <NoteFormDialog open={isFormOpen} onOpenChange={setIsFormOpen} note={note}>
                        <Button variant="ghost" size="icon" onClick={() => setIsFormOpen(true)}>
                            <Edit className="h-4 w-4" />
                            <span className="sr-only">Edit Note</span>
                        </Button>
                    </NoteFormDialog>
                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive">
                                {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                                <span className="sr-only">Delete Note</span>
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                <AlertDialogDescription>
                                    This will permanently delete the note titled &quot;{note.title}&quot;. This action cannot be undone.
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">
                                    Delete
                                </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                </div>
            </CardContent>
        </Card>
    );
}
