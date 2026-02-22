'use client';

import { useState } from 'react';
import { X, ArrowUp, ArrowDown, Info, Zap } from 'lucide-react';
import { useBid } from '@/hooks/useAuction';
import type { Auction } from '@/types/auction';

interface BidModalProps {
  auction: Auction;
  onClose: () => void;
}

export function BidModal({ auction, onClose }: BidModalProps) {
  const { placeBid, loading, error } = useBid();
  const isUp = auction.auction_type === 'up';
  
  const minBidAmount = isUp 
    ? auction.current_price + auction.bid_increment 
    : auction.current_price;
  
  const [bidAmount, setBidAmount] = useState(minBidAmount);
  const [maxBidAmount, setMaxBidAmount] = useState<number | undefined>();
  const [useAutoBid, setUseAutoBid] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  const formatPrice = (price: number) => price.toLocaleString('ko-KR') + '원';

  const handleBid = async () => {
    const bidResult = await placeBid(
      auction.id,
      bidAmount,
      useAutoBid ? maxBidAmount : undefined
    );

    if (bidResult.success) {
      setResult({
        success: true,
        message: bidResult.message || '입찰이 완료되었습니다!',
      });

      // 즉시 낙찰인 경우 3초 후 닫기
      if (bidResult.instant_win) {
        setTimeout(() => {
          onClose();
          window.location.reload();
        }, 3000);
      }
    } else {
      setResult({
        success: false,
        message: bidResult.error || '입찰에 실패했습니다.',
      });
    }
  };

  const handleAmountChange = (value: number) => {
    if (isUp) {
      setBidAmount(Math.max(minBidAmount, value));
    } else {
      setBidAmount(auction.current_price); // 다운경매는 현재가 고정
    }
  };

  const quickBidAmounts = isUp
    ? [
        minBidAmount,
        minBidAmount + auction.bid_increment,
        minBidAmount + auction.bid_increment * 2,
        minBidAmount + auction.bid_increment * 5,
      ]
    : [];

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      {/* 배경 */}
      <div 
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />
      
      {/* 모달 */}
      <div className="relative w-full max-w-md bg-white rounded-t-2xl sm:rounded-2xl p-6 animate-slide-up">
        {/* 헤더 */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            {isUp ? (
              <ArrowUp className="w-5 h-5 text-blue-500" />
            ) : (
              <ArrowDown className="w-5 h-5 text-orange-500" />
            )}
            <h2 className="text-lg font-bold">
              {isUp ? '입찰하기' : '바로 낙찰받기'}
            </h2>
          </div>
          <button onClick={onClose} className="p-1">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* 결과 표시 */}
        {result && (
          <div className={`mb-6 p-4 rounded-xl ${
            result.success 
              ? 'bg-green-50 text-green-700' 
              : 'bg-red-50 text-red-700'
          }`}>
            <p className="font-medium">{result.message}</p>
            {result.success && (
              <button
                onClick={onClose}
                className="mt-2 text-sm underline"
              >
                닫기
              </button>
            )}
          </div>
        )}

        {!result?.success && (
          <>
            {/* 현재 상황 */}
            <div className="bg-gray-50 rounded-xl p-4 mb-6">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">현재가</span>
                <span className="text-xl font-bold">
                  {formatPrice(auction.current_price)}
                </span>
              </div>
              {isUp && (
                <div className="flex justify-between items-center mt-2 text-sm">
                  <span className="text-gray-500">최소 입찰 단위</span>
                  <span className="text-gray-700">
                    +{formatPrice(auction.bid_increment)}
                  </span>
                </div>
              )}
            </div>

            {/* 업경매: 입찰 금액 입력 */}
            {isUp ? (
              <>
                {/* 빠른 선택 */}
                <div className="grid grid-cols-2 gap-2 mb-4">
                  {quickBidAmounts.map((amount) => (
                    <button
                      key={amount}
                      onClick={() => setBidAmount(amount)}
                      className={`py-2 px-4 rounded-lg border text-sm font-medium transition-colors ${
                        bidAmount === amount
                          ? 'border-blue-500 bg-blue-50 text-blue-600'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      {formatPrice(amount)}
                    </button>
                  ))}
                </div>

                {/* 직접 입력 */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    입찰 금액
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      value={bidAmount}
                      onChange={(e) => handleAmountChange(Number(e.target.value))}
                      step={auction.bid_increment}
                      min={minBidAmount}
                      className="w-full px-4 py-3 border rounded-xl text-lg font-bold focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500">
                      원
                    </span>
                  </div>
                  {bidAmount < minBidAmount && (
                    <p className="mt-1 text-sm text-red-500">
                      최소 {formatPrice(minBidAmount)} 이상 입찰해야 합니다.
                    </p>
                  )}
                </div>

                {/* 자동 입찰 */}
                <div className="mb-6">
                  <label className="flex items-center gap-2 mb-2">
                    <input
                      type="checkbox"
                      checked={useAutoBid}
                      onChange={(e) => setUseAutoBid(e.target.checked)}
                      className="w-4 h-4 rounded border-gray-300"
                    />
                    <span className="text-sm font-medium">자동 입찰 사용</span>
                    <Info className="w-4 h-4 text-gray-400" />
                  </label>
                  
                  {useAutoBid && (
                    <div className="mt-2">
                      <label className="block text-sm text-gray-600 mb-1">
                        최대 입찰 금액 (이 금액까지 자동으로 입찰)
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          value={maxBidAmount || ''}
                          onChange={(e) => setMaxBidAmount(Number(e.target.value) || undefined)}
                          placeholder={String(bidAmount + auction.bid_increment * 10)}
                          min={bidAmount}
                          step={auction.bid_increment}
                          className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500">
                          원
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* 즉시 낙찰 안내 */}
                {auction.instant_price && bidAmount >= auction.instant_price && (
                  <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-xl flex items-start gap-2">
                    <Zap className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-yellow-800">
                      즉시낙찰가({formatPrice(auction.instant_price)}) 이상입니다. 
                      입찰 즉시 낙찰됩니다!
                    </p>
                  </div>
                )}
              </>
            ) : (
              /* 다운경매: 현재가로 바로 낙찰 */
              <div className="mb-6">
                <div className="text-center py-8">
                  <p className="text-gray-600 mb-2">현재 가격으로 바로 낙찰받습니다</p>
                  <p className="text-3xl font-bold text-orange-600">
                    {formatPrice(auction.current_price)}
                  </p>
                </div>
                <div className="p-3 bg-orange-50 border border-orange-200 rounded-xl">
                  <p className="text-sm text-orange-800">
                    다운경매는 먼저 입찰하는 사람이 현재 가격으로 즉시 낙찰됩니다.
                    가격은 시간이 지날수록 내려갑니다.
                  </p>
                </div>
              </div>
            )}

            {/* 에러 메시지 */}
            {error && (
              <p className="mb-4 text-sm text-red-500">{error}</p>
            )}

            {/* 입찰 버튼 */}
            <button
              onClick={handleBid}
              disabled={loading || (isUp && bidAmount < minBidAmount)}
              className={`w-full py-4 rounded-xl text-white font-bold text-lg transition-colors ${
                isUp 
                  ? 'bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300' 
                  : 'bg-orange-500 hover:bg-orange-600 disabled:bg-orange-300'
              }`}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="animate-spin">⏳</span>
                  처리중...
                </span>
              ) : isUp ? (
                `${formatPrice(bidAmount)} 입찰하기`
              ) : (
                `${formatPrice(auction.current_price)} 낙찰받기`
              )}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
