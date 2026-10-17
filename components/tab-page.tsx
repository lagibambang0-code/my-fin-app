import type { HTMLAttributes, ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

type TabPageProps = {
  title: string
  subtitle?: string
  header?: ReactNode
  icon: LucideIcon
  emptyTitle?: string
  emptyDescription?: string
  children?: ReactNode
  contentProps?: HTMLAttributes<HTMLElement>
  contentKey?: string
}

export function TabPage({
  title,
  subtitle,
  header,
  icon: Icon,
  emptyTitle,
  emptyDescription,
  children,
  contentProps,
  contentKey,
}: TabPageProps) {
  const { className: contentClassName, ...restContentProps } = contentProps ?? {}

  return (
    <>
      <header
        className={cn(
          'sticky top-0 z-30 bg-background/80 px-4 pt-[calc(0.875rem+env(safe-area-inset-top))] pb-4 backdrop-blur-xl md:px-10 md:pt-6 md:pb-8',
          'shadow-[0_2px_4px_-1px_oklch(0_0_0/_0.04)]',
        )}
      >
        {header ? (
          <>
            <h1 className="sr-only">{title}</h1>
            {header}
          </>
        ) : (
          <>
            <p className="text-xs font-medium text-muted-foreground tracking-wide md:text-sm">
              {subtitle}
            </p>
            <h1 className="text-xl font-bold tracking-tight text-balance md:text-2xl">
              {title}
            </h1>
          </>
        )}
      </header>

      <section
        aria-label={`Konten ${title}`}
        {...restContentProps}
        className={cn('flex flex-1 flex-col', contentClassName)}
      >
        {children ?? (
          <div
            key={contentKey}
            className="flex flex-1 flex-col items-center justify-center px-6 py-12 text-center md:py-16 animate-in fade-in slide-in-from-bottom-2 duration-500 ease-out-quart"
          >
            <div className="relative mb-6 flex size-24 items-center justify-center md:mb-8 md:size-32">
              <div
                aria-hidden="true"
                className="absolute inset-0 rounded-[2rem] bg-secondary rotate-6 md:rounded-[3rem]"
              />
              <div className="relative flex size-16 items-center justify-center rounded-2xl border border-border bg-card shadow-sm md:size-20 md:rounded-3xl">
                <Icon aria-hidden="true" className="size-7 text-primary md:size-10" />
              </div>
            </div>
            <h2 className="text-base font-semibold md:text-lg">{emptyTitle}</h2>
            <p className="mt-2 max-w-xs text-sm leading-relaxed text-muted-foreground text-pretty md:mt-3 md:text-base">
              {emptyDescription}
            </p>
          </div>
        )}
      </section>
    </>
  )
}
