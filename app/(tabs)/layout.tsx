import { BottomNav } from '@/components/bottom-nav'
import { AppLock } from '@/components/app-lock'

export default function TabsLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="flex min-h-dvh justify-center bg-background md:px-6 md:py-8">
      <div className="relative flex min-h-dvh w-full max-w-md flex-col bg-background md:h-[calc(100dvh-4rem)] md:min-h-0 md:max-w-3xl md:overflow-hidden md:rounded-[2rem] md:border md:border-border/60 md:shadow-card lg:max-w-5xl">
        <main className="flex flex-1 flex-col pb-[calc(var(--nav-offset)+0.75rem)] md:overflow-y-auto">
          <AppLock>{children}</AppLock>
        </main>
        <BottomNav />
      </div>
    </div>
  )
}
