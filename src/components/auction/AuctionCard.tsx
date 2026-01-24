'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Clock, Users, ArrowUp, ArrowDown, Eye } from 'lucide-react';
import { useCountdown } from '@/hooks/useAuction';
import type { Auction } from '@/types/auction';

interface AuctionCardProps {
  auction: Auction;
}

export function AuctionCard({ auction }: AuctionCardProps) {
  const timeLeft = useCountdown(auction.ends_at);
  const isUp = auction.auction_type === 'up';

  const formatPrice = (price: number) => {
    return price.toLocaleString('ko-KR') + '원';
  };

  const formatTimeLeft = () => {
    if (timeLeft.isExpired) return '마감';
    if (timeLeft.days > 0) return `${timeLeft.days}일 ${timeLeft.hours}시간`;
    if (timeLeft.hours > 0) return `${timeLeft.hours}시간 ${timeLeft.minutes}분`;
    return `${timeLeft.minutes}분 ${timeLeft.seconds}초`;
  };

  return (
    <Link href={`/auction/${auction.id}`}>
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow">
        {/* 이미지 */}
        <div className="relative aspect-square bg-gray-100">
          {auction.images?.[0] ? (
            <Image
              src={auction.images[0]}
              alt={auction.title}
              fill
              className="object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-400">
              이미지 없음
            </div>
          )}
          
          {/* 경매 타입 배지 */}
          <div className={`absolute top-2 left-2 px-2 py-1 rounded-full text-xs font-bold text-white flex items-center gap-1 ${
            isUp ? 'bg-blue-500' : 'bg-orange-500'
          }`}>
            {isUp ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
            {isUp ? '업경매' : '다운경매'}
          </div>

          {/* 상태 배지 */}
          {auction.status === 'sold' && (
            <div className="absolute top-2 right-2 px-2 py-1 rounded-full text-xs font-bold bg-green-500 text-white">
              낙찰완료
            </div>
          )}
          {auction.status === 'ended' && (
            <div className="absolute top-2 right-2 px-2 py-1 rounded-full text-xs font-bold bg-gray-500 text-white">
              유찰
            </div>
          )}

          {/* 비공개 입찰 표시 */}
          {auction.bid_visibility === 'private' && auction.status === 'active' && (
            <div className="absolute bottom-2 right-2 px-2 py-1 rounded-full text-xs bg-black/70 text-white">
              🔒 비공개
            </div>
          )}
        </div>

        {/* 정보 */}
        <div className="p-3">
          <h3 className="font-medium text-gray-900 truncate mb-1">
            {auction.title}
          </h3>

          {/* 현재가 */}
          <div className="mb-2">
            <p className="text-xs text-gray-500">
              {auction.bid_visibility === 'private' && auction.status === 'active' 
                ? '현재가 비공개' 
                : '현재가'}
            </p>
            <p className="text-lg font-bold text-blue-600">
              {auction.bid_visibility === 'private' && auction.status === 'active'
                ? '???'
                : formatPrice(auction.current_price)}
            </p>
          </div>

          {/* 즉시 낙찰가 (업경매) */}
          {isUp && auction.instant_price && (
            <p className="text-xs text-gray-500 mb-2">
              즉시낙찰 {formatPrice(auction.instant_price)}
            </p>
          )}

          {/* 최저가 (다운경매) */}
          {!isUp && auction.min_price && (
            <p className="text-xs text-orange-500 mb-2">
              최저가 {formatPrice(auction.min_price)}
            </p>
          )}

          {/* 하단 정보 */}
          <div className="flex items-center justify-between text-xs text-gray-500">
            <div className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              <span className={timeLeft.isExpired ? 'text-red-500' : ''}>
                {formatTimeLeft()}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1">
                <Users className="w-3 h-3" />
                {auction.bid_count}
              </span>
              <span className="flex items-center gap-1">
                <Eye className="w-3 h-3" />
                {auction.view_count}
              </span>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}

// 로딩 스켈레톤
export function AuctionCardSkeleton() {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="aspect-square bg-gray-200 animate-pulse" />
      <div className="p-3 space-y-2">
        <div className="h-4 bg-gray-200 rounded animate-pulse" />
        <div className="h-6 w-2/3 bg-gray-200 rounded animate-pulse" />
        <div className="h-3 w-1/2 bg-gray-200 rounded animate-pulse" />
      </div>
    </div>
  );
}
