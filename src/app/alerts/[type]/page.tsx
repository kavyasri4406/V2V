'use client';

import AlertList from '@/components/alert-list';
import type { AlertType } from '@/lib/types';
import { useMemo } from 'react';
import { capitalize } from 'lodash';

type AlertTypePageProps = {
  params: {
    type: string;
  };
};

export default function AlertTypePage({ params }: AlertTypePageProps) {
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
