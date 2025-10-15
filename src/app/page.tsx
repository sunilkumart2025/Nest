import Image from 'next/image';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowRight, LockKeyhole, Users, Home as HomeIcon, CreditCard } from 'lucide-react';
import { placeholderImages } from '@/lib/placeholder-images';
import LandingHeader from '@/components/landing-header';
import Footer from '@/components/footer';

export default function Home() {
  const heroImage = placeholderImages.find(p => p.id === 'hero-hostel');

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <LandingHeader />
      <main className="flex-1">
        <section className="relative w-full pt-20 md:pt-32 lg:pt-40 pb-12 md:pb-24 lg:pb-32">
          {heroImage && (
             <Image
              src={heroImage.imageUrl}
              alt={heroImage.description}
              fill
              className="object-cover"
              priority
              data-ai-hint={heroImage.imageHint}
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/80 to-transparent"></div>
          <div className="container relative z-10 px-4 md:px-6">
            <div className="mx-auto max-w-4xl text-center">
              <h1 className="font-headline text-4xl font-bold tracking-tighter text-foreground sm:text-5xl md:text-6xl lg:text-7xl">
                Manage Your Hostel Smarter, Faster, and Securely.
              </h1>
              <p className="mx-auto mt-6 max-w-[700px] text-lg text-muted-foreground md:text-xl">
                Nestify simplifies hostel operations with secure, real-time automation. 
                Separate panels for admins and tenures, integrated payments, and more.
              </p>
              <div className="mt-10 flex flex-col gap-4 sm:flex-row sm:justify-center">
                <Button asChild size="lg" className="font-headline">
                  <Link href="/signup/admin">Signup as Admin</Link>
                </Button>
                <Button asChild size="lg" variant="secondary" className="font-headline">
                   <Link href="/signup/tenure">Signup as Tenure</Link>
                </Button>
              </div>
            </div>
          </div>
        </section>

        <section id="about" className="w-full bg-background py-12 md:py-24 lg:py-32">
          <div className="container px-4 md:px-6">
            <div className="mx-auto grid max-w-5xl items-center gap-6 lg:grid-cols-2 lg:gap-12">
              <div className="flex flex-col justify-center space-y-4">
                <div className="space-y-2">
                  <div className="inline-block rounded-lg bg-secondary px-3 py-1 text-sm font-medium">
                    About Nestify
                  </div>
                  <h2 className="font-headline text-3xl font-bold tracking-tighter sm:text-4xl">
                    Digitalize Your Hostel Ecosystem
                  </h2>
                  <p className="max-w-[600px] text-muted-foreground md:text-lg/relaxed lg:text-base/relaxed xl:text-lg/relaxed">
                    From record keeping and rent collection to tenant management, Nestify replaces tedious manual work with an elegant, automated solution. Our platform is built on Firebase, ensuring security, transparency, and easy access for both hostel owners and residents.
                  </p>
                </div>
                <ul className="grid gap-2 py-4">
                  <li>
                    <CheckIcon className="mr-2 inline-block h-4 w-4 text-primary" />
                    Separate portals for Admins and Tenures.
                  </li>
                  <li>
                    <CheckIcon className="mr-2 inline-block h-4 w-4 text-primary" />
                    Secure, direct payments with Razorpay.
                  </li>
                  <li>
                    <CheckIcon className="mr-2 inline-block h-4 w-4 text-primary" />
                    Real-time data synchronization.
                  </li>
                </ul>
              </div>
              <div className="grid grid-cols-2 gap-4">
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                      <CardTitle className="text-sm font-medium">Room Management</CardTitle>
                      <HomeIcon className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <p className="text-xs text-muted-foreground">Allocate rooms, set rent, and track occupancy.</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                      <CardTitle className="text-sm font-medium">Tenure Management</CardTitle>
                      <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <p className="text-xs text-muted-foreground">Register members and manage their profiles seamlessly.</p>
                    </CardContent>
                  </Card>
                   <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                      <CardTitle className="text-sm font-medium">Online Payments</CardTitle>
                      <CreditCard className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <p className="text-xs text-muted-foreground">Collect rent and bills through a secure gateway.</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                      <CardTitle className="text-sm font-medium">Firebase Security</CardTitle>
                      <LockKeyhole className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <p className="text-xs text-muted-foreground">Role-based access and encrypted data storage.</p>
                    </CardContent>
                  </Card>
                </div>
            </div>
          </div>
        </section>

        <section id="login" className="w-full bg-secondary py-12 md:py-24 lg:py-32">
          <div className="container grid items-center justify-center gap-4 px-4 text-center md:px-6">
            <div className="space-y-3">
              <h2 className="font-headline text-3xl font-bold tracking-tighter md:text-4xl/tight">
                Ready to Get Started?
              </h2>
              <p className="mx-auto max-w-[600px] text-muted-foreground md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
                Log in to your dashboard or create a new account.
              </p>
            </div>
            <div className="mx-auto w-full max-w-sm space-y-2">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Button asChild>
                  <Link href="/login/admin" className="flex items-center justify-center gap-2">Login as Admin <ArrowRight className="h-4 w-4" /></Link>
                </Button>
                <Button asChild>
                  <Link href="/login/tenure" className="flex items-center justify-center gap-2">Login as Tenure <ArrowRight className="h-4 w-4" /></Link>
                </Button>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}

function CheckIcon(props: React.ComponentProps<"svg">) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}
