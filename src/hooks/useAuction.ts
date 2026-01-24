'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { 
  Auction, 
  AuctionBid, 
  AuctionFilters, 
  CreateAuctionInput,
  BidResult 
} from '@/types/auction';

const supabase = createClient();

// ============================================
// 경매 목록 조회 훅
// ============================================
export function useAuctions(filters?: AuctionFilters) {
  const [auctions, setAuctions] = useState<Auction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAuctions = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      let query = supabase
        .from('auctions')
        .select(`
          *,
          seller:profiles!seller_id(id, nickname, avatar_url)
        `)
        .order('created_at', { ascending: false });

      // 필터 적용
      if (filters?.auction_type) {
        query = query.eq('auction_type', filters.auction_type);
      }
      if (filters?.status) {
        query = query.eq('status', filters.status);
      } else {
        query = query.eq('status', 'active'); // 기본: 진행 중
      }
      if (filters?.category) {
        query = query.eq('category', filters.category);
      }
      if (filters?.min_price) {
        query = query.gte('current_price', filters.min_price);
      }
      if (filters?.max_price) {
        query = query.lte('current_price', filters.max_price);
      }
      if (filters?.search) {
        query = query.ilike('title', `%${filters.search}%`);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;
      setAuctions(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : '경매 목록을 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchAuctions();
  }, [fetchAuctions]);

  // 실시간 업데이트 구독
  useEffect(() => {
    const channel = supabase
      .channel('auctions-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'auctions' },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setAuctions(prev => [payload.new as Auction, ...prev]);
          } else if (payload.eventType === 'UPDATE') {
            setAuctions(prev => 
              prev.map(a => a.id === payload.new.id ? { ...a, ...payload.new } : a)
            );
          } else if (payload.eventType === 'DELETE') {
            setAuctions(prev => prev.filter(a => a.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return { auctions, loading, error, refetch: fetchAuctions };
}

// ============================================
// 경매 상세 조회 훅
// ============================================
export function useAuction(auctionId: string) {
  const [auction, setAuction] = useState<Auction | null>(null);
  const [bids, setBids] = useState<AuctionBid[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAuction = useCallback(async () => {
    if (!auctionId) return;
    
    setLoading(true);
    setError(null);

    try {
      // 경매 정보 조회
      const { data: auctionData, error: auctionError } = await supabase
        .from('auctions')
        .select(`
          *,
          seller:profiles!seller_id(id, nickname, avatar_url),
          winner:profiles!winner_id(id, nickname, avatar_url)
        `)
        .eq('id', auctionId)
        .single();

      if (auctionError) throw auctionError;
      setAuction(auctionData);

      // 조회수 증가
      await supabase.rpc('increment_view_count', { auction_id: auctionId });

      // 입찰 내역 조회 (공개 경매 또는 종료된 경매)
      if (auctionData.bid_visibility === 'public' || auctionData.status !== 'active') {
        const { data: bidsData } = await supabase
          .from('auction_bids')
          .select(`
            *,
            bidder:profiles!bidder_id(id, nickname, avatar_url)
          `)
          .eq('auction_id', auctionId)
          .eq('is_cancelled', false)
          .order('bid_amount', { ascending: false })
          .limit(50);

        setBids(bidsData || []);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '경매 정보를 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  }, [auctionId]);

  useEffect(() => {
    fetchAuction();
  }, [fetchAuction]);

  // 실시간 경매 업데이트 구독
  useEffect(() => {
    if (!auctionId) return;

    const auctionChannel = supabase
      .channel(`auction-${auctionId}`)
      .on(
        'postgres_changes',
        { 
          event: 'UPDATE', 
          schema: 'public', 
          table: 'auctions',
          filter: `id=eq.${auctionId}`
        },
        (payload) => {
          setAuction(prev => prev ? { ...prev, ...payload.new } : null);
        }
      )
      .subscribe();

    // 입찰 실시간 구독
    const bidsChannel = supabase
      .channel(`bids-${auctionId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'auction_bids',
          filter: `auction_id=eq.${auctionId}`
        },
        async (payload) => {
          // 새 입찰에 입찰자 정보 조회
          const { data: bidder } = await supabase
            .from('profiles')
            .select('id, nickname, avatar_url')
            .eq('id', payload.new.bidder_id)
            .single();
          
          const newBid = { ...payload.new, bidder } as AuctionBid;
          setBids(prev => [newBid, ...prev.map(b => ({ ...b, is_winning: false }))]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(auctionChannel);
      supabase.removeChannel(bidsChannel);
    };
  }, [auctionId]);

  return { auction, bids, loading, error, refetch: fetchAuction };
}

// ============================================
// 입찰 훅
// ============================================
export function useBid() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const placeBid = async (
    auctionId: string,
    bidAmount: number,
    maxBidAmount?: number
  ): Promise<BidResult> => {
    setLoading(true);
    setError(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('로그인이 필요합니다.');
      }

      const { data, error: bidError } = await supabase.rpc('place_bid', {
        p_auction_id: auctionId,
        p_bidder_id: user.id,
        p_bid_amount: bidAmount,
        p_max_bid_amount: maxBidAmount || null
      });

      if (bidError) throw bidError;
      
      return data as BidResult;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '입찰에 실패했습니다.';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  return { placeBid, loading, error };
}

// ============================================
// 경매 생성 훅
// ============================================
export function useCreateAuction() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createAuction = async (input: CreateAuctionInput): Promise<Auction | null> => {
    setLoading(true);
    setError(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('로그인이 필요합니다.');
      }

      const endsAt = new Date();
      endsAt.setHours(endsAt.getHours() + input.duration_hours);

      const auctionData: Partial<Auction> = {
        seller_id: user.id,
        title: input.title,
        description: input.description,
        category: input.category,
        condition: input.condition,
        images: input.images,
        auction_type: input.auction_type,
        bid_visibility: input.bid_visibility,
        start_price: input.start_price,
        current_price: input.start_price,
        min_price: input.min_price,
        instant_price: input.instant_price,
        bid_increment: input.bid_increment,
        ends_at: endsAt.toISOString(),
      };

      // 다운경매 설정
      if (input.auction_type === 'down' && input.price_drop_amount && input.price_drop_interval) {
        const nextDrop = new Date();
        nextDrop.setMinutes(nextDrop.getMinutes() + input.price_drop_interval);
        
        Object.assign(auctionData, {
          price_drop_amount: input.price_drop_amount,
          price_drop_interval: input.price_drop_interval,
          next_price_drop_at: nextDrop.toISOString(),
        });
      }

      const { data, error: createError } = await supabase
        .from('auctions')
        .insert(auctionData)
        .select()
        .single();

      if (createError) throw createError;
      
      return data;
    } catch (err) {
      setError(err instanceof Error ? err.message : '경매 등록에 실패했습니다.');
      return null;
    } finally {
      setLoading(false);
    }
  };

  return { createAuction, loading, error };
}

// ============================================
// 경매 관심(찜) 훅
// ============================================
export function useAuctionWatch(auctionId: string) {
  const [isWatching, setIsWatching] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const checkWatch = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from('auction_watches')
        .select('id')
        .eq('auction_id', auctionId)
        .eq('user_id', user.id)
        .single();

      setIsWatching(!!data);
    };

    checkWatch();
  }, [auctionId]);

  const toggleWatch = async () => {
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('로그인이 필요합니다.');
      }

      if (isWatching) {
        await supabase
          .from('auction_watches')
          .delete()
          .eq('auction_id', auctionId)
          .eq('user_id', user.id);
        
        setIsWatching(false);
      } else {
        await supabase
          .from('auction_watches')
          .insert({ auction_id: auctionId, user_id: user.id });
        
        setIsWatching(true);
      }
    } catch (err) {
      console.error('관심 등록 실패:', err);
    } finally {
      setLoading(false);
    }
  };

  return { isWatching, toggleWatch, loading };
}

// ============================================
// 남은 시간 계산 훅
// ============================================
export function useCountdown(endTime: string) {
  const [timeLeft, setTimeLeft] = useState<{
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
    isExpired: boolean;
  }>({ days: 0, hours: 0, minutes: 0, seconds: 0, isExpired: false });

  useEffect(() => {
    const calculateTimeLeft = () => {
      const difference = new Date(endTime).getTime() - Date.now();
      
      if (difference <= 0) {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0, isExpired: true });
        return;
      }

      setTimeLeft({
        days: Math.floor(difference / (1000 * 60 * 60 * 24)),
        hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
        minutes: Math.floor((difference / 1000 / 60) % 60),
        seconds: Math.floor((difference / 1000) % 60),
        isExpired: false,
      });
    };

    calculateTimeLeft();
    const timer = setInterval(calculateTimeLeft, 1000);

    return () => clearInterval(timer);
  }, [endTime]);

  return timeLeft;
}
