'use client';

import { useParams } from 'next/navigation';
import AlertList from '@/components/alert-list';
import { Button } from '@/components/ui/button';
import { AlertType } from '@/lib/types';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

const VALID_ALERT_TYPES: AlertType[] = ['Traffic', 'Weather', 'Accident', 'Road Hazard', 'Collision'];

function isValidAlertType(type: any): type is AlertType {
  return typeof type === 'string' && VALID_ALERT_TYPES.includes(type as AlertType);
}

function formatTypeName(slug: string): string {
  if (slug === 'road-hazard') return 'Road Hazard';
  return slug
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export default function AlertTypePage() {
  const params = useParams();
  const typeSlug = Array.isArray(params.type) ? params.type[0] : params.type;
  const typeName = typeSlug ? formatTypeName(typeSlug) : '';

  if (!isValidAlertType(typeName)) {
    return (
      <main className="flex flex-1 flex-col items-center justify-center gap-8 p-4 md:p-8">
        <p>Invalid alert type.</p>
        <Button asChild>
          <Link href="/">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Home
          </Link>
        </Button>
      </main>
    );
  }

  return (
    <div className="container mx-auto p-4 md:p-8">
        <div className="w-full max-w-4xl mx-auto space-y-4">
            <AlertList filterByType={typeName} />
        </div>
    </div>
  );
}
