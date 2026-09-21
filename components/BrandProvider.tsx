'use client'

import { createContext, useContext, type ReactNode } from 'react'
import type { Brand } from '@/lib/portal'

const BrandContext = createContext<Brand | null>(null)

export function BrandProvider({ brand, children }: { brand: Brand; children: ReactNode }) {
  return <BrandContext.Provider value={brand}>{children}</BrandContext.Provider>
}

export function useBrand(): Brand {
  const b = useContext(BrandContext)
  if (!b) throw new Error('useBrand outside BrandProvider')
  return b
}

/**
 * The site's mark: its uploaded logo if it has one, Twin Harbors' two-wave mark for HarborDirect,
 * otherwise a monogram. `tone="light"` is for the dark header/login panel.
 */
export function BrandMark({ size = 28, tone = 'light' }: { size?: number; tone?: 'light' | 'dark' }) {
  const brand = useBrand()
  const stroke = tone === 'light' ? 'white' : 'currentColor'

  if (brand.logo_url) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={brand.logo_url} alt={brand.brand_name} style={{ height: size }} className="w-auto flex-shrink-0 object-contain" />
  }
  if (brand.brand_name === 'HarborDirect') {
    return (
      <svg width={size} height={Math.round(size * 0.64)} viewBox="0 0 60 36" fill="none" className="flex-shrink-0">
        <path d="M4 18 Q15 8 30 18 Q45 28 56 18" stroke={stroke} strokeWidth="4" strokeLinecap="round" fill="none" opacity="0.5" />
        <path d="M4 26 Q15 16 30 26 Q45 36 56 26" stroke={stroke} strokeWidth="4" strokeLinecap="round" fill="none" />
      </svg>
    )
  }
  const initials = brand.brand_name.split(/\s+/).map(w => w[0]).join('').slice(0, 2).toUpperCase()
  return (
    <span
      className={`flex-shrink-0 inline-flex items-center justify-center rounded-md font-bold ${tone === 'light' ? 'bg-white/15 text-white' : 'bg-[var(--brand)] text-white'}`}
      style={{ width: size, height: size, fontSize: Math.round(size * 0.42) }}
    >
      {initials}
    </span>
  )
}
