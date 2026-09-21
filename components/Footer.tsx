'use client'

import { BrandMark, useBrand } from './BrandProvider'

export default function Footer() {
  const brand = useBrand()
  return (
    <footer className="bg-[var(--brand)] text-white/50 text-xs py-3 px-6 flex items-center justify-between mt-auto gap-4">
      <div className="flex items-center gap-2 min-w-0">
        <BrandMark size={20} />
        <span className="truncate">
          {brand.brand_name}{brand.tagline ? <> &middot; {brand.tagline}</> : null}
        </span>
      </div>
      <div className="flex items-center gap-3 flex-shrink-0">
        {brand.support_phone && <span className="hidden sm:inline">{brand.support_phone}</span>}
        {brand.support_email && <a href={`mailto:${brand.support_email}`} className="hidden sm:inline hover:text-white">{brand.support_email}</a>}
        <span>v{process.env.NEXT_PUBLIC_APP_VERSION}</span>
      </div>
    </footer>
  )
}
