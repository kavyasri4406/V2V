import Link from 'next/link';
import { Button } from '@/components/ui/button';
import AlertForm from '@/components/alert-form';
import AlertList from '@/components/alert-list';
import Header from '@/components/header';
import { Car, TriangleAlert, TrafficCone, ShieldAlert } from 'lucide-react';
import type { AlertType } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const quickActions: { name: AlertType; icon: React.ElementType }[] = [
  { name: 'Traffic', icon: TrafficCone },
  { name: 'Accident', icon: Car },
  { name: 'Collision', icon: ShieldAlert },
  { name: 'Road Hazard', icon: TriangleAlert },
];

export default function Home() {
  return (
    <div className="flex min-h-screen w-full flex-col bg-background">
      <Header />
      <main className="flex flex-1 flex-col items-center gap-8 p-4 md:p-8">
        <div className="w-full max-w-2xl">
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {quickActions.map((action) => (
                <Button key={action.name} variant="outline" asChild>
                  <Link href={`/alerts/${action.name.toLowerCase().replace(' ', '-')}`}>
                    <action.icon className="mr-2 h-4 w-4" />
                    {action.name}
                  </Link>
                </Button>
              ))}
            </CardContent>
          </Card>
        </div>
        <div className="w-full max-w-2xl">
          <AlertForm />
        </div>
        <div className="w-full max-w-2xl">
          <AlertList />
        </div>
      </main>
    </div>
  );
}
