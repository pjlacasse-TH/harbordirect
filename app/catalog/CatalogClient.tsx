'use client'

import { useState, useMemo, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Header from '@/components/Header'
import { MagnifyingGlassIcon, XMarkIcon, ShoppingCartIcon, StarIcon } from '@heroicons/react/24/outline'
import Image from 'next/image'
import type { CatalogItem, CatalogMode } from '@/lib/portal'

type Mode = 'each' | 'case'
type Stock = 'in' | 'low' | 'out' | 'backorder'

interface CartEntry {
  item: CatalogItem
  qty: number
  mode: Mode
  unitPrice: number
}

interface Props {
  email: string
  customerName: string
  items: CatalogItem[]
  catalogMode: CatalogMode
  allowBackorder: boolean
}

// Cart survives moving between Catalog, Orders and Checkout within the tab.
const CART_KEY = 'hd_cart_state'

function stockStatus(item: CatalogItem, allowBackorder: boolean): Stock {
  const qty = item.qty_on_hand ?? 0
  if (qty <= 0) return allowBackorder ? 'backorder' : 'out'
  if ((item.low_stock_alert ?? 0) > 0 && qty <= (item.low_stock_alert ?? 0)) return 'low'
  return 'in'
}

function priceFor(item: CatalogItem, mode: Mode): number | null {
  const p = mode === 'each' ? item.price_each : item.price_case
  return p != null && p > 0 ? p : null
}

function listFor(item: CatalogItem, mode: Mode): number | null {
  return mode === 'each' ? item.list_each : item.list_case
}

const isSpecialPrice = (item: CatalogItem) => item.price_source !== 'list'

function fmt(n: number | null): string {
  if (n === null) return '—'
  return '$' + n.toFixed(2)
}

function uomLabel(item: CatalogItem, mode: Mode) {
  if (mode === 'case') return 'case'
  return item.sell_uom || 'each'
}

function StockBadge({ status }: { status: Stock }) {
  const cls = {
    in: 'text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 border-emerald-200 dark:border-emerald-800',
    low: 'text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/50 border-amber-200 dark:border-amber-800',
    out: 'text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-700 border-slate-200 dark:border-slate-600',
    backorder: 'text-sky-700 dark:text-sky-400 bg-sky-50 dark:bg-sky-950/50 border-sky-200 dark:border-sky-800',
  }[status]
  const label = { in: 'In Stock', low: 'Low Stock', out: 'Out of Stock', backorder: 'Ships on Order' }[status]
  return <span className={`text-xs font-medium border px-2 py-0.5 rounded-full ${cls}`}>{label}</span>
}

function PriceTag({ item, mode }: { item: CatalogItem; mode: Mode }) {
  const price = priceFor(item, mode)
  const list = listFor(item, mode)
  const showList = isSpecialPrice(item) && price !== null && list !== null && list > price
  return (
    <div className="flex items-baseline gap-2 flex-wrap">
      <span className="text-xl font-bold text-[var(--brand)] dark:text-blue-200">{price === null ? 'Call for price' : fmt(price)}</span>
      {showList && <span className="text-xs text-slate-400 line-through">{fmt(list)}</span>}
      {isSpecialPrice(item) && price !== null && (
        <span className="text-xs text-blue-600 dark:text-blue-400 font-medium">Your price</span>
      )}
    </div>
  )
}

function QtyStepper({ qty, setQty, disabled }: { qty: number; setQty: (n: number) => void; disabled?: boolean }) {
  return (
    <div className="flex items-center border border-slate-200 dark:border-slate-600 rounded-lg overflow-hidden text-sm select-none">
      <button onClick={() => setQty(Math.max(1, qty - 1))} disabled={disabled}
        className="px-2.5 py-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors disabled:opacity-30">−</button>
      <input
        type="number" min={1} value={qty} disabled={disabled}
        onChange={e => setQty(Math.max(1, Math.floor(Number(e.target.value) || 1)))}
        className="w-12 text-center font-medium bg-transparent text-slate-800 dark:text-slate-200 focus:outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none"
        aria-label="Quantity"
      />
      <button onClick={() => setQty(qty + 1)} disabled={disabled}
        className="px-2.5 py-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors disabled:opacity-30">+</button>
    </div>
  )
}

function ModeToggle({ item, mode, setMode }: { item: CatalogItem; mode: Mode; setMode: (m: Mode) => void }) {
  if (item.sell_mode !== 'both') return null
  return (
    <div className="flex rounded-lg border border-slate-200 dark:border-slate-600 overflow-hidden text-xs font-medium self-start">
      {(['each', 'case'] as Mode[]).map(m => (
        <button key={m} onClick={() => setMode(m)}
          className={`px-3 py-1.5 transition-colors capitalize ${mode === m ? 'bg-[var(--brand)] text-white' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'}`}>
          {m === 'each' ? (item.sell_uom || 'Each') : 'Case'}
        </button>
      ))}
    </div>
  )
}

function ProductImage({ src, alt, className = 'h-36 sm:h-44' }: { src: string | null; alt: string; className?: string }) {
  return (
    <div className={`relative bg-slate-100 dark:bg-slate-700 flex items-center justify-center ${className}`}>
      {src ? (
        <Image src={src} alt={alt} fill className="object-contain p-3"
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw" />
      ) : (
        <div className="flex flex-col items-center gap-1 text-slate-300 dark:text-slate-500">
          <svg className="w-12 h-12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <path d="m9 9 6 6M15 9l-6 6" />
          </svg>
          <span className="text-xs">No image</span>
        </div>
      )}
    </div>
  )
}

type AddFn = (item: CatalogItem, mode: Mode, qty: number) => void

function ProductCard({ item, allowBackorder, onAdd }: { item: CatalogItem; allowBackorder: boolean; onAdd: AddFn }) {
  const [mode, setMode] = useState<Mode>(item.sell_mode === 'case' ? 'case' : 'each')
  const [qty, setQty] = useState(1)
  const status = stockStatus(item, allowBackorder)
  const price = priceFor(item, mode)
  const blocked = status === 'out' || price === null

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col overflow-hidden hover:shadow-md transition-shadow">
      <div className="relative">
        <ProductImage src={item.image_url} alt={item.item_name} />
        <span className="absolute top-2 left-2 text-xs font-semibold text-slate-600 dark:text-slate-300 bg-white/90 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-600 px-2 py-0.5 rounded-full">
          {uomLabel(item, mode)}
        </span>
      </div>
      <div className="flex flex-col flex-1 p-4 gap-3">
        <div className="flex flex-col gap-1.5">
          <StockBadge status={status} />
          <h3 className="font-semibold text-[var(--brand)] dark:text-blue-200 text-sm leading-snug line-clamp-2">{item.item_name}</h3>
          <p className="text-xs text-slate-400 dark:text-slate-500 font-mono">SKU: {item.sku}</p>
        </div>
        {item.description && (
          <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">{item.description}</p>
        )}
        <ModeToggle item={item} mode={mode} setMode={setMode} />
        <div className="mt-auto">
          <PriceTag item={item} mode={mode} />
          {mode === 'each' && item.sell_mode === 'both' && priceFor(item, 'case') !== null && (
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">Case: {fmt(priceFor(item, 'case'))}</p>
          )}
        </div>
        <div className="flex gap-2 items-center">
          <QtyStepper qty={qty} setQty={setQty} disabled={blocked} />
          <button disabled={blocked} onClick={() => { onAdd(item, mode, qty); setQty(1) }}
            className="flex-1 py-2.5 text-sm font-semibold rounded-lg transition-colors bg-[var(--brand)] text-white hover:bg-[var(--brand-hover)] disabled:bg-slate-100 dark:disabled:bg-slate-700 disabled:text-slate-400 dark:disabled:text-slate-500 disabled:cursor-not-allowed">
            {status === 'out' ? 'Out of Stock' : 'Add to Cart'}
          </button>
        </div>
      </div>
    </div>
  )
}

