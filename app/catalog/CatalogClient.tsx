'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Header from '@/components/Header'
import { MagnifyingGlassIcon, XMarkIcon, ShoppingCartIcon } from '@heroicons/react/24/outline'
import Image from 'next/image'

interface InventoryItem {
  id: string
  item_name: string
  sku: string
  description: string | null
  sell_price: number | null
  sell_price_case: number | null
  sell_mode: string | null
  sell_uom: string | null
  qty_on_hand: number | null
  low_stock_alert: number | null
  image_url: string | null
  variant_group: string | null
  variant_label: string | null
}

interface ContractedPrices {
  [itemId: string]: { price: number | null; price_case: number | null }
}

interface CartEntry {
  item: InventoryItem
  qty: number
  mode: 'each' | 'case'
  unitPrice: number
}

interface Props {
  email: string
  items: InventoryItem[]
  contractedPrices: ContractedPrices
}

function stockStatus(item: InventoryItem): 'in' | 'low' | 'out' {
  const qty = item.qty_on_hand ?? 0
  if (qty <= 0) return 'out'
  if ((item.low_stock_alert ?? 0) > 0 && qty <= (item.low_stock_alert ?? 0)) return 'low'
  return 'in'
}

function resolvePrice(
  item: InventoryItem,
  contracted: ContractedPrices,
  mode: 'each' | 'case'
): number | null {
  const cp = contracted[item.id]
  if (mode === 'each') return cp?.price ?? item.sell_price
  return cp?.price_case ?? item.sell_price_case
}

function fmt(n: number | null): string {
  if (n === null) return '—'
  return '$' + n.toFixed(2)
}

function StockBadge({ status }: { status: 'in' | 'low' | 'out' }) {
  if (status === 'in') return (
    <span className="text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
      In Stock
    </span>
  )
  if (status === 'low') return (
    <span className="text-xs font-medium text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
      Low Stock
    </span>
  )
  return (
    <span className="text-xs font-medium text-slate-500 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-full">
      Out of Stock
    </span>
  )
}

