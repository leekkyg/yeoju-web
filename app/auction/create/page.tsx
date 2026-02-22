'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { ArrowLeft, ArrowUp, ArrowDown, Camera, X, Info, Clock, Zap, TrendingDown } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { useCreateAuction } from '@/hooks/useAuction';
import { AUCTION_CATEGORIES, CONDITION_LABELS } from '@/types/auction';
import type { CreateAuctionInput, AuctionType, BidVisibility, ItemCondition } from '@/types/auction';

export default function CreateAuctionPage() {
  const { theme, isDark, mounted } = useTheme();
  const router = useRouter();
  const { createAuction, loading, error } = useCreateAuction();

  const [images, setImages] = useState<string[]>([]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [condition, setCondition] = useState<ItemCondition>('good');
  const [auctionType, setAuctionType] = useState<AuctionType>('up');
  const [bidVisibility, setBidVisibility] = useState<BidVisibility>('public');
  const [startPrice, setStartPrice] = useState(10000);
  const [bidIncrement, setBidIncrement] = useState(1000);
  const [instantPrice, setInstantPrice] = useState<number | undefined>();
  const [minPrice, setMinPrice] = useState<number | undefined>();
  const [priceDropAmount, setPriceDropAmount] = useState(1000);
  const [priceDropInterval, setPriceDropInterval] = useState(60);
  const [durationHours, setDurationHours] = useState(24);

  const isUp = auctionType === 'up';

  const [uploading, setUploading] = useState(false);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    
    setUploading(true);
    
    for (const file of Array.from(files)) {
      if (images.length >= 10) break;
      
      const formData = new FormData();
      formData.append('file', file);
      formData.append('folder', 'auction');
      
      try {
        const res = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        });
        const data = await res.json();
        
        if (data.success) {
          setImages(prev => [...prev, data.url].slice(0, 10));
        }
      } catch (error) {
        console.error('이미지 업로드 실패:', error);
      }
    }
    
    setUploading(false);
  };

  const removeImage = (index: number) => setImages(prev => prev.filter((_, i) => i !== index));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const input: CreateAuctionInput = { title, description, category, condition, images, auction_type: auctionType, bid_visibility: bidVisibility, start_price: startPrice, bid_increment: bidIncrement, duration_hours: durationHours };
    if (isUp) { if (instantPrice) input.instant_price = instantPrice; }
    else { input.min_price = minPrice || Math.floor(startPrice * 0.3); input.price_drop_amount = priceDropAmount; input.price_drop_interval = priceDropInterval; }
    const result = await createAuction(input);
    if (result) router.push(`/auction/${result.id}`);
  };

  const formatPrice = (price: number) => price.toLocaleString('ko-KR');

  if (!mounted) return null;

  return (
    <div className="min-h-screen transition-colors duration-300" style={{ backgroundColor: theme.bgMain }}>
      <div className="fixed top-0 left-0 right-0 z-50 h-14 flex items-center px-4 gap-4 transition-colors duration-300" style={{ backgroundColor: theme.bgCard, borderBottom: `1px solid ${theme.borderLight}` }}>
        <div className="max-w-[631px] mx-auto w-full flex items-center gap-4">
          <button onClick={() => router.back()} className="p-1"><ArrowLeft className="w-6 h-6" style={{ color: theme.textPrimary }} /></button>
          <h1 className="text-lg font-bold" style={{ color: theme.textPrimary }}>경매 등록</h1>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="max-w-[631px] mx-auto pt-14 pb-24">
        <div className="p-4" style={{ backgroundColor: theme.bgCard, borderBottom: `1px solid ${theme.borderLight}` }}>
          <h2 className="font-bold mb-3" style={{ color: theme.textPrimary }}>상품 이미지</h2>
          <div className="flex gap-2 overflow-x-auto pb-2">
            <label className="flex-shrink-0 w-20 h-20 rounded-xl flex flex-col items-center justify-center cursor-pointer transition-colors" style={{ border: `2px dashed ${theme.borderLight}`, backgroundColor: theme.bgInput }}>
              {uploading ? (
                <div className="w-6 h-6 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: theme.textMuted }} />
              ) : (
                <Camera className="w-6 h-6" style={{ color: theme.textMuted }} />
              )}
              <span className="text-xs mt-1" style={{ color: theme.textMuted }}>{uploading ? '업로드중' : `${images.length}/10`}</span>
              <input type="file" accept="image/*" multiple onChange={handleImageUpload} className="hidden" disabled={uploading} />
            </label>
            {images.map((img, idx) => (
              <div key={idx} className="relative flex-shrink-0 w-20 h-20 rounded-xl overflow-hidden">
                <Image src={img} alt="" fill className="object-cover" />
                <button type="button" onClick={() => removeImage(idx)} className="absolute top-1 right-1 w-5 h-5 bg-black/50 rounded-full flex items-center justify-center"><X className="w-3 h-3 text-white" /></button>
                {idx === 0 && <span className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-[10px] text-center py-0.5">대표</span>}
              </div>
            ))}
          </div>
        </div>

        <div className="p-4 space-y-4" style={{ backgroundColor: theme.bgCard, borderBottom: `1px solid ${theme.borderLight}` }}>
          <h2 className="font-bold" style={{ color: theme.textPrimary }}>상품 정보</h2>
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: theme.textPrimary }}>제목 *</label>
            <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="상품명을 입력하세요" required maxLength={100} className="w-full px-4 py-3 rounded-xl text-sm transition-colors" style={{ backgroundColor: theme.bgInput, color: theme.textPrimary, border: `1px solid ${theme.borderLight}` }} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: theme.textPrimary }}>카테고리</label>
            <select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full px-4 py-3 rounded-xl text-sm transition-colors" style={{ backgroundColor: theme.bgInput, color: theme.textPrimary, border: `1px solid ${theme.borderLight}` }}>
              <option value="">선택하세요</option>
              {AUCTION_CATEGORIES.map((cat) => <option key={cat} value={cat}>{cat}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: theme.textPrimary }}>상품 상태</label>
            <div className="flex flex-wrap gap-2">
              {(Object.keys(CONDITION_LABELS) as ItemCondition[]).map((cond) => (
                <button key={cond} type="button" onClick={() => setCondition(cond)} className="px-4 py-2 rounded-lg text-sm font-medium transition-colors" style={{ backgroundColor: condition === cond ? theme.textPrimary : theme.bgInput, color: condition === cond ? theme.bgMain : theme.textPrimary, border: `1px solid ${theme.borderLight}` }}>{CONDITION_LABELS[cond]}</button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: theme.textPrimary }}>상품 설명</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="상품 상태, 사용 기간, 거래 방법 등을 자세히 적어주세요" rows={5} className="w-full px-4 py-3 rounded-xl text-sm transition-colors resize-none" style={{ backgroundColor: theme.bgInput, color: theme.textPrimary, border: `1px solid ${theme.borderLight}` }} />
          </div>
        </div>

        <div className="p-4 space-y-4" style={{ backgroundColor: theme.bgCard, borderBottom: `1px solid ${theme.borderLight}` }}>
          <h2 className="font-bold" style={{ color: theme.textPrimary }}>경매 방식</h2>
          <div className="grid grid-cols-2 gap-3">
            <button type="button" onClick={() => setAuctionType('up')} className="p-4 rounded-xl text-left transition-colors" style={{ backgroundColor: isUp ? (isDark ? '#1E3A5F' : '#EFF6FF') : theme.bgInput, border: `2px solid ${isUp ? '#3B82F6' : theme.borderLight}` }}>
              <div className="flex items-center gap-2 mb-2">
                <ArrowUp className="w-5 h-5" style={{ color: '#3B82F6' }} />
                <span className="font-bold" style={{ color: isUp ? '#3B82F6' : theme.textPrimary }}>업경매</span>
              </div>
              <p className="text-xs" style={{ color: theme.textMuted }}>가격이 올라가는 일반 경매</p>
            </button>
            <button type="button" onClick={() => setAuctionType('down')} className="p-4 rounded-xl text-left transition-colors" style={{ backgroundColor: !isUp ? (isDark ? '#4A2C1A' : '#FFF7ED') : theme.bgInput, border: `2px solid ${!isUp ? '#F97316' : theme.borderLight}` }}>
              <div className="flex items-center gap-2 mb-2">
                <ArrowDown className="w-5 h-5" style={{ color: '#F97316' }} />
                <span className="font-bold" style={{ color: !isUp ? '#F97316' : theme.textPrimary }}>다운경매</span>
              </div>
              <p className="text-xs" style={{ color: theme.textMuted }}>시간에 따라 가격 하락</p>
            </button>
          </div>
        </div>

        <div className="p-4 space-y-4" style={{ backgroundColor: theme.bgCard, borderBottom: `1px solid ${theme.borderLight}` }}>
          <h2 className="font-bold" style={{ color: theme.textPrimary }}>가격 설정</h2>
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: theme.textPrimary }}>시작 가격 *</label>
            <div className="relative">
              <input type="number" value={startPrice} onChange={(e) => setStartPrice(Number(e.target.value))} min={1000} step={1000} required className="w-full px-4 py-3 rounded-xl text-sm transition-colors" style={{ backgroundColor: theme.bgInput, color: theme.textPrimary, border: `1px solid ${theme.borderLight}` }} />
              <span className="absolute right-4 top-1/2 -translate-y-1/2" style={{ color: theme.textMuted }}>원</span>
            </div>
          </div>
          {isUp ? (
            <>
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: theme.textPrimary }}>최소 입찰 단위</label>
                <div className="relative">
                  <input type="number" value={bidIncrement} onChange={(e) => setBidIncrement(Number(e.target.value))} min={100} step={100} className="w-full px-4 py-3 rounded-xl text-sm transition-colors" style={{ backgroundColor: theme.bgInput, color: theme.textPrimary, border: `1px solid ${theme.borderLight}` }} />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2" style={{ color: theme.textMuted }}>원</span>
                </div>
              </div>
              <div>
                <label className="flex items-center gap-2 text-sm font-medium mb-1" style={{ color: theme.textPrimary }}><Zap className="w-4 h-4" style={{ color: '#EAB308' }} />즉시 낙찰가 (선택)</label>
                <div className="relative">
                  <input type="number" value={instantPrice || ''} onChange={(e) => setInstantPrice(e.target.value ? Number(e.target.value) : undefined)} min={startPrice} step={1000} placeholder="설정 안함" className="w-full px-4 py-3 rounded-xl text-sm transition-colors" style={{ backgroundColor: theme.bgInput, color: theme.textPrimary, border: `1px solid ${theme.borderLight}` }} />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2" style={{ color: theme.textMuted }}>원</span>
                </div>
                <p className="text-xs mt-1" style={{ color: theme.textMuted }}>이 가격 이상으로 입찰하면 즉시 낙찰됩니다</p>
              </div>
            </>
          ) : (
            <>
              <div>
                <label className="flex items-center gap-2 text-sm font-medium mb-1" style={{ color: theme.textPrimary }}><TrendingDown className="w-4 h-4" style={{ color: '#F97316' }} />최저가 (마지노선)</label>
                <div className="relative">
                  <input type="number" value={minPrice || Math.floor(startPrice * 0.3)} onChange={(e) => setMinPrice(Number(e.target.value))} max={startPrice} step={1000} className="w-full px-4 py-3 rounded-xl text-sm transition-colors" style={{ backgroundColor: theme.bgInput, color: theme.textPrimary, border: `1px solid ${theme.borderLight}` }} />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2" style={{ color: theme.textMuted }}>원</span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: theme.textPrimary }}>하락 금액</label>
                  <div className="relative">
                    <input type="number" value={priceDropAmount} onChange={(e) => setPriceDropAmount(Number(e.target.value))} min={100} step={100} className="w-full px-4 py-3 rounded-xl text-sm transition-colors" style={{ backgroundColor: theme.bgInput, color: theme.textPrimary, border: `1px solid ${theme.borderLight}` }} />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2" style={{ color: theme.textMuted }}>원</span>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: theme.textPrimary }}>하락 간격</label>
                  <div className="relative">
                    <input type="number" value={priceDropInterval} onChange={(e) => setPriceDropInterval(Number(e.target.value))} min={1} className="w-full px-4 py-3 rounded-xl text-sm transition-colors" style={{ backgroundColor: theme.bgInput, color: theme.textPrimary, border: `1px solid ${theme.borderLight}` }} />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2" style={{ color: theme.textMuted }}>분</span>
                  </div>
                </div>
              </div>
              <p className="text-xs" style={{ color: theme.textMuted }}>{priceDropInterval}분마다 {formatPrice(priceDropAmount)}원씩 가격이 내려갑니다</p>
            </>
          )}
        </div>

        <div className="p-4" style={{ backgroundColor: theme.bgCard, borderBottom: `1px solid ${theme.borderLight}` }}>
          <h2 className="font-bold mb-3" style={{ color: theme.textPrimary }}>입찰 공개 설정</h2>
          <div className="space-y-3">
            <label className="flex items-start gap-3 p-3 rounded-xl cursor-pointer transition-colors" style={{ backgroundColor: bidVisibility === 'public' ? (isDark ? '#1a2e1a' : '#F0FDF4') : theme.bgInput, border: `1px solid ${bidVisibility === 'public' ? '#22C55E' : theme.borderLight}` }}>
              <input type="radio" name="visibility" checked={bidVisibility === 'public'} onChange={() => setBidVisibility('public')} className="mt-1" />
              <div><p className="font-medium" style={{ color: theme.textPrimary }}>공개 입찰</p><p className="text-sm" style={{ color: theme.textMuted }}>현재 최고가와 입찰 내역이 실시간으로 공개됩니다</p></div>
            </label>
            <label className="flex items-start gap-3 p-3 rounded-xl cursor-pointer transition-colors" style={{ backgroundColor: bidVisibility === 'private' ? (isDark ? '#2a2a1a' : '#FEFCE8') : theme.bgInput, border: `1px solid ${bidVisibility === 'private' ? '#EAB308' : theme.borderLight}` }}>
              <input type="radio" name="visibility" checked={bidVisibility === 'private'} onChange={() => setBidVisibility('private')} className="mt-1" />
              <div><p className="font-medium" style={{ color: theme.textPrimary }}>🔒 비공개 입찰</p><p className="text-sm" style={{ color: theme.textMuted }}>입찰 금액이 마감 전까지 비공개됩니다</p></div>
            </label>
          </div>
        </div>

        <div className="p-4" style={{ backgroundColor: theme.bgCard, borderBottom: `1px solid ${theme.borderLight}` }}>
          <h2 className="font-bold mb-3 flex items-center gap-2" style={{ color: theme.textPrimary }}><Clock className="w-5 h-5" />경매 기간</h2>
          <div className="flex flex-wrap gap-2">
            {[6, 12, 24, 48, 72, 168].map((hours) => (
              <button key={hours} type="button" onClick={() => setDurationHours(hours)} className="px-4 py-2 rounded-lg text-sm font-medium transition-colors" style={{ backgroundColor: durationHours === hours ? theme.textPrimary : theme.bgInput, color: durationHours === hours ? theme.bgMain : theme.textPrimary, border: `1px solid ${theme.borderLight}` }}>{hours < 24 ? `${hours}시간` : `${hours / 24}일`}</button>
            ))}
          </div>
        </div>

        <div className="p-4" style={{ backgroundColor: theme.bgCard, borderBottom: `1px solid ${theme.borderLight}` }}>
          <h3 className="font-bold mb-2 flex items-center gap-2" style={{ color: theme.textPrimary }}><Info className="w-4 h-4" />경매 요약</h3>
          <ul className="text-sm space-y-1" style={{ color: theme.textMuted }}>
            <li>• {isUp ? '업경매' : '다운경매'} ({bidVisibility === 'public' ? '공개' : '비공개'} 입찰)</li>
            <li>• 시작가: {formatPrice(startPrice)}원</li>
            {isUp && instantPrice && <li>• 즉시낙찰가: {formatPrice(instantPrice)}원</li>}
            {!isUp && <><li>• 최저가: {formatPrice(minPrice || Math.floor(startPrice * 0.3))}원</li><li>• {priceDropInterval}분마다 {formatPrice(priceDropAmount)}원 하락</li></>}
            <li>• 기간: {durationHours < 24 ? `${durationHours}시간` : `${durationHours / 24}일`}</li>
          </ul>
        </div>

        {error && <div className="mx-4 mt-4 p-4 rounded-xl bg-red-500/10 text-red-500">{error}</div>}

        <div className="fixed bottom-0 left-0 right-0 p-4 transition-colors" style={{ backgroundColor: theme.bgCard, borderTop: `1px solid ${theme.borderLight}` }}>
          <div className="max-w-[631px] mx-auto">
            <button type="submit" disabled={loading || uploading || !title || images.length === 0} className="w-full py-4 rounded-xl text-white font-bold text-lg transition-colors disabled:opacity-50" style={{ backgroundColor: isUp ? '#3B82F6' : '#F97316' }}>{loading ? '등록 중...' : uploading ? '이미지 업로드 중...' : '경매 등록하기'}</button>
          </div>
        </div>
      </form>
    </div>
  );
}