function VariantCard({ variants, allowBackorder, onAdd }: { variants: CatalogItem[]; allowBackorder: boolean; onAdd: AddFn }) {
  const [selectedIdx, setSelectedIdx] = useState(0)
  const [qty, setQty] = useState(1)
  const item = variants[selectedIdx]
  const [mode, setMode] = useState<Mode>(item.sell_mode === 'case' ? 'case' : 'each')

  const select = (idx: number) => {
    setSelectedIdx(idx)
    setMode(variants[idx].sell_mode === 'case' ? 'case' : 'each')
    setQty(1)
  }

  const status = stockStatus(item, allowBackorder)
  const price = priceFor(item, mode)
  const blocked = status === 'out' || price === null
  const groupImage = variants.find(v => v.image_url)?.image_url ?? null
  const groupName = variants[0].item_name.replace(/\s*(x-?small|small|medium|large|x-?large|xxl|xs|sm|md|lg|xl)\s*/i, '').trim()

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col overflow-hidden hover:shadow-md transition-shadow">
      <div className="relative">
        <ProductImage src={groupImage} alt={groupName} />
        <span className="absolute top-2 left-2 text-xs font-semibold text-slate-600 dark:text-slate-300 bg-white/90 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-600 px-2 py-0.5 rounded-full">
          {uomLabel(item, mode)}
        </span>
      </div>
      <div className="flex flex-col flex-1 p-4 gap-3">
        <div className="flex flex-col gap-1.5">
          <StockBadge status={status} />
          <h3 className="font-semibold text-[var(--brand)] dark:text-blue-200 text-sm leading-snug">{groupName}</h3>
          <p className="text-xs text-slate-400 dark:text-slate-500 font-mono">SKU: {item.sku}</p>
        </div>
        {item.description && (
          <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">{item.description}</p>
        )}
        <div className="flex flex-wrap gap-1.5">
          {variants.map((v, i) => {
            const vStatus = stockStatus(v, allowBackorder)
            const isOut = vStatus === 'out'
            const isSelected = i === selectedIdx
            return (
              <button key={v.inventory_id} onClick={() => !isOut && select(i)} disabled={isOut}
                className={`relative px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                  isOut
                    ? 'bg-slate-50 dark:bg-slate-700/50 text-slate-300 dark:text-slate-600 border-slate-200 dark:border-slate-700 cursor-not-allowed line-through'
                    : isSelected
                      ? 'bg-[var(--brand)] text-white border-[var(--brand)]'
                      : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-600 hover:border-[var(--brand)] hover:text-[var(--brand)] dark:hover:text-blue-300 dark:hover:border-blue-400'
                }`}>
                {v.variant_label || v.sku}
                {vStatus === 'low' && (
                  <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-amber-400 border border-white dark:border-slate-800" />
                )}
              </button>
            )
          })}
        </div>
        <ModeToggle item={item} mode={mode} setMode={setMode} />
        <div className="mt-auto"><PriceTag item={item} mode={mode} /></div>
        <div className="flex gap-2 items-center">
          <QtyStepper qty={qty} setQty={setQty} disabled={blocked} />
          <button disabled={blocked} onClick={() => { onAdd(item, mode, qty); setQty(1) }}
            className="flex-1 py-2.5 text-sm font-semibold rounded-lg transition-colors bg-[var(--brand)] text-white hover:bg-[var(--brand-hover)] disabled:bg-slate-100 dark:disabled:bg-slate-700 disabled:text-slate-400 dark:disabled:text-slate-500 disabled:cursor-not-allowed">
            {status === 'out' ? 'Out of Stock' : 'Add to Cart'}
          </button>
        </div>
      </div>
    </div>
  )
}

