import Link from "next/link";
import { Logo } from "./logo";

export default function Footer() {
  return (
    <footer id="support" className="w-full border-t bg-background">
      <div className="container flex flex-col items-center justify-between gap-6 py-10 md:h-24 md:flex-row md:py-0">
        <div className="flex flex-col items-center gap-4 px-8 md:flex-row md:gap-2 md:px-0">
          <Logo />
          <p className="text-center text-sm leading-loose text-muted-foreground md:text-left">
            Built by developers for hostel owners.
          </p>
        </div>
        <div className="flex flex-col items-center gap-4 sm:flex-row sm:gap-6">
          <p className="text-sm text-muted-foreground">
            Contact:{" "}
            <a
              href="mailto:nestifyhelpdesk@gmail.com"
              className="font-medium underline underline-offset-4 hover:text-primary"
            >
              nestifyhelpdesk@gmail.com
            </a>
          </p>
          <div className="flex gap-4">
             <Link href="#" className="text-sm hover:underline">Terms of Service</Link>
             <Link href="#" className="text-sm hover:underline">Privacy Policy</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
