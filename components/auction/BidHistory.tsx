'use client';

import Image from 'next/image';
import { Crown, Clock } from 'lucide-react';
import type { Auction, AuctionBid } from '@/types/auction';

interface BidHistoryProps {
  bids: AuctionBid[];
  auction: Auction;
}

export function BidHistory({ bids, auction }: BidHistoryProps) {
  const formatPrice = (price: number) => price.toLocaleString('ko-KR') + '원';

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return '방금 전';
    if (minutes < 60) return `${minutes}분 전`;
    if (hours < 24) return `${hours}시간 전`;
    if (days < 7) return `${days}일 전`;
    
    return date.toLocaleDateString('ko-KR', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // 익명화된 닉네임
  const anonymizeName = (name: string | undefined, bidderId: string) => {
    if (!name) return '익명';
    if (name.length <= 2) return name[0] + '*';
    return name[0] + '*'.repeat(name.length - 2) + name[name.length - 1];
  };

  if (bids.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <p>아직 입찰 내역이 없습니다.</p>
        {auction.status === 'active' && (
          <p className="text-sm mt-1">첫 입찰자가 되어보세요!</p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {bids.map((bid, index) => (
        <div
          key={bid.id}
          className={`flex items-center gap-3 p-3 rounded-xl ${
            bid.is_winning 
              ? 'bg-blue-50 border border-blue-200' 
              : 'bg-gray-50'
          }`}
        >
          {/* 순위/아바타 */}
          <div className="relative">
            <div className="w-10 h-10 rounded-full bg-gray-200 overflow-hidden">
              {bid.bidder?.avatar_url ? (
                <Image
                  src={bid.bidder.avatar_url}
                  alt=""
                  width={40}
                  height={40}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-400 text-sm">
                  {bid.bidder?.nickname?.[0] || '?'}
                </div>
              )}
            </div>
            {bid.is_winning && (
              <div className="absolute -top-1 -right-1 w-5 h-5 bg-yellow-400 rounded-full flex items-center justify-center">
                <Crown className="w-3 h-3 text-yellow-800" />
              </div>
            )}
          </div>

          {/* 입찰 정보 */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-medium truncate">
                {anonymizeName(bid.bidder?.nickname, bid.bidder_id)}
              </span>
              {bid.is_winning && (
                <span className="text-xs px-2 py-0.5 bg-blue-500 text-white rounded-full">
                  최고
                </span>
              )}
              {bid.is_auto_bid && (
                <span className="text-xs px-2 py-0.5 bg-purple-100 text-purple-600 rounded-full">
                  자동
                </span>
              )}
            </div>
            <div className="flex items-center gap-1 text-xs text-gray-500 mt-0.5">
              <Clock className="w-3 h-3" />
              <span>{formatTime(bid.created_at)}</span>
            </div>
          </div>

          {/* 입찰 금액 */}
          <div className="text-right">
            <p className={`font-bold ${
              bid.is_winning ? 'text-blue-600' : 'text-gray-700'
            }`}>
              {formatPrice(bid.bid_amount)}
            </p>
            {index > 0 && bids[index - 1] && (
              <p className="text-xs text-gray-400">
                +{formatPrice(bid.bid_amount - bids[index - 1].bid_amount)}
              </p>
            )}
          </div>
        </div>
      ))}

      {/* 더 보기 */}
      {bids.length >= 50 && (
        <div className="text-center">
          <button className="text-sm text-blue-500">
            더 보기
          </button>
        </div>
      )}
    </div>
  );
}