/** "Your Products" — a compact reorder list: the things this customer buys, at their prices. */
function QuickOrderRow({ item, allowBackorder, onAdd }: { item: CatalogItem; allowBackorder: boolean; onAdd: AddFn }) {
  const [qty, setQty] = useState(1)
  const [added, setAdded] = useState(false)
  const mode: Mode = item.sell_mode === 'case' ? 'case' : 'each'
  const status = stockStatus(item, allowBackorder)
  const price = priceFor(item, mode)
  const blocked = status === 'out' || price === null

  return (
    <li className="flex flex-col sm:flex-row sm:items-center gap-3 px-4 py-3">
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm text-slate-800 dark:text-slate-100 leading-snug">{item.item_name}</p>
        <div className="flex items-center gap-2 mt-1 flex-wrap">
          <span className="text-xs text-slate-400 dark:text-slate-500 font-mono">{item.sku}</span>
          <span className="text-xs text-slate-400">·</span>
          <span className="text-xs text-slate-500 dark:text-slate-400">per {uomLabel(item, mode)}</span>
          <StockBadge status={status} />
        </div>
      </div>
      <div className="flex items-center gap-3 justify-between sm:justify-end">
        <div className="text-right min-w-[5.5rem]"><PriceTag item={item} mode={mode} /></div>
        <QtyStepper qty={qty} setQty={setQty} disabled={blocked} />
        <button disabled={blocked}
          onClick={() => { onAdd(item, mode, qty); setQty(1); setAdded(true); setTimeout(() => setAdded(false), 1200) }}
          className="px-4 py-2.5 text-sm font-semibold rounded-lg transition-colors bg-[var(--brand)] text-white hover:bg-[var(--brand-hover)] disabled:bg-slate-100 dark:disabled:bg-slate-700 disabled:text-slate-400 disabled:cursor-not-allowed whitespace-nowrap min-w-[5.5rem]">
          {added ? 'Added ✓' : 'Add'}
        </button>
      </div>
    </li>
  )
}

