'use client';

import { useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowLeft, ArrowUp, ArrowDown, Clock, Users, Eye, Heart, Share2, ChevronLeft, ChevronRight, Gavel, Crown, MessageCircle, Copy, Check } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuction, useCountdown, useAuctionWatch, useBid } from '@/hooks/useAuction';
import { CONDITION_LABELS } from '@/types/auction';
import type { Auction, AuctionBid } from '@/types/auction';

// 이미지 슬라이더 (공구 스타일)
function ImageSlider({ images }: { images: string[] }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [touchStart, setTouchStart] = useState(0);
  const [touchEnd, setTouchEnd] = useState(0);
  const { theme } = useTheme();

  const handleTouchStart = (e: React.TouchEvent) => setTouchStart(e.touches[0].clientX);
  const handleTouchMove = (e: React.TouchEvent) => setTouchEnd(e.touches[0].clientX);
  const handleTouchEnd = () => {
    if (touchStart - touchEnd > 50) setCurrentIndex(prev => (prev + 1) % images.length);
    if (touchEnd - touchStart > 50) setCurrentIndex(prev => (prev - 1 + images.length) % images.length);
  };

  if (images.length === 0) {
    return (
      <div className="w-full aspect-square flex items-center justify-center" style={{ backgroundColor: theme.bgInput }}>
        <Gavel className="w-16 h-16" style={{ color: theme.textMuted }} />
      </div>
    );
  }

  return (
    <div className="relative w-full aspect-square overflow-hidden" style={{ backgroundColor: theme.bgInput }}>
      <div className="w-full h-full" onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd}>
        <Image src={images[currentIndex]} alt="" fill className="object-contain" sizes="(max-width: 631px) 100vw, 631px" />
      </div>
      {images.length > 1 && (
        <>
          <button onClick={() => setCurrentIndex(prev => (prev - 1 + images.length) % images.length)} className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full flex items-center justify-center bg-black/40">
            <ChevronLeft className="w-5 h-5 text-white" />
          </button>
          <button onClick={() => setCurrentIndex(prev => (prev + 1) % images.length)} className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full flex items-center justify-center bg-black/40">
            <ChevronRight className="w-5 h-5 text-white" />
          </button>
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
            {images.map((_, idx) => (
              <div key={idx} className={`w-2 h-2 rounded-full transition-all ${idx === currentIndex ? 'bg-white w-4' : 'bg-white/50'}`} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// 타임어택 카운터 (공구 스타일)
function CountdownTimer({ endDate, isUp }: { endDate: string; isUp: boolean }) {
  const timeLeft = useCountdown(endDate);

  if (timeLeft.isExpired) {
    return (
      <div className="text-center py-4 rounded-2xl" style={{ backgroundColor: "#1a1a1a" }}>
        <span className="text-xl font-bold" style={{ color: "#EF4444" }}>마감되었습니다</span>
      </div>
    );
  }

  return (
    <div className="py-4 px-3 rounded-2xl" style={{ backgroundColor: "#1a1a1a" }}>
      <p className="text-center text-xs mb-3" style={{ color: "#ffffff80" }}>마감까지 남은 시간</p>
      <div className="flex items-center justify-center gap-1 flex-wrap">
        {timeLeft.days > 0 && (
          <>
            <span className="text-2xl font-black text-white">{timeLeft.days}</span>
            <span className="text-2xl font-medium text-white/60 mr-2">일</span>
          </>
        )}
        <span className="text-2xl font-bold" style={{ color: "#FBBF24" }}>{String(timeLeft.hours).padStart(2, '0')}</span>
        <span className="text-2xl font-medium" style={{ color: "#FBBF24" }}>시</span>
        <span className="text-2xl font-bold" style={{ color: "#FBBF24" }}>{String(timeLeft.minutes).padStart(2, '0')}</span>
        <span className="text-2xl font-medium" style={{ color: "#FBBF24" }}>분</span>
        <span className="text-2xl font-bold" style={{ color: "#EF4444" }}>{String(timeLeft.seconds).padStart(2, '0')}</span>
        <span className="text-2xl font-medium" style={{ color: "#EF4444" }}>초</span>
      </div>
    </div>
  );
}

// 입찰 모달
function BidModal({ auction, onClose }: { auction: Auction; onClose: () => void }) {
  const { theme, isDark } = useTheme();
  const { placeBid, loading, error } = useBid();
  const isUp = auction.auction_type === 'up';
  const minBidAmount = isUp ? auction.current_price + auction.bid_increment : auction.current_price;
  const [bidAmount, setBidAmount] = useState(minBidAmount);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);
  const formatPrice = (price: number) => price.toLocaleString('ko-KR') + '원';

  const handleBid = async () => {
    const bidResult = await placeBid(auction.id, bidAmount);
    if (bidResult.success) {
      setResult({ success: true, message: bidResult.message || '입찰이 완료되었습니다!' });
      if (bidResult.instant_win) setTimeout(() => { onClose(); window.location.reload(); }, 2000);
    } else {
      setResult({ success: false, message: bidResult.error || '입찰에 실패했습니다.' });
    }
  };

  const quickBidAmounts = isUp ? [minBidAmount, minBidAmount + auction.bid_increment, minBidAmount + auction.bid_increment * 2, minBidAmount + auction.bid_increment * 5] : [];

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-full max-w-[631px] mx-auto rounded-t-2xl sm:rounded-2xl p-6" style={{ backgroundColor: theme.bgCard }}>
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            {isUp ? <ArrowUp className="w-5 h-5" style={{ color: '#3B82F6' }} /> : <ArrowDown className="w-5 h-5" style={{ color: '#F97316' }} />}
            <h2 className="text-lg font-bold" style={{ color: theme.textPrimary }}>{isUp ? '입찰하기' : '바로 낙찰받기'}</h2>
          </div>
          <button onClick={onClose} className="p-1 text-2xl" style={{ color: theme.textMuted }}>×</button>
        </div>
        
        {result && (
          <div className="mb-6 p-4 rounded-xl" style={{ backgroundColor: result.success ? '#22C55E20' : '#EF444420', color: result.success ? '#22C55E' : '#EF4444' }}>
            <p className="font-medium">{result.message}</p>
          </div>
        )}
        
        {!result?.success && (
          <>
            <div className="rounded-xl p-4 mb-6" style={{ backgroundColor: theme.bgInput }}>
              <div className="flex justify-between items-center">
                <span style={{ color: theme.textMuted }}>현재가</span>
                <span className="text-xl font-bold" style={{ color: theme.textPrimary }}>{formatPrice(auction.current_price)}</span>
              </div>
            </div>
            
            {isUp ? (
              <>
                <div className="grid grid-cols-2 gap-2 mb-4">
                  {quickBidAmounts.map((amount) => (
                    <button 
                      key={amount} 
                      onClick={() => setBidAmount(amount)} 
                      className="py-2 px-4 rounded-lg text-sm font-medium transition-colors" 
                      style={{ 
                        backgroundColor: bidAmount === amount ? '#3B82F620' : theme.bgInput, 
                        border: `1px solid ${bidAmount === amount ? '#3B82F6' : theme.borderLight}`, 
                        color: bidAmount === amount ? '#3B82F6' : theme.textPrimary 
                      }}
                    >
                      {formatPrice(amount)}
                    </button>
                  ))}
                </div>
                <div className="mb-6">
                  <label className="block text-sm font-medium mb-1" style={{ color: theme.textPrimary }}>입찰 금액</label>
                  <div className="relative">
                    <input 
                      type="number" 
                      value={bidAmount} 
                      onChange={(e) => setBidAmount(Math.max(minBidAmount, Number(e.target.value)))} 
                      step={auction.bid_increment} 
                      min={minBidAmount} 
                      className="w-full px-4 py-3 rounded-xl text-lg font-bold" 
                      style={{ backgroundColor: theme.bgInput, color: theme.textPrimary, border: `1px solid ${theme.borderLight}` }} 
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2" style={{ color: theme.textMuted }}>원</span>
                  </div>
                </div>
              </>
            ) : (
              <div className="mb-6 text-center py-8">
                <p style={{ color: theme.textMuted }}>현재 가격으로 바로 낙찰받습니다</p>
                <p className="text-3xl font-bold mt-2" style={{ color: '#F97316' }}>{formatPrice(auction.current_price)}</p>
              </div>
            )}
            
            {error && <p className="mb-4 text-sm text-red-500">{error}</p>}
            
            <button 
              onClick={handleBid} 
              disabled={loading || (isUp && bidAmount < minBidAmount)} 
              className="w-full py-4 rounded-xl text-white font-bold text-lg transition-colors disabled:opacity-50" 
              style={{ backgroundColor: isUp ? '#3B82F6' : '#F97316' }}
            >
              {loading ? '처리중...' : isUp ? `${formatPrice(bidAmount)} 입찰하기` : `${formatPrice(auction.current_price)} 낙찰받기`}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// 입찰 내역 (개선된 버전)
function BidHistory({ bids, auction, currentUserId }: { bids: AuctionBid[]; auction: Auction; currentUserId?: string }) {
  const { theme } = useTheme();
  const formatPrice = (price: number) => price.toLocaleString('ko-KR') + '원';
  
  const formatBidTime = (dateString: string) => {
    const date = new Date(dateString);
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${month}/${day} ${hours}:${minutes}`;
  };

  // 입찰자 번호 매핑
  const bidderNumberMap = useMemo(() => {
    const map = new Map<string, number>();
    const sortedByTime = [...bids].sort((a, b) => 
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );
    let num = 1;
    sortedByTime.forEach(bid => {
      if (bid.bidder_id && !map.has(bid.bidder_id)) {
        map.set(bid.bidder_id, num++);
      }
    });
    return map;
  }, [bids]);

  if (bids.length === 0) {
    return (
      <div className="text-center py-8 rounded-xl" style={{ backgroundColor: theme.bgInput }}>
        <Gavel className="w-10 h-10 mx-auto mb-2" style={{ color: theme.textMuted }} />
        <p style={{ color: theme.textMuted }}>아직 입찰 내역이 없습니다.</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {bids.map((bid, index) => {
        const bidderNum = bidderNumberMap.get(bid.bidder_id) || 0;
        const isMe = bid.bidder_id === currentUserId;
        const isWinner = bid.is_winning;
        
        return (
          <div 
            key={bid.id} 
            className="flex items-center gap-3 p-3 rounded-xl"
            style={{ 
              backgroundColor: isWinner ? '#FBBF2415' : theme.bgInput, 
              border: isWinner ? '2px solid #FBBF24' : `1px solid ${theme.borderLight}` 
            }}
          >
            {/* 참가자 번호 */}
            <div className="relative">
              <div 
                className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm"
                style={{ 
                  backgroundColor: isWinner ? '#FBBF24' : theme.bgCard,
                  color: isWinner ? '#78350F' : theme.textMuted
                }}
              >
                {bidderNum}
              </div>
              {isWinner && (
                <div className="absolute -top-1 -right-1 w-5 h-5 bg-yellow-400 rounded-full flex items-center justify-center">
                  <Crown className="w-3 h-3 text-yellow-800" />
                </div>
              )}
            </div>
            
            {/* 참가자 정보 */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="font-bold text-sm" style={{ color: isWinner ? '#FBBF24' : theme.textPrimary }}>
                  참가자 {bidderNum}
                  {isMe && <span className="text-xs ml-1" style={{ color: theme.accent }}>(나)</span>}
                </p>
                {isWinner && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full font-bold" style={{ backgroundColor: '#FBBF24', color: '#78350F' }}>
                    최고입찰
                  </span>
                )}
              </div>
              <p className="text-xs flex items-center gap-1" style={{ color: theme.textMuted }}>
                <Clock className="w-3 h-3" />
                {formatBidTime(bid.created_at)}
              </p>
            </div>
            
            {/* 입찰 금액 */}
            <div className="text-right">
              <p className="font-bold text-base" style={{ color: isWinner ? '#FBBF24' : theme.textPrimary }}>
                {formatPrice(bid.bid_amount)}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// 낙찰자 정보 & 채팅
function WinnerSection({ auction, bids, currentUserId }: { auction: Auction; bids: AuctionBid[]; currentUserId?: string }) {
  const { theme, isDark } = useTheme();
  const [copied, setCopied] = useState(false);
  
  const winningBid = bids.find(b => b.is_winning);
  const isWinner = winningBid?.bidder_id === currentUserId;
  const isSeller = auction.seller_id === currentUserId;
  const formatPrice = (price: number) => price.toLocaleString('ko-KR') + '원';

  if (!winningBid || auction.status === 'active') return null;

  const handleCopy = async () => {
    // 낙찰 정보 복사
    const text = `[여주모아 경매 낙찰]\n상품: ${auction.title}\n낙찰가: ${formatPrice(winningBid.bid_amount)}`;
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="rounded-2xl p-4 mb-4" style={{ backgroundColor: '#FBBF2415', border: '2px solid #FBBF24' }}>
      <div className="flex items-center gap-2 mb-3">
        <Crown className="w-6 h-6" style={{ color: '#FBBF24' }} />
        <h3 className="font-bold text-lg" style={{ color: '#FBBF24' }}>
          {auction.status === 'sold' ? '🎉 낙찰 완료' : '경매 종료'}
        </h3>
      </div>
      
      <div className="rounded-xl p-4 mb-3" style={{ backgroundColor: isDark ? '#1a1a1a' : '#fff' }}>
        <div className="flex justify-between items-center mb-2">
          <span style={{ color: theme.textMuted }}>낙찰가</span>
          <span className="text-xl font-bold" style={{ color: '#FBBF24' }}>{formatPrice(winningBid.bid_amount)}</span>
        </div>
        {isWinner && (
          <p className="text-sm" style={{ color: '#22C55E' }}>🎊 축하합니다! 낙찰되었습니다!</p>
        )}
        {isSeller && (
          <p className="text-sm" style={{ color: theme.accent }}>📦 낙찰자에게 연락하세요</p>
        )}
      </div>

      {/* 낙찰자/판매자 간 소통 버튼 */}
      {(isWinner || isSeller) && (
        <div className="flex gap-2">
          <Link 
            href={`/chat?auction=${auction.id}&user=${isWinner ? auction.seller_id : winningBid.bidder_id}`}
            className="flex-1 py-3 rounded-xl font-bold flex items-center justify-center gap-2"
            style={{ backgroundColor: '#FBBF24', color: '#78350F' }}
          >
            <MessageCircle className="w-5 h-5" />
            {isWinner ? '판매자와 대화' : '낙찰자와 대화'}
          </Link>
          <button
            onClick={handleCopy}
            className="px-4 py-3 rounded-xl font-medium flex items-center gap-1"
            style={{ backgroundColor: theme.bgInput, color: theme.textPrimary }}
          >
            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
          </button>
        </div>
      )}
    </div>
  );
}

export default function AuctionDetailPage() {
  const { theme, isDark, mounted } = useTheme();
  const params = useParams();
  const router = useRouter();
  const auctionId = params.id as string;
  const { auction, bids, loading, error } = useAuction(auctionId);
  const timeLeft = useCountdown(auction?.ends_at || '');
  const { isWatching, toggleWatch, loading: watchLoading } = useAuctionWatch(auctionId);
  const [showBidModal, setShowBidModal] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | undefined>();
  const [showDescription, setShowDescription] = useState(false);

  // 현재 유저 ID 가져오기
  useState(() => {
    const getUser = async () => {
      const { supabase } = await import('@/lib/supabase');
      const { data: { session } } = await supabase.auth.getSession();
    const user = session?.user;
      if (user) setCurrentUserId(user.id);
    };
    getUser();
  });

  if (!mounted) return null;
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: theme.bgMain }}>
      <div className="animate-spin rounded-full h-12 w-12 border-4 border-t-transparent" style={{ borderColor: theme.accent }} />
    </div>
  );
  if (error || !auction) return (
    <div className="min-h-screen flex flex-col items-center justify-center" style={{ backgroundColor: theme.bgMain }}>
      <p className="mb-4" style={{ color: theme.textMuted }}>{error || '경매를 찾을 수 없습니다.'}</p>
      <button onClick={() => router.back()} style={{ color: theme.accent }}>돌아가기</button>
    </div>
  );

  const isUp = auction.auction_type === 'up';
  const isActive = auction.status === 'active' && !timeLeft.isExpired;
  const images = auction.images || [];
  const formatPrice = (price: number) => price.toLocaleString('ko-KR') + '원';
  const accentColor = isUp ? '#3B82F6' : '#F97316';

  return (
    <div className="min-h-screen transition-colors duration-300 pb-24" style={{ backgroundColor: theme.bgMain }}>
      {/* 헤더 */}
      <div className="fixed top-0 left-0 right-0 z-50 h-14 flex items-center justify-between px-4" style={{ backgroundColor: theme.bgCard, borderBottom: `1px solid ${theme.borderLight}` }}>
        <div className="max-w-[631px] mx-auto w-full flex items-center justify-between">
          <button onClick={() => router.back()} className="p-1">
            <ArrowLeft className="w-6 h-6" style={{ color: theme.textPrimary }} />
          </button>
          <div className="flex gap-2">
            <button onClick={toggleWatch} disabled={watchLoading} className="p-2 rounded-full" style={{ backgroundColor: isWatching ? '#EF444420' : theme.bgInput }}>
              <Heart className={`w-5 h-5 ${isWatching ? 'fill-current' : ''}`} style={{ color: isWatching ? '#EF4444' : theme.textMuted }} />
            </button>
            <button className="p-2 rounded-full" style={{ backgroundColor: theme.bgInput }}>
              <Share2 className="w-5 h-5" style={{ color: theme.textMuted }} />
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-[631px] mx-auto pt-14">
        {/* 이미지 */}
        <div className="relative">
          <ImageSlider images={images} />
          {/* 경매 타입 배지 */}
          <div className="absolute top-4 left-4">
            <span className="px-3 py-1.5 rounded-full text-sm font-bold text-white flex items-center gap-1 shadow-lg" style={{ backgroundColor: accentColor }}>
              {isUp ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />}
              {isUp ? '업경매' : '다운경매'}
            </span>
          </div>
        </div>

        {/* 메인 정보 */}
        <div className="p-4 space-y-4">
          {/* 제목 */}
          <div className="rounded-2xl p-4" style={{ backgroundColor: theme.bgCard, border: `1px solid ${theme.borderLight}` }}>
            <div className="flex flex-wrap gap-2 mb-2">
              {auction.category && (
                <span className="px-2 py-1 rounded-lg text-xs" style={{ backgroundColor: theme.bgInput, color: theme.textMuted }}>{auction.category}</span>
              )}
              {auction.condition && (
                <span className="px-2 py-1 rounded-lg text-xs" style={{ backgroundColor: theme.bgInput, color: theme.textMuted }}>{CONDITION_LABELS[auction.condition]}</span>
              )}
              {auction.bid_visibility === 'private' && (
                <span className="px-2 py-1 rounded-lg text-xs" style={{ backgroundColor: '#EAB30820', color: '#EAB308' }}>🔒 비공개</span>
              )}
            </div>
            <h1 className="text-xl font-bold mb-2" style={{ color: theme.textPrimary }}>{auction.title}</h1>
            <div className="flex gap-4 text-sm" style={{ color: theme.textMuted }}>
              <span className="flex items-center gap-1"><Eye className="w-4 h-4" />{auction.view_count || 0}</span>
              <span className="flex items-center gap-1"><Users className="w-4 h-4" />{auction.bid_count || 0}</span>
              <span className="flex items-center gap-1"><Heart className="w-4 h-4" />{auction.watch_count || 0}</span>
            </div>
          </div>

          {/* 남은 시간 (공구 스타일) */}
          <CountdownTimer endDate={auction.ends_at} isUp={isUp} />

          {/* 낙찰자 정보 (경매 종료 시) */}
          <WinnerSection auction={auction} bids={bids} currentUserId={currentUserId} />

          {/* 가격 정보 */}
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl p-4" style={{ backgroundColor: theme.bgCard, border: `1px solid ${theme.borderLight}` }}>
              <p className="text-xs mb-1" style={{ color: theme.textMuted }}>현재가</p>
              <p className="text-xl font-bold" style={{ color: accentColor }}>
                {auction.bid_visibility === 'private' && isActive ? '비공개' : formatPrice(auction.current_price)}
              </p>
            </div>
            <div className="rounded-2xl p-4" style={{ backgroundColor: theme.bgCard, border: `1px solid ${theme.borderLight}` }}>
              <p className="text-xs mb-1" style={{ color: theme.textMuted }}>시작가</p>
              <p className="text-xl font-bold" style={{ color: theme.textPrimary }}>{formatPrice(auction.start_price)}</p>
            </div>
            {isUp && auction.instant_price && (
              <div className="rounded-2xl p-4 col-span-2" style={{ backgroundColor: '#22C55E10', border: '1px solid #22C55E50' }}>
                <p className="text-xs mb-1" style={{ color: '#22C55E' }}>⚡ 즉시낙찰가</p>
                <p className="text-xl font-bold" style={{ color: '#22C55E' }}>{formatPrice(auction.instant_price)}</p>
              </div>
            )}
            {!isUp && auction.min_price && (
              <div className="rounded-2xl p-4 col-span-2" style={{ backgroundColor: '#F9731610', border: '1px solid #F9731650' }}>
                <p className="text-xs mb-1" style={{ color: '#F97316' }}>📉 최저가</p>
                <p className="text-xl font-bold" style={{ color: '#F97316' }}>{formatPrice(auction.min_price)}</p>
              </div>
            )}
          </div>

          {/* 상품 설명 (접기/펼치기) */}
          {auction.description && (
            <div className="rounded-2xl overflow-hidden" style={{ backgroundColor: theme.bgCard, border: `1px solid ${theme.borderLight}` }}>
              <button 
                onClick={() => setShowDescription(!showDescription)}
                className="w-full p-4 flex items-center justify-between"
              >
                <span className="font-bold" style={{ color: theme.textPrimary }}>📝 상품 설명</span>
                {showDescription ? (
                  <ArrowUp className="w-5 h-5" style={{ color: theme.textMuted }} />
                ) : (
                  <ArrowDown className="w-5 h-5" style={{ color: theme.textMuted }} />
                )}
              </button>
              {showDescription && (
                <div className="px-4 pb-4">
                  <p className="text-sm whitespace-pre-wrap" style={{ color: theme.textSecondary }}>{auction.description}</p>
                </div>
              )}
            </div>
          )}

          {/* 입찰 내역 */}
          {(auction.bid_visibility === 'public' || !isActive) && (
            <div className="rounded-2xl p-4" style={{ backgroundColor: theme.bgCard, border: `1px solid ${theme.borderLight}` }}>
              <h2 className="font-bold mb-3 flex items-center gap-2" style={{ color: theme.textPrimary }}>
                <Gavel className="w-5 h-5" style={{ color: accentColor }} />
                입찰 내역
                <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: theme.bgInput, color: theme.textMuted }}>
                  {bids.length}건
                </span>
              </h2>
              <BidHistory bids={bids} auction={auction} currentUserId={currentUserId} />
            </div>
          )}

          {/* 판매자 정보 */}
          <div className="rounded-2xl p-4" style={{ backgroundColor: theme.bgCard, border: `1px solid ${theme.borderLight}` }}>
            <h2 className="font-bold mb-3" style={{ color: theme.textPrimary }}>👤 판매자</h2>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ backgroundColor: theme.bgInput }}>
                {auction.seller?.avatar_url ? (
                  <Image src={auction.seller.avatar_url} alt="" width={48} height={48} className="rounded-full" />
                ) : (
                  <span className="text-lg" style={{ color: theme.textMuted }}>{auction.seller?.nickname?.[0] || '?'}</span>
                )}
              </div>
              <div>
                <p className="font-medium" style={{ color: theme.textPrimary }}>{auction.seller?.nickname || '판매자'}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 하단 입찰 버튼 */}
      {isActive && (
        <div className="fixed bottom-0 left-0 right-0 p-4" style={{ backgroundColor: theme.bgCard, borderTop: `1px solid ${theme.borderLight}` }}>
          <div className="max-w-[631px] mx-auto flex gap-3 items-center">
            <div className="flex-1">
              <p className="text-xs" style={{ color: theme.textMuted }}>{isUp ? '최소 입찰가' : '현재가'}</p>
              <p className="text-lg font-bold" style={{ color: theme.textPrimary }}>
                {isUp ? formatPrice(auction.current_price + auction.bid_increment) : formatPrice(auction.current_price)}
              </p>
            </div>
            <button 
              onClick={() => setShowBidModal(true)} 
              className="px-8 py-3 rounded-xl text-white font-bold text-lg shadow-lg"
              style={{ backgroundColor: accentColor }}
            >
              {isUp ? '입찰하기' : '바로 낙찰받기'}
            </button>
          </div>
        </div>
      )}

      {showBidModal && <BidModal auction={auction} onClose={() => setShowBidModal(false)} />}
    </div>
  );
}
