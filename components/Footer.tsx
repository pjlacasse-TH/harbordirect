export default function Footer() {
  return (
    <footer className="bg-[#0d2240] text-white/50 text-xs py-3 px-6 flex items-center justify-between mt-auto">
      <div className="flex items-center gap-2">
        <svg width="20" height="13" viewBox="0 0 60 36" fill="none">
          <path d="M4 18 Q15 8 30 18 Q45 28 56 18" stroke="white" strokeWidth="4" strokeLinecap="round" fill="none" opacity="0.5"/>
          <path d="M4 26 Q15 16 30 26 Q45 36 56 26" stroke="white" strokeWidth="4" strokeLinecap="round" fill="none"/>
        </svg>
        <span>HarborDirect &middot; Twin Harbors Medical Supply</span>
      </div>
      <span>v2.0.4</span>
    </footer>
  )
}
