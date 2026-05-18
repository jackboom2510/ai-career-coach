/// <reference types="vite/client" />
import { ClerkProvider } from '@clerk/clerk-react';

const publishableKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

if (!publishableKey) {
  throw new Error('Add VITE_CLERK_PUBLISHABLE_KEY to your .env file');
}

const routerPush = (to: string) => window.history.pushState({}, '', to);
const routerReplace = (to: string) => window.history.replaceState({}, '', to);

export function AppClerkProvider({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider
      publishableKey={publishableKey}
      routerPush={routerPush}
      routerReplace={routerReplace}
    >
      {children}
    </ClerkProvider>
  );
}
