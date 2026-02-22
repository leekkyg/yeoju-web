// 경매 관련 TypeScript 타입 정의

export type AuctionType = 'up' | 'down';
export type BidVisibility = 'public' | 'private';
export type AuctionStatus = 'active' | 'ended' | 'cancelled' | 'sold';
export type ItemCondition = 'new' | 'like_new' | 'good' | 'fair' | 'poor';

export interface Auction {
  id: string;
  seller_id: string;
  
  // 상품 정보
  title: string;
  description?: string;
  category?: string;
  condition?: ItemCondition;
  images: string[];
  
  // 경매 설정
  auction_type: AuctionType;
  bid_visibility: BidVisibility;
  
  // 가격
  start_price: number;
  current_price: number;
  min_price?: number;
  instant_price?: number;
  bid_increment: number;
  
  // 다운경매 설정
  price_drop_amount?: number;
  price_drop_interval?: number;
  next_price_drop_at?: string;
  
  // 기간
  started_at: string;
  ends_at: string;
  
  // 상태
  status: AuctionStatus;
  winner_id?: string;
  winning_bid_id?: string;
  final_price?: number;
  sold_at?: string;
  
  // 통계
  view_count: number;
  bid_count: number;
  watch_count: number;
  
  // 메타
  created_at: string;
  updated_at: string;
  
  // 조인 데이터
  seller?: Profile;
  winner?: Profile;
  bids?: AuctionBid[];
  my_watch?: AuctionWatch;
}

export interface AuctionBid {
  id: string;
  auction_id: string;
  bidder_id: string;
  bid_amount: number;
  max_bid_amount?: number;
  is_auto_bid: boolean;
  is_winning: boolean;
  is_cancelled: boolean;
  created_at: string;
  
  // 조인 데이터
  bidder?: Profile;
}

export interface AuctionWatch {
  id: string;
  auction_id: string;
  user_id: string;
  created_at: string;
}

export interface AuctionAutoBid {
  id: string;
  auction_id: string;
  user_id: string;
  max_amount: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Profile {
  id: string;
  nickname?: string;
  avatar_url?: string;
  email?: string;
}

// 경매 생성 폼 데이터
export interface CreateAuctionInput {
  title: string;
  description?: string;
  category?: string;
  condition?: ItemCondition;
  images: string[];
  
  auction_type: AuctionType;
  bid_visibility: BidVisibility;
  
  start_price: number;
  min_price?: number;
  instant_price?: number;
  bid_increment: number;
  
  // 다운경매 전용
  price_drop_amount?: number;
  price_drop_interval?: number;
  
  duration_hours: number; // 경매 기간 (시간)
}

// 입찰 결과
export interface BidResult {
  success: boolean;
  bid_id?: string;
  instant_win?: boolean;
  message?: string;
  error?: string;
}

// 필터 옵션
export interface AuctionFilters {
  auction_type?: AuctionType;
  status?: AuctionStatus;
  category?: string;
  min_price?: number;
  max_price?: number;
  search?: string;
}

// 상품 상태 라벨
export const CONDITION_LABELS: Record<ItemCondition, string> = {
  new: '새상품',
  like_new: '거의 새것',
  good: '양호',
  fair: '보통',
  poor: '하자있음',
};

// 카테고리 목록
export const AUCTION_CATEGORIES = [
  '디지털/가전',
  '패션/의류',
  '가구/인테리어',
  '유아/아동',
  '스포츠/레저',
  '취미/게임',
  '도서/티켓',
  '생활용품',
  '자동차/오토바이',
  '기타',
] as const;
