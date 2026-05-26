'use client'

type OrderItem = {
  id: string
  item_name: string
  sku: string
  sell_mode: string
  qty: number
  unit_price: number
  line_total: number
}

type Order = {
  order_number: string
  placed_at: string
  paid_at: string | null
  subtotal: number
  notes: string | null
  carrier: string | null
  tracking_number: string | null
  portal_order_items: OrderItem[]
}

type Props = {
  order: Order
  customerEmail: string
}

function money(n: number) {
  return '$' + Number(n).toFixed(2)
}

function fmtDate(ts: string) {
  return new Date(ts).toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
  })
}

export default function PrintReceiptButton({ order, customerEmail }: Props) {
  function handlePrint() {
    const items = order.portal_order_items
    const itemRows = items.map(li => `
      <tr>
        <td style="padding:8px 10px;border-bottom:1px solid #e2e8f0;">
          <div style="font-weight:600;color:#1e293b;">${li.item_name}</div>
          <div style="font-size:11px;color:#94a3b8;margin-top:2px;">SKU: ${li.sku} &middot; ${li.sell_mode}</div>
        </td>
        <td style="padding:8px 10px;border-bottom:1px solid #e2e8f0;text-align:center;color:#475569;">${li.qty}</td>
        <td style="padding:8px 10px;border-bottom:1px solid #e2e8f0;text-align:right;color:#475569;">${money(li.unit_price)}</td>
        <td style="padding:8px 10px;border-bottom:1px solid #e2e8f0;text-align:right;font-weight:600;color:#1e293b;">${money(li.line_total)}</td>
      </tr>
    `).join('')

    const trackingLine = order.tracking_number
      ? `<p style="margin:4px 0 0;font-size:12px;color:#475569;">
           <strong>Tracking:</strong> ${order.carrier ? order.carrier + ' ' : ''}${order.tracking_number}
         </p>`
      : ''

    const notesLine = order.notes
      ? `<p style="margin:8px 0 0;font-size:12px;color:#475569;"><strong>Notes:</strong> ${order.notes}</p>`
      : ''

    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Receipt ${order.order_number}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #1e293b; background: #fff; padding: 40px; }
    @media print {
      body { padding: 20px; }
      .no-print { display: none !important; }
    }
    .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 32px; padding-bottom: 24px; border-bottom: 2px solid #0d2240; }
    .brand { display: flex; align-items: center; gap: 10px; }
    .brand-text h1 { font-size: 18px; font-weight: 800; color: #0d2240; }
    .brand-text p { font-size: 12px; color: #64748b; margin-top: 2px; }
    .receipt-label { text-align: right; }
    .receipt-label h2 { font-size: 22px; font-weight: 700; color: #0d2240; }
    .receipt-label p { font-size: 12px; color: #64748b; margin-top: 4px; }
    .meta { display: flex; gap: 40px; margin-bottom: 28px; }
    .meta-block p { font-size: 12px; color: #64748b; margin-bottom: 2px; }
    .meta-block strong { font-size: 13px; color: #1e293b; display: block; margin-top: 1px; }
    table { width: 100%; border-collapse: collapse; font-size: 13px; margin-bottom: 16px; }
    thead { background: #f1f5f9; }
    thead th { padding: 10px; text-align: left; font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: .5px; }
    thead th:nth-child(2) { text-align: center; }
    thead th:nth-child(3), thead th:nth-child(4) { text-align: right; }
    tfoot td { padding: 10px; font-size: 14px; }
    .total-label { text-align: right; font-weight: 700; color: #475569; }
    .total-value { text-align: right; font-weight: 800; font-size: 16px; color: #0d2240; width: 120px; }
    .paid-badge { display: inline-block; background: #dcfce7; color: #166534; font-size: 11px; font-weight: 700; padding: 3px 10px; border-radius: 999px; border: 1px solid #bbf7d0; margin-top: 6px; }
    .footer-note { font-size: 11px; color: #94a3b8; margin-top: 28px; padding-top: 16px; border-top: 1px solid #e2e8f0; text-align: center; }
    .print-btn { display: block; margin: 0 auto 28px; padding: 10px 28px; background: #0d2240; color: #fff; font-size: 14px; font-weight: 600; border: none; border-radius: 8px; cursor: pointer; }
    .print-btn:hover { background: #1a3a6a; }
  </style>
</head>
<body>
  <button class="print-btn no-print" onclick="window.print()">Print / Save as PDF</button>

  <div class="header">
    <div class="brand">
      <svg width="36" height="24" viewBox="0 0 60 36" fill="none">
        <path d="M4 18 Q15 8 30 18 Q45 28 56 18" stroke="#0d2240" stroke-width="4" stroke-linecap="round" fill="none" opacity="0.4"/>
        <path d="M4 26 Q15 16 30 26 Q45 36 56 26" stroke="#0d2240" stroke-width="4" stroke-linecap="round" fill="none"/>
      </svg>
      <div class="brand-text">
        <h1>Twin Harbors Medical Supply</h1>
        <p>HarborDirect Customer Portal</p>
      </div>
    </div>
    <div class="receipt-label">
      <h2>Payment Receipt</h2>
      <p>${order.order_number}</p>
    </div>
  </div>

  <div class="meta">
    <div class="meta-block">
      <p>Customer</p>
      <strong>${customerEmail}</strong>
    </div>
    <div class="meta-block">
      <p>Order Date</p>
      <strong>${fmtDate(order.placed_at)}</strong>
    </div>
    ${order.paid_at ? `
    <div class="meta-block">
      <p>Payment Date</p>
      <strong>${fmtDate(order.paid_at)}</strong>
      <span class="paid-badge">&#10003; Paid</span>
    </div>` : ''}
  </div>

  <table>
    <thead>
      <tr>
        <th>Item</th>
        <th style="text-align:center;">Qty</th>
        <th style="text-align:right;">Unit Price</th>
        <th style="text-align:right;">Total</th>
      </tr>
    </thead>
    <tbody>
      ${itemRows}
    </tbody>
    <tfoot>
      <tr>
        <td colspan="3" class="total-label">Order Total</td>
        <td class="total-value">${money(order.subtotal)}</td>
      </tr>
    </tfoot>
  </table>

  ${trackingLine || notesLine ? `<div style="margin-bottom:16px;">${trackingLine}${notesLine}</div>` : ''}

  <p class="footer-note">
    Twin Harbors Medical Supply &middot; Thank you for your order.<br/>
    Questions? Contact us at your account representative.
  </p>
</body>
</html>`

    const w = window.open('', '_blank', 'width=820,height=700')
    if (!w) return
    w.document.write(html)
    w.document.close()
  }

  return (
    <button
      onClick={handlePrint}
      className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-[#0d2240] dark:hover:text-blue-300 transition-colors"
      title="Print or save receipt as PDF"
    >
      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
      </svg>
      Print Receipt
    </button>
  )
}
