import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Menu } from "lucide-react";
import { Logo } from "./logo";

export default function LandingHeader() {
    const navLinks = [
        { href: "#about", label: "About" },
        { href: "#support", label: "Contact" },
    ];
    return (
        <header className="absolute top-0 left-0 right-0 z-20 h-20 flex items-center">
            <div className="container flex items-center justify-between">
                <Link href="/">
                    <Logo />
                </Link>
                <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
                    {navLinks.map(link => (
                        <Link key={link.href} href={link.href} className="text-foreground/80 hover:text-foreground transition-colors">{link.label}</Link>
                    ))}
                </nav>
                <div className="hidden md:flex items-center gap-2">
                    <Button variant="ghost" asChild>
                        <Link href="/login/tenure">Tenure Login</Link>
                    </Button>
                    <Button asChild>
                        <Link href="/login/admin">Admin Login</Link>
                    </Button>
                </div>
                <Sheet>
                    <SheetTrigger asChild>
                        <Button variant="outline" size="icon" className="md:hidden">
                            <Menu className="h-4 w-4" />
                            <span className="sr-only">Open menu</span>
                        </Button>
                    </SheetTrigger>
                    <SheetContent side="right">
                        <div className="p-6">
                            <Link href="/" className="mb-8 block">
                                <Logo />
                            </Link>
                            <nav className="flex flex-col gap-4 mb-8">
                                {navLinks.map(link => (
                                    <Link key={link.href} href={link.href} className="text-lg font-medium hover:underline">{link.label}</Link>
                                ))}
                            </nav>
                             <div className="flex flex-col gap-4">
                                <Button asChild className="w-full">
                                    <Link href="/login/admin">Admin Login</Link>
                                </Button>
                                <Button variant="secondary" asChild className="w-full">
                                    <Link href="/login/tenure">Tenure Login</Link>
                                </Button>
                            </div>
                        </div>
                    </SheetContent>
                </Sheet>
            </div>
        </header>
    )
}
