import AlertForm from '@/components/alert-form';
import AlertList from '@/components/alert-list';
import Header from '@/components/header';

export default function Home() {
  return (
    <div className="flex min-h-screen w-full flex-col bg-background">
      <Header />
      <main className="flex flex-1 flex-col items-center gap-8 p-4 md:p-8">
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
