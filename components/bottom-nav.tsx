'use client'

import { useEffect, useRef } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  ArrowLeftRight,
  ChartPie,
  Ellipsis,
  TrendingUp,
  Wallet,
  type LucideIcon,
} from 'lucide-react'
import { useTranslation } from '@/components/language-provider'
import { cn } from '@/lib/utils'

type NavItem = { href: string; label: string; icon: LucideIcon }

const NAV_ITEMS: NavItem[] = [
  { href: '/transaksi', label: 'Transaksi', icon: ArrowLeftRight },
  { href: '/statistik', label: 'Statistik', icon: ChartPie },
  { href: '/aset', label: 'Aset', icon: Wallet },
  { href: '/lainnya', label: 'Lainnya', icon: Ellipsis },
]

export function BottomNav() {
  const pathname = usePathname()
  const navRef = useRef<HTMLElement>(null)
  const { t } = useTranslation()

  const navItems = [
    { href: '/transactions', label: t.nav.transaction, icon: ArrowLeftRight },
    { href: '/stats', label: t.nav.stats, icon: ChartPie },
    { href: '/investments', label: t.nav.investments, icon: TrendingUp },
    { href: '/accounts', label: t.nav.asset, icon: Wallet },
    { href: '/more', label: t.nav.more, icon: Ellipsis },
  ]

  /**
   * Publish the measured nav geometry as CSS variables.
   *
   * The bar is `fixed` on mobile but `absolute` inside the rounded app shell
   * from md up, so a hard-coded offset would let the FAB (and the last content
   * row) slide underneath it. Measuring also picks up the device safe-area.
   */
  useEffect(() => {
    const nav = navRef.current
    if (!nav) return

    let last = ''
    const apply = () => {
      const rect = nav.getBoundingClientRect()
      const root = document.documentElement
      // Distance from the viewport's bottom edge to the nav's top edge.
      const offset = Math.max(0, Math.round(root.clientHeight - rect.top))
      const height = Math.round(rect.height)
      const next = `${height}:${offset}`
      if (next === last) return
      last = next
      root.style.setProperty('--nav-height', `${height}px`)
      root.style.setProperty('--nav-offset', `${offset}px`)
    }

    apply()
    const observer = new ResizeObserver(apply)
    observer.observe(nav)
    window.addEventListener('resize', apply)
    window.addEventListener('orientationchange', apply)
    return () => {
      observer.disconnect()
      window.removeEventListener('resize', apply)
      window.removeEventListener('orientationchange', apply)
    }
  }, [])

  return (
    <nav
      ref={navRef}
      aria-label="Navigasi utama"
      className="fixed inset-x-0 bottom-0 z-40 mx-auto w-full max-w-md md:absolute md:max-w-none"
    >
      <div
        className={cn(
          'border-t bg-card/75 px-4 pt-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))] backdrop-blur-xl md:pt-2 supports-[backdrop-filter]:bg-card/60',
          'shadow-[0_-8px_24px_-10px_oklch(0_0_0/_0.05)] md:shadow-none',
        )}
      >
        <ul className="mx-auto grid max-w-lg grid-cols-5 gap-1">
          {navItems.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || pathname.startsWith(`${href}/`)
            return (
              <li key={href}>
                <Link
                  href={href}
                  aria-current={active ? 'page' : undefined}
                  className={cn(
                    'flex flex-col items-center gap-1 py-1.5 text-[11px] font-medium transition-all duration-300 ease-out-quart',
                    active
                      ? 'text-primary'
                      : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  <span
                    className={cn(
                      'relative flex size-8 items-center justify-center rounded-xl transition-all duration-300 ease-out-quart',
                      active
                        ? 'bg-secondary shadow-sm'
                        : 'group-hover:bg-muted',
                    )}
                  >
                    <Icon
                      aria-hidden="true"
                      className={cn('size-5', active && 'size-5')}
                      strokeWidth={active ? 2.2 : 2}
                    />
                  </span>
                  <span className={cn(active && 'font-semibold')}>{label}</span>
                </Link>
              </li>
            )
          })}
        </ul>
      </div>
    </nav>
  )
}
