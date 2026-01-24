'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Search, SlidersHorizontal, ArrowUp, ArrowDown, Plus, Clock, Users, Eye, Gavel } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import Header from '@/components/Header';
import BottomNav from '@/components/BottomNav';
import { useAuctions, useCountdown } from '@/hooks/useAuction';
import { AUCTION_CATEGORIES } from '@/types/auction';
import type { AuctionFilters, AuctionType, Auction } from '@/types/auction';

function AuctionCard({ auction }: { auction: Auction }) {
  const { theme } = useTheme();
  const timeLeft = useCountdown(auction.ends_at);
  const isUp = auction.auction_type === 'up';
  const formatPrice = (price: number) => price.toLocaleString('ko-KR') + '원';
  const formatTimeLeft = () => {
    if (timeLeft.isExpired) return '마감';
    if (timeLeft.days > 0) return `${timeLeft.days}일 ${timeLeft.hours}시간`;
    if (timeLeft.hours > 0) return `${timeLeft.hours}시간 ${timeLeft.minutes}분`;
    return `${timeLeft.minutes}분 ${timeLeft.seconds}초`;
  };

  return (
    <Link href={`/auction/${auction.id}`}>
      <div className="rounded-2xl overflow-hidden transition-colors duration-300" style={{ backgroundColor: theme.bgCard, border: `1px solid ${theme.borderLight}` }}>
        <div className="relative aspect-square" style={{ backgroundColor: theme.bgInput }}>
          {auction.images?.[0] ? (
            <Image src={auction.images[0]} alt={auction.title} fill className="object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Gavel className="w-10 h-10" style={{ color: theme.textMuted }} />
            </div>
          )}
          <div className="absolute top-2 left-2 px-2 py-1 rounded-full text-xs font-bold flex items-center gap-1" style={{ backgroundColor: isUp ? '#3B82F6' : '#F97316', color: '#FFFFFF' }}>
            {isUp ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
            {isUp ? '업경매' : '다운경매'}
          </div>
          {auction.status === 'sold' && <div className="absolute top-2 right-2 px-2 py-1 rounded-full text-xs font-bold bg-green-500 text-white">낙찰완료</div>}
          {auction.bid_visibility === 'private' && auction.status === 'active' && <div className="absolute bottom-2 right-2 px-2 py-1 rounded-full text-xs bg-black/70 text-white">🔒 비공개</div>}
        </div>
        <div className="p-3">
          <h3 className="font-medium truncate mb-1 text-[14px]" style={{ color: theme.textPrimary }}>{auction.title}</h3>
          <div className="mb-2">
            <p className="text-[11px]" style={{ color: theme.textMuted }}>{auction.bid_visibility === 'private' && auction.status === 'active' ? '현재가 비공개' : '현재가'}</p>
            <p className="text-[16px] font-bold" style={{ color: theme.accent }}>{auction.bid_visibility === 'private' && auction.status === 'active' ? '???' : formatPrice(auction.current_price)}</p>
          </div>
          <div className="flex items-center justify-between text-[11px]" style={{ color: theme.textMuted }}>
            <div className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              <span className={timeLeft.isExpired ? 'text-red-500' : ''}>{formatTimeLeft()}</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1"><Users className="w-3 h-3" />{auction.bid_count}</span>
              <span className="flex items-center gap-1"><Eye className="w-3 h-3" />{auction.view_count}</span>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}

function AuctionCardSkeleton() {
  const { theme } = useTheme();
  return (
    <div className="rounded-2xl overflow-hidden" style={{ backgroundColor: theme.bgCard, border: `1px solid ${theme.borderLight}` }}>
      <div className="aspect-square animate-pulse" style={{ backgroundColor: theme.bgInput }} />
      <div className="p-3 space-y-2">
        <div className="h-4 rounded animate-pulse" style={{ backgroundColor: theme.bgInput }} />
        <div className="h-6 w-2/3 rounded animate-pulse" style={{ backgroundColor: theme.bgInput }} />
      </div>
    </div>
  );
}

export default function AuctionListPage() {
  const { theme, isDark, mounted } = useTheme();
  const [filters, setFilters] = useState<AuctionFilters>({});
  const [showFilters, setShowFilters] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const { auctions, loading, error } = useAuctions(filters);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setFilters(prev => ({ ...prev, search: searchTerm }));
  };
  const handleTypeFilter = (type: AuctionType | undefined) => setFilters(prev => ({ ...prev, auction_type: type }));
  const handleCategoryFilter = (category: string | undefined) => setFilters(prev => ({ ...prev, category }));

  if (!mounted) return null;

  return (
    <div className="min-h-screen transition-colors duration-300" style={{ backgroundColor: theme.bgMain }}>
      <Header title="경매" />
      <main className="max-w-[631px] mx-auto pt-14 pb-20">
        <div className="px-4 py-4" style={{ backgroundColor: theme.bgCard, borderBottom: `1px solid ${theme.borderLight}` }}>
          <div className="flex justify-end mb-4">
            <Link href="/auction/create" className="flex items-center gap-1 px-4 py-2 rounded-xl text-sm font-semibold transition-colors" style={{ backgroundColor: theme.accent, color: isDark ? '#121212' : '#FFFFFF' }}>
              <Plus className="w-4 h-4" />경매 등록
            </Link>
          </div>
          <form onSubmit={handleSearch} className="flex gap-2 mb-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: theme.textMuted }} />
              <input type="text" placeholder="상품명 검색" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm transition-colors duration-300" style={{ backgroundColor: theme.bgInput, color: theme.textPrimary, border: `1px solid ${theme.borderLight}` }} />
            </div>
            <button type="button" onClick={() => setShowFilters(!showFilters)} className="p-2.5 rounded-xl transition-colors" style={{ backgroundColor: showFilters ? theme.accent : theme.bgInput, color: showFilters ? (isDark ? '#121212' : '#FFFFFF') : theme.textPrimary, border: `1px solid ${showFilters ? theme.accent : theme.borderLight}` }}>
              <SlidersHorizontal className="w-5 h-5" />
            </button>
          </form>
          <div className="flex gap-2">
            <button onClick={() => handleTypeFilter(undefined)} className="px-4 py-2 rounded-full text-sm font-medium transition-colors" style={{ backgroundColor: !filters.auction_type ? theme.textPrimary : theme.bgInput, color: !filters.auction_type ? theme.bgMain : theme.textPrimary }}>전체</button>
            <button onClick={() => handleTypeFilter('up')} className="px-4 py-2 rounded-full text-sm font-medium transition-colors flex items-center gap-1" style={{ backgroundColor: filters.auction_type === 'up' ? '#3B82F6' : (isDark ? '#1E3A5F' : '#EFF6FF'), color: filters.auction_type === 'up' ? '#FFFFFF' : '#3B82F6' }}>
              <ArrowUp className="w-4 h-4" />업경매
            </button>
            <button onClick={() => handleTypeFilter('down')} className="px-4 py-2 rounded-full text-sm font-medium transition-colors flex items-center gap-1" style={{ backgroundColor: filters.auction_type === 'down' ? '#F97316' : (isDark ? '#4A2C1A' : '#FFF7ED'), color: filters.auction_type === 'down' ? '#FFFFFF' : '#F97316' }}>
              <ArrowDown className="w-4 h-4" />다운경매
            </button>
          </div>
          {showFilters && (
            <div className="mt-4 p-4 rounded-xl space-y-4" style={{ backgroundColor: theme.bgInput }}>
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: theme.textPrimary }}>카테고리</label>
                <div className="flex flex-wrap gap-2">
                  <button onClick={() => handleCategoryFilter(undefined)} className="px-3 py-1 rounded-full text-sm transition-colors" style={{ backgroundColor: !filters.category ? theme.textPrimary : theme.bgCard, color: !filters.category ? theme.bgMain : theme.textMuted, border: `1px solid ${theme.borderLight}` }}>전체</button>
                  {AUCTION_CATEGORIES.map((cat) => (
                    <button key={cat} onClick={() => handleCategoryFilter(cat)} className="px-3 py-1 rounded-full text-sm transition-colors" style={{ backgroundColor: filters.category === cat ? theme.textPrimary : theme.bgCard, color: filters.category === cat ? theme.bgMain : theme.textMuted, border: `1px solid ${theme.borderLight}` }}>{cat}</button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
        <div className="px-4 py-4">
          {error && <div className="text-center py-10 rounded-2xl" style={{ backgroundColor: theme.bgCard, color: '#EF4444' }}>{error}</div>}
          {loading ? (
            <div className="grid grid-cols-2 gap-3">{[...Array(6)].map((_, i) => <AuctionCardSkeleton key={i} />)}</div>
          ) : auctions.length === 0 ? (
            <div className="rounded-2xl p-8 text-center transition-colors duration-300" style={{ backgroundColor: theme.bgCard, border: `1px solid ${theme.borderLight}` }}>
              <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-3" style={{ backgroundColor: theme.bgInput }}>
                <Gavel className="w-6 h-6" style={{ color: theme.textMuted }} />
              </div>
              <p className="font-medium text-sm mb-4" style={{ color: theme.textMuted }}>진행 중인 경매가 없습니다.</p>
              <Link href="/auction/create" className="inline-flex items-center gap-1 px-4 py-2 rounded-xl text-sm font-semibold" style={{ backgroundColor: theme.accent, color: isDark ? '#121212' : '#FFFFFF' }}>
                <Plus className="w-4 h-4" />첫 경매 등록하기
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">{auctions.map((auction) => <AuctionCard key={auction.id} auction={auction} />)}</div>
          )}
        </div>
      </main>
      <BottomNav />
    </div>
  );
}