function CartSidebar({ cart, total, onClose, onQty, onRemove, onCheckout }: {
  cart: Record<string, CartEntry>
  total: number
  onClose: () => void
  onQty: (key: string, delta: number) => void
  onRemove: (key: string) => void
  onCheckout: () => void
}) {
  const entries = Object.entries(cart)
  return (
    <>
      <div className="fixed inset-0 bg-black/40 dark:bg-black/60 z-40" onClick={onClose} />
      <div className="fixed right-0 top-0 h-full w-full max-w-sm bg-white dark:bg-slate-800 z-50 shadow-2xl flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-2">
            <ShoppingCartIcon className="w-5 h-5 text-[var(--brand)] dark:text-blue-300" />
            <h2 className="font-semibold text-[var(--brand)] dark:text-blue-200">Your Cart</h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
            <XMarkIcon className="w-5 h-5 text-slate-500 dark:text-slate-400" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {entries.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-3 text-slate-400 dark:text-slate-500">
              <ShoppingCartIcon className="w-12 h-12 stroke-1" />
              <p className="text-sm">Your cart is empty</p>
            </div>
          ) : (
            <ul className="space-y-4">
              {entries.map(([key, entry]) => (
                <li key={key} className="flex gap-3 items-start">
                  <div className="bg-slate-100 dark:bg-slate-700 rounded-lg w-14 h-14 flex-shrink-0 flex items-center justify-center overflow-hidden">
                    {entry.item.image_url ? (
                      <Image src={entry.item.image_url} alt={entry.item.item_name} width={56} height={56} className="object-contain" />
                    ) : (
                      <span className="text-slate-400 dark:text-slate-500 text-xs font-bold">{entry.item.item_name.charAt(0)}</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[var(--brand)] dark:text-blue-200 truncate">{entry.item.item_name}</p>
                    <p className="text-xs text-slate-400 dark:text-slate-500">{fmt(entry.unitPrice)} / {uomLabel(entry.item, entry.mode)}</p>
                    <div className="flex items-center gap-2 mt-1.5">
                      <button onClick={() => onQty(key, -1)}
                        className="w-8 h-8 rounded border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 text-sm flex items-center justify-center hover:bg-slate-50 dark:hover:bg-slate-700">−</button>
                      <span className="text-sm font-medium min-w-4 text-center text-slate-800 dark:text-slate-200">{entry.qty}</span>
                      <button onClick={() => onQty(key, 1)}
                        className="w-8 h-8 rounded border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 text-sm flex items-center justify-center hover:bg-slate-50 dark:hover:bg-slate-700">+</button>
                      <button onClick={() => onRemove(key)}
                        className="ml-1 text-xs text-slate-400 hover:text-red-500 dark:hover:text-red-400 transition-colors">Remove</button>
                    </div>
                  </div>
                  <span className="text-sm font-semibold text-[var(--brand)] dark:text-blue-200 whitespace-nowrap">{fmt(entry.qty * entry.unitPrice)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {entries.length > 0 && (
          <div className="border-t border-slate-200 dark:border-slate-700 px-5 py-4 space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-slate-600 dark:text-slate-400">Subtotal</span>
              <span className="font-bold text-[var(--brand)] dark:text-blue-200 text-lg">{fmt(total)}</span>
            </div>
            <button onClick={onCheckout}
              className="w-full py-3 bg-[var(--brand)] hover:bg-[var(--brand-hover)] text-white font-semibold rounded-lg transition-colors text-sm">
              Proceed to Checkout
            </button>
            <button onClick={onClose}
              className="w-full py-2.5 text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 transition-colors">
              Continue Shopping
            </button>
          </div>
        )}
      </div>
    </>
  )
}

function groupItems(items: CatalogItem[]): Array<CatalogItem | CatalogItem[]> {
  const groups = new Map<string, CatalogItem[]>()
  for (const item of items) {
    if (item.variant_group) groups.set(item.variant_group, [...(groups.get(item.variant_group) ?? []), item])
  }
  const result: Array<CatalogItem | CatalogItem[]> = []
  const seen = new Set<string>()
  for (const item of items) {
    if (item.variant_group) {
      if (!seen.has(item.variant_group)) { seen.add(item.variant_group); result.push(groups.get(item.variant_group)!) }
    } else result.push(item)
  }
  return result
}

function ProductGrid({ items, allowBackorder, onAdd }: { items: CatalogItem[]; allowBackorder: boolean; onAdd: AddFn }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
      {groupItems(items).map((entry, i) =>
        Array.isArray(entry)
          ? <VariantCard key={entry[0].variant_group ?? i} variants={entry} allowBackorder={allowBackorder} onAdd={onAdd} />
          : <ProductCard key={entry.inventory_id} item={entry} allowBackorder={allowBackorder} onAdd={onAdd} />
      )}
    </div>
  )
}

export default function CatalogClient({ email, customerName, items, catalogMode, allowBackorder }: Props) {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [cart, setCart] = useState<Record<string, CartEntry>>({})
  const [cartOpen, setCartOpen] = useState(false)
  const [loaded, setLoaded] = useState(false)

  // Restore the cart, re-pricing each line from the CURRENT catalogue so a stale price never lingers.
  useEffect(() => {
    try {
      const saved = JSON.parse(sessionStorage.getItem(CART_KEY) || '[]') as Array<{ id: string; mode: Mode; qty: number }>
      const byId = new Map(items.map(i => [i.inventory_id, i]))
      const next: Record<string, CartEntry> = {}
      for (const s of saved) {
        const item = byId.get(s.id)
        const price = item ? priceFor(item, s.mode) : null
        if (item && price !== null && s.qty > 0) next[`${s.id}_${s.mode}`] = { item, mode: s.mode, qty: s.qty, unitPrice: price }
      }
      setCart(next)
    } catch { /* storage unavailable — start empty */ }
    setLoaded(true)
  }, [items])

  useEffect(() => {
    if (!loaded) return
    try {
      sessionStorage.setItem(CART_KEY, JSON.stringify(Object.values(cart).map(e => ({ id: e.item.inventory_id, mode: e.mode, qty: e.qty }))))
    } catch { /* ignore */ }
  }, [cart, loaded])

  const cartCount = Object.values(cart).reduce((sum, e) => sum + e.qty, 0)
  const cartTotal = Object.values(cart).reduce((sum, e) => sum + e.qty * e.unitPrice, 0)

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return items
    return items.filter(item =>
      item.item_name.toLowerCase().includes(q) ||
      item.sku.toLowerCase().includes(q) ||
      (item.description ?? '').toLowerCase().includes(q)
    )
  }, [items, search])

  const showSections = catalogMode !== 'all'
  const mine = useMemo(() => showSections ? filtered.filter(i => i.assigned) : [], [filtered, showSections])
  const rest = showSections ? filtered.filter(i => !i.assigned) : filtered

  // Group "Your Products" by the optional section heading staff set, keeping their order.
  const mineSections = useMemo(() => {
    const out: Array<{ title: string | null; items: CatalogItem[] }> = []
    for (const i of mine) {
      const t = i.assigned_section || null
      const last = out[out.length - 1]
      if (last && last.title === t) last.items.push(i)
      else out.push({ title: t, items: [i] })
    }
    return out
  }, [mine])

  function addToCart(item: CatalogItem, mode: Mode, qty: number = 1) {
    const price = priceFor(item, mode)
    if (price === null) return
    const key = `${item.inventory_id}_${mode}`
    setCart(prev => ({ ...prev, [key]: { item, mode, unitPrice: price, qty: (prev[key]?.qty ?? 0) + qty } }))
  }

  function updateQty(key: string, delta: number) {
    setCart(prev => {
      const entry = prev[key]
      if (!entry) return prev
      const qty = entry.qty + delta
      if (qty <= 0) { const next = { ...prev }; delete next[key]; return next }
      return { ...prev, [key]: { ...entry, qty } }
    })
  }

  function removeFromCart(key: string) {
    setCart(prev => { const next = { ...prev }; delete next[key]; return next })
  }

  function goToCheckout() {
    // Display copy for the review screen only — the server re-prices every line from the catalogue.
    const cartItems = Object.values(cart).map(e => ({
      id: e.item.inventory_id,
      item_name: e.item.item_name,
      sku: e.item.sku,
      uom: uomLabel(e.item, e.mode),
      mode: e.mode,
      qty: e.qty,
      unit_price: e.unitPrice,
      line_total: e.qty * e.unitPrice,
    }))
    sessionStorage.setItem('hd_cart', JSON.stringify(cartItems))
    router.push('/checkout')
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex flex-col">
      <Header email={email} cartCount={cartCount} onCartClick={() => setCartOpen(true)} />

      <div className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 shadow-sm sticky top-14 sm:top-16 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center gap-4 justify-between">
          <div className="relative flex-1 max-w-md">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name or SKU…"
              className="w-full pl-9 pr-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[var(--brand)] focus:border-transparent" />
          </div>
          <span className="hidden md:block text-sm text-slate-500 dark:text-slate-400 truncate">{customerName}</span>
        </div>
      </div>

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 sm:py-8 flex flex-col gap-10">
        {filtered.length === 0 && (
          <div className="text-center py-24 text-slate-400 dark:text-slate-500 text-sm">
            {search ? `No products match "${search}".` : 'No products available yet.'}
          </div>
        )}

        {mine.length > 0 && (
          <section>
            <div className="flex items-center gap-2 mb-3">
              <StarIcon className="w-5 h-5 text-[var(--brand)] dark:text-blue-300" />
              <h2 className="text-lg font-bold text-[var(--brand)] dark:text-blue-200">Your Products</h2>
              <span className="text-xs text-slate-400 dark:text-slate-500">{mine.length}</span>
            </div>
            <div className="flex flex-col gap-4">
              {mineSections.map((sec, si) => (
                <div key={si} className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
                  {sec.title && (
                    <div className="px-4 py-2 bg-slate-50 dark:bg-slate-700/50 border-b border-slate-200 dark:border-slate-700 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                      {sec.title}
                    </div>
                  )}
                  <ul className="divide-y divide-slate-100 dark:divide-slate-700">
                    {sec.items.map(i => <QuickOrderRow key={i.inventory_id} item={i} allowBackorder={allowBackorder} onAdd={addToCart} />)}
                  </ul>
                </div>
              ))}
            </div>
          </section>
        )}

        {rest.length > 0 && (
          <section>
            {showSections && mine.length > 0 && (
              <h2 className="text-lg font-bold text-[var(--brand)] dark:text-blue-200 mb-3">All Products</h2>
            )}
            <p className="text-xs text-slate-400 dark:text-slate-500 mb-5">
              {rest.length} {rest.length === 1 ? 'product' : 'products'}{search ? ` matching "${search}"` : ''}
            </p>
            <ProductGrid items={rest} allowBackorder={allowBackorder} onAdd={addToCart} />
          </section>
        )}
      </main>

      {cartOpen && (
        <CartSidebar cart={cart} total={cartTotal} onClose={() => setCartOpen(false)}
          onQty={updateQty} onRemove={removeFromCart} onCheckout={goToCheckout} />
      )}
    </div>
  )
}
