import { Car } from "lucide-react";

export default function Header() {
  return (
    <header className="w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-16 items-center justify-center">
        <div className="flex items-center gap-3">
          <Car className="h-8 w-8 text-primary-foreground" />
          <h1 className="text-2xl font-bold tracking-tight text-foreground font-headline">
            V2V AlertCast
          </h1>
        </div>
      </div>
    </header>
  );
}