function ProductCard({
  item,
  contracted,
  onAdd,
}: {
  item: InventoryItem
  contracted: ContractedPrices
  onAdd: (item: InventoryItem, mode: 'each' | 'case', qty: number) => void
}) {
  const sellBoth = item.sell_mode === 'both'
  const defaultMode: 'each' | 'case' = item.sell_mode === 'case' ? 'case' : 'each'
  const [mode, setMode] = useState<'each' | 'case'>(defaultMode)
  const [qty, setQty] = useState(1)

  const status = stockStatus(item)
  const price = resolvePrice(item, contracted, mode)
  const isContracted = !!contracted[item.id]

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col overflow-hidden hover:shadow-md transition-shadow">
      {/* Image */}
      <div className="relative bg-slate-100 h-44 flex items-center justify-center">
        {item.image_url ? (
          <Image
            src={item.image_url}
            alt={item.item_name}
            fill
            className="object-contain p-3"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
          />
        ) : (
          <div className="flex flex-col items-center gap-1 text-slate-300">
            <svg className="w-12 h-12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <path d="m9 9 6 6M15 9l-6 6" />
            </svg>
            <span className="text-xs">No image</span>
          </div>
        )}
        {/* Unit badge top-left */}
        {item.sell_mode && (
          <span className="absolute top-2 left-2 text-xs font-semibold text-slate-600 bg-white/90 border border-slate-200 px-2 py-0.5 rounded-full capitalize">
            {item.sell_mode === 'both' ? (mode === 'each' ? (item.sell_uom || 'each') : 'case') : item.sell_mode === 'each' ? (item.sell_uom || 'each') : 'case'}
          </span>
        )}
      </div>

      {/* Body */}
      <div className="flex flex-col flex-1 p-4 gap-3">
        {/* Stock + name */}
        <div className="flex flex-col gap-1.5">
          <StockBadge status={status} />
          <h3 className="font-semibold text-[#0d2240] text-sm leading-snug line-clamp-2">
            {item.item_name}
          </h3>
          <p className="text-xs text-slate-400 font-mono">SKU: {item.sku}</p>
        </div>

        {/* Description */}
        {item.description && (
          <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
            {item.description}
          </p>
        )}

        {/* Mode toggle (only for sell_mode = both) */}
        {sellBoth && (
          <div className="flex rounded-lg border border-slate-200 overflow-hidden text-xs font-medium self-start">
            <button
              onClick={() => setMode('each')}
              className={`px-3 py-1.5 transition-colors capitalize ${mode === 'each' ? 'bg-[#0d2240] text-white' : 'text-slate-600 hover:bg-slate-50'}`}
            >
              {item.sell_uom || 'Each'}
            </button>
            <button
              onClick={() => setMode('case')}
              className={`px-3 py-1.5 transition-colors ${mode === 'case' ? 'bg-[#0d2240] text-white' : 'text-slate-600 hover:bg-slate-50'}`}
            >
              Case
            </button>
          </div>
        )}

        {/* Price */}
        <div className="mt-auto">
          <div className="flex items-baseline gap-2">
            <span className="text-xl font-bold text-[#0d2240]">{fmt(price)}</span>
            {isContracted && price !== null && (
              <span className="text-xs text-blue-600 font-medium">Your price</span>
            )}
          </div>
          {mode === 'each' && item.sell_mode !== 'case' && item.sell_price_case !== null && (
            <p className="text-xs text-slate-400 mt-0.5">
              Case: {fmt(resolvePrice(item, contracted, 'case'))}
            </p>
          )}
        </div>

        {/* Qty + Add to cart */}
        <div className="flex gap-2 items-center">
          <div className="flex items-center border border-slate-200 rounded-lg overflow-hidden text-sm select-none">
            <button
              onClick={() => setQty(q => Math.max(1, q - 1))}
              disabled={status === 'out' || price === null}
              className="px-2.5 py-2 text-slate-600 hover:bg-slate-100 transition-colors disabled:opacity-30"
            >−</button>
            <span className="px-2.5 font-medium text-slate-800 min-w-[2rem] text-center">{qty}</span>
            <button
              onClick={() => setQty(q => q + 1)}
              disabled={status === 'out' || price === null}
              className="px-2.5 py-2 text-slate-600 hover:bg-slate-100 transition-colors disabled:opacity-30"
            >+</button>
          </div>
          <button
            disabled={status === 'out' || price === null}
            onClick={() => { onAdd(item, mode, qty); setQty(1) }}
            className="flex-1 py-2.5 text-sm font-semibold rounded-lg transition-colors
              bg-[#0d2240] text-white hover:bg-[#1a3a6a]
              disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed"
          >
            {status === 'out' ? 'Out of Stock' : 'Add to Cart'}
          </button>
        </div>
      </div>
    </div>
  )
}

