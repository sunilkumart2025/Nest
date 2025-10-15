'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Bell,
  CreditCard,
  LayoutDashboard,
  LogOut,
  User,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Logo } from '../logo';
import { Sheet, SheetContent, SheetTrigger } from '../ui/sheet';
import { Menu } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useFirebase, useMemoFirebase } from '@/firebase';
import { collection, query, where, getDocs, doc } from 'firebase/firestore';
import { useDoc } from '@/firebase/firestore/use-doc';
import { signOut } from 'firebase/auth';
import { useToast } from '@/hooks/use-toast';

const navItems = [
  { href: '/tenure/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/tenure/payments', icon: CreditCard, label: 'Payments' },
  { href: '/tenure/notices', icon: Bell, label: 'Notices' },
  { href: '/tenure/profile', icon: User, label: 'Profile' },
];

export default function TenureSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { toast } = useToast();
  const [isSheetOpen, setSheetOpen] = useState(false);
  const { user, firestore, auth } = useFirebase();
  const [tenureId, setTenureId] = useState<string|null>(null);

  useEffect(() => {
    if (user && firestore) {
      const tenuresRef = query(collection(firestore, 'tenures'), where('userId', '==', user.uid));
      getDocs(tenuresRef).then(snapshot => {
        if (!snapshot.empty) {
          setTenureId(snapshot.docs[0].id);
        }
      })
    }
  }, [user, firestore]);
  
  const tenureDocRef = useMemoFirebase(() => tenureId ? doc(firestore, 'tenures', tenureId) : null, [tenureId, firestore]);
  const { data: tenureData } = useDoc(tenureDocRef);

  const handleLogout = async () => {
    if (!auth) return;
    await signOut(auth);
    toast({ title: "Logged out", description: "You have been successfully logged out." });
    router.push('/');
  }

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  }

  const navContent = (
    <div className="flex h-full flex-col">
      <div className="border-b p-4">
        <Link href="/tenure/dashboard">
          <Logo />
        </Link>
      </div>
      <nav className="flex-1 space-y-2 p-4">
        {navItems.map((item) => (
          <Button
            key={item.label}
            variant={pathname.startsWith(item.href) ? 'secondary' : 'ghost'}
            className="w-full justify-start gap-2"
            asChild
            onClick={() => setSheetOpen(false)}
          >
            <Link href={item.href}>
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          </Button>
        ))}
      </nav>
      <div className="mt-auto border-t p-4">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="w-full justify-start gap-2 h-auto text-left">
              <Avatar className="h-8 w-8">
                <AvatarImage src={user?.photoURL || `https://picsum.photos/seed/tenure-${user?.uid}/40/40`} />
                <AvatarFallback>{tenureData ? getInitials(tenureData.name) : 'T'}</AvatarFallback>
              </Avatar>
              <div className="flex flex-col items-start overflow-hidden">
                <span className="font-medium truncate">{tenureData?.name || 'Tenure'}</span>
                <span className="text-xs text-muted-foreground truncate">
                  {user?.email || 'tenure@example.com'}
                </span>
              </div>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuItem asChild>
              <Link href="/tenure/profile">Profile</Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout}>
              <LogOut className="mr-2 h-4 w-4" />
              Logout
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );

  return (
    <>
      <div className="hidden w-64 flex-col border-r bg-card md:flex">
        {navContent}
      </div>
      <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b bg-card px-4 md:hidden">
        <Link href="/tenure/dashboard">
          <Logo />
        </Link>
        <Sheet open={isSheetOpen} onOpenChange={setSheetOpen}>
          <SheetTrigger asChild>
            <Button size="icon" variant="outline">
              <Menu className="h-6 w-6" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-64 p-0">
            {navContent}
          </SheetContent>
        </Sheet>
      </header>
    </>
  );
}
