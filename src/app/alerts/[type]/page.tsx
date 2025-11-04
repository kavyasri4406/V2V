'use client';

import AlertList from '@/components/alert-list';
import type { AlertType } from '@/lib/types';
import { useMemo, use } from 'react';
import { capitalize } from 'lodash';

type AlertTypePageProps = {
  params: {
    type: string;
  };
};

export default function AlertTypePage({ params: paramsProp }: AlertTypePageProps) {
  // The 'params' prop can be a promise in some Next.js contexts.
  // We use React.use() to unwrap it, which works for both promises and direct objects.
  const params = use(paramsProp);

  // Decode and capitalize the alert type from the URL
  const alertType = useMemo(() => {
    const decodedType = decodeURIComponent(params.type);
    // A simple function to convert 'road-hazard' to 'Road Hazard'
    return decodedType.split('-').map(word => capitalize(word)).join(' ') as AlertType;
  }, [params.type]);

  return (
    <div className="container mx-auto p-4 md:p-8">
      <AlertList filterByType={alertType} />
    </div>
  );
}