function CartSidebar({
  cart,
  total,
  onClose,
  onQty,
  onRemove,
  onCheckout,
}: {
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
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/30 z-40"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="fixed right-0 top-0 h-full w-full max-w-sm bg-white z-50 shadow-2xl flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
          <div className="flex items-center gap-2">
            <ShoppingCartIcon className="w-5 h-5 text-[#0d2240]" />
            <h2 className="font-semibold text-[#0d2240]">Your Cart</h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors">
            <XMarkIcon className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {entries.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-3 text-slate-400">
              <ShoppingCartIcon className="w-12 h-12 stroke-1" />
              <p className="text-sm">Your cart is empty</p>
            </div>
          ) : (
            <ul className="space-y-4">
              {entries.map(([key, entry]) => (
                <li key={key} className="flex gap-3 items-start">
                  <div className="bg-slate-100 rounded-lg w-14 h-14 flex-shrink-0 flex items-center justify-center overflow-hidden">
                    {entry.item.image_url ? (
                      <Image
                        src={entry.item.image_url}
                        alt={entry.item.item_name}
                        width={56}
                        height={56}
                        className="object-contain"
                      />
                    ) : (
                      <span className="text-slate-400 text-xs font-bold">
                        {entry.item.item_name.charAt(0)}
                      </span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[#0d2240] truncate">{entry.item.item_name}</p>
                    <p className="text-xs text-slate-400 capitalize">{entry.mode} · {fmt(entry.unitPrice)} ea</p>
                    <div className="flex items-center gap-2 mt-1.5">
                      <button
                        onClick={() => onQty(key, -1)}
                        className="w-6 h-6 rounded border border-slate-200 text-slate-600 text-sm flex items-center justify-center hover:bg-slate-50"
                      >−</button>
                      <span className="text-sm font-medium w-4 text-center">{entry.qty}</span>
                      <button
                        onClick={() => onQty(key, 1)}
                        className="w-6 h-6 rounded border border-slate-200 text-slate-600 text-sm flex items-center justify-center hover:bg-slate-50"
                      >+</button>
                      <button
                        onClick={() => onRemove(key)}
                        className="ml-1 text-xs text-slate-400 hover:text-red-500 transition-colors"
                      >Remove</button>
                    </div>
                  </div>
                  <span className="text-sm font-semibold text-[#0d2240] whitespace-nowrap">
                    {fmt(entry.qty * entry.unitPrice)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {entries.length > 0 && (
          <div className="border-t border-slate-200 px-5 py-4 space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-slate-600">Subtotal</span>
              <span className="font-bold text-[#0d2240] text-lg">{fmt(total)}</span>
            </div>
            <button
              onClick={onCheckout}
              className="w-full py-3 bg-[#0d2240] hover:bg-[#1a3a6a] text-white font-semibold rounded-lg transition-colors text-sm"
            >
              Proceed to Checkout
            </button>
            <button
              onClick={onClose}
              className="w-full py-2.5 text-sm text-slate-600 hover:text-slate-900 transition-colors"
            >
              Continue Shopping
            </button>
          </div>
        )}
      </div>
    </>
  )
}

// Groups items by variant_group. Returns standalone items and variant groups separately.
function groupItems(items: InventoryItem[]): Array<InventoryItem | InventoryItem[]> {
  const groups = new Map<string, InventoryItem[]>()
  const standalone: Array<InventoryItem | InventoryItem[]> = []

  for (const item of items) {
    if (item.variant_group) {
      const g = groups.get(item.variant_group) ?? []
      g.push(item)
      groups.set(item.variant_group, g)
    } else {
      standalone.push(item)
    }
  }

  // Interleave groups in the order the first variant appeared
  const result: Array<InventoryItem | InventoryItem[]> = []
  const seen = new Set<string>()
  for (const item of items) {
    if (item.variant_group) {
      if (!seen.has(item.variant_group)) {
        seen.add(item.variant_group)
        result.push(groups.get(item.variant_group)!)
      }
    } else {
      result.push(item)
    }
  }
  return result
}

function VariantCard({
  variants,
  contracted,
  onAdd,
}: {
  variants: InventoryItem[]
  contracted: ContractedPrices
  onAdd: (item: InventoryItem, mode: 'each' | 'case', qty: number) => void
}) {
  const [selectedIdx, setSelectedIdx] = useState(0)
  const [qty, setQty] = useState(1)

  const item = variants[selectedIdx]
  const sellBoth = item.sell_mode === 'both'
  const defaultMode: 'each' | 'case' = item.sell_mode === 'case' ? 'case' : 'each'
  const [mode, setMode] = useState<'each' | 'case'>(defaultMode)

  // Reset mode when variant changes
  const handleVariantSelect = (idx: number) => {
    setSelectedIdx(idx)
    const newItem = variants[idx]
    setMode(newItem.sell_mode === 'case' ? 'case' : 'each')
    setQty(1)
  }

  const status = stockStatus(item)
  const price = resolvePrice(item, contracted, mode)
  const isContracted = !!contracted[item.id]

  // Use first variant's image as the group image
  const groupImage = variants.find(v => v.image_url)?.image_url ?? null
  const groupName = variants[0].item_name.replace(/\s*(x-?small|small|medium|large|x-?large|xxl|xs|sm|md|lg|xl)\s*/i, '').trim()

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col overflow-hidden hover:shadow-md transition-shadow">
      {/* Image */}
      <div className="relative bg-slate-100 h-44 flex items-center justify-center">
        {groupImage ? (
          <Image src={groupImage} alt={groupName} fill className="object-contain p-3"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw" />
        ) : (
          <div className="flex flex-col items-center gap-1 text-slate-300">
            <svg className="w-12 h-12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <path d="m9 9 6 6M15 9l-6 6" />
            </svg>
            <span className="text-xs">No image</span>
          </div>
        )}
        <span className="absolute top-2 left-2 text-xs font-semibold text-slate-600 bg-white/90 border border-slate-200 px-2 py-0.5 rounded-full capitalize">
          {sellBoth ? (mode === 'each' ? (item.sell_uom || 'each') : 'case') : item.sell_mode === 'each' ? (item.sell_uom || 'each') : 'case'}
        </span>
      </div>

      <div className="flex flex-col flex-1 p-4 gap-3">
        <div className="flex flex-col gap-1.5">
          <StockBadge status={status} />
          <h3 className="font-semibold text-[#0d2240] text-sm leading-snug">{groupName}</h3>
          <p className="text-xs text-slate-400 font-mono">SKU: {item.sku}</p>
        </div>

        {item.description && (
          <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">{item.description}</p>
        )}

        {/* Variant selector buttons */}
        <div className="flex flex-wrap gap-1.5">
          {variants.map((v, i) => (
            <button
              key={v.id}
              onClick={() => handleVariantSelect(i)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                i === selectedIdx
                  ? 'bg-[#0d2240] text-white border-[#0d2240]'
                  : 'bg-white text-slate-600 border-slate-200 hover:border-[#0d2240] hover:text-[#0d2240]'
              }`}
            >
              {v.variant_label || v.sku}
            </button>
          ))}
        </div>

        {/* Mode toggle */}
        {sellBoth && (
          <div className="flex rounded-lg border border-slate-200 overflow-hidden text-xs font-medium self-start">
            <button onClick={() => setMode('each')}
              className={`px-3 py-1.5 transition-colors capitalize ${mode === 'each' ? 'bg-[#0d2240] text-white' : 'text-slate-600 hover:bg-slate-50'}`}>
              {item.sell_uom || 'Each'}
            </button>
            <button onClick={() => setMode('case')}
              className={`px-3 py-1.5 transition-colors ${mode === 'case' ? 'bg-[#0d2240] text-white' : 'text-slate-600 hover:bg-slate-50'}`}>
              Case
            </button>
          </div>
        )}

        {/* Price */}
        <div className="mt-auto">
          <div className="flex items-baseline gap-2">
            <span className="text-xl font-bold text-[#0d2240]">{fmt(price)}</span>
            {isContracted && price !== null && (
              <span className="text-xs text-blue-600 font-medium">Your price</span>
            )}
          </div>
        </div>

        {/* Qty + Add */}
        <div className="flex gap-2 items-center">
          <div className="flex items-center border border-slate-200 rounded-lg overflow-hidden text-sm select-none">
            <button onClick={() => setQty(q => Math.max(1, q - 1))} disabled={status === 'out' || price === null}
              className="px-2.5 py-2 text-slate-600 hover:bg-slate-100 transition-colors disabled:opacity-30">−</button>
            <span className="px-2.5 font-medium text-slate-800 min-w-[2rem] text-center">{qty}</span>
            <button onClick={() => setQty(q => q + 1)} disabled={status === 'out' || price === null}
              className="px-2.5 py-2 text-slate-600 hover:bg-slate-100 transition-colors disabled:opacity-30">+</button>
          </div>
          <button
            disabled={status === 'out' || price === null}
            onClick={() => { onAdd(item, mode, qty); setQty(1) }}
            className="flex-1 py-2.5 text-sm font-semibold rounded-lg transition-colors bg-[#0d2240] text-white hover:bg-[#1a3a6a] disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed"
          >
            {status === 'out' ? 'Out of Stock' : 'Add to Cart'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function CatalogClient({ email, items, contractedPrices }: Props) {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [cart, setCart] = useState<Record<string, CartEntry>>({})
  const [cartOpen, setCartOpen] = useState(false)

  const cartCount = Object.values(cart).reduce((sum, e) => sum + e.qty, 0)
  const cartTotal = Object.values(cart).reduce((sum, e) => sum + e.qty * e.unitPrice, 0)

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    if (!q) return items
    return items.filter(item =>
      item.item_name.toLowerCase().includes(q) ||
      item.sku.toLowerCase().includes(q) ||
      (item.description ?? '').toLowerCase().includes(q)
    )
  }, [items, search])

  function addToCart(item: InventoryItem, mode: 'each' | 'case', qty: number = 1) {
    const price = resolvePrice(item, contractedPrices, mode)
    if (price === null) return
    const key = `${item.id}_${mode}`
    setCart(prev => ({
      ...prev,
      [key]: {
        item,
        qty: (prev[key]?.qty ?? 0) + qty,
        mode,
        unitPrice: price,
      }
    }))
  }

  function updateQty(key: string, delta: number) {
    setCart(prev => {
      const entry = prev[key]
      if (!entry) return prev
      const qty = entry.qty + delta
      if (qty <= 0) {
        const next = { ...prev }
        delete next[key]
        return next
      }
      return { ...prev, [key]: { ...entry, qty } }
    })
  }

  function removeFromCart(key: string) {
    setCart(prev => {
      const next = { ...prev }
      delete next[key]
      return next
    })
  }

  function goToCheckout() {
    const cartItems = Object.values(cart).map(e => ({
      id: e.item.id,
      item_name: e.item.item_name,
      sku: e.item.sku,
      mode: e.mode,
      qty: e.qty,
      unit_price: e.unitPrice,
      line_total: e.qty * e.unitPrice,
    }))
    sessionStorage.setItem('hd_cart', JSON.stringify(cartItems))
    router.push('/checkout')
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Header email={email} cartCount={cartCount} onCartClick={() => setCartOpen(true)} />

      {/* Search bar */}
      <div className="bg-white border-b border-slate-200 shadow-sm sticky top-16 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <div className="relative max-w-md">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by name or SKU…"
              className="w-full pl-9 pr-4 py-2 rounded-lg border border-slate-200 bg-slate-50 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#1a4a8a] focus:border-transparent"
            />
          </div>
        </div>
      </div>

      {/* Grid */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
        {filtered.length === 0 ? (
          <div className="text-center py-24 text-slate-400 text-sm">
            {search ? `No products match "${search}".` : 'No products available yet.'}
          </div>
        ) : (
          <>
            <p className="text-xs text-slate-400 mb-5">
              {filtered.length} {filtered.length === 1 ? 'product' : 'products'}
              {search ? ` matching "${search}"` : ''}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {groupItems(filtered).map((entry, i) =>
                Array.isArray(entry) ? (
                  <VariantCard
                    key={entry[0].variant_group ?? i}
                    variants={entry}
                    contracted={contractedPrices}
                    onAdd={addToCart}
                  />
                ) : (
                  <ProductCard
                    key={entry.id}
                    item={entry}
                    contracted={contractedPrices}
                    onAdd={addToCart}
                  />
                )
              )}
            </div>
          </>
        )}
      </main>

      {cartOpen && (
        <CartSidebar
          cart={cart}
          total={cartTotal}
          onClose={() => setCartOpen(false)}
          onQty={updateQty}
          onRemove={removeFromCart}
          onCheckout={goToCheckout}
        />
      )}
    </div>
  )
}
