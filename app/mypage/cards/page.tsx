'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTheme } from '@/contexts/ThemeContext';
import { supabase } from '@/lib/supabase';
import { CreditCard, Plus, Trash2, Check, ArrowLeft } from 'lucide-react';

interface PaymentMethod {
  id: number;
  billing_key: string;
  card_company: string;
  card_number: string;
  card_type: string;
  is_default: boolean;
  created_at: string;
}

function CardsContent() {
  const router = useRouter();
  const { theme, isDark } = useTheme();
  const [user, setUser] = useState<any>(null);
  const [cards, setCards] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkUser();
  }, []);

  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push('/login');
      return;
    }
    setUser(user);
    fetchCards(user.id);
  };

  const fetchCards = async (userId: string) => {
    const { data, error } = await supabase
      .from('payment_methods')
      .select('*')
      .eq('user_id', userId)
      .order('is_default', { ascending: false });

    if (!error && data) {
      setCards(data);
    }
    setLoading(false);
  };

  const handleAddCard = () => {
    router.push('/mypage/cards/register');
  };

  const handleSetDefault = async (id: number) => {
    await supabase
      .from('payment_methods')
      .update({ is_default: false })
      .eq('user_id', user?.id);

    await supabase
      .from('payment_methods')
      .update({ is_default: true })
      .eq('id', id);

    fetchCards(user?.id);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('이 카드를 삭제하시겠습니까?')) return;

    await supabase
      .from('payment_methods')
      .delete()
      .eq('id', id);

    fetchCards(user?.id);
  };

  const getCardCompanyName = (code: string) => {
    const companies: { [key: string]: string } = {
      '3K': '기업BC', '46': '광주', '71': '롯데',
      '30': '산업', '31': '비씨', '51': '삼성',
      '38': '새마을', '41': '신한', '62': '신협',
      '36': '씨티', '33': '우리', '37': '우체국',
      '39': '저축', '35': '전북', '42': '제주',
      '15': '카카오뱅크', '3A': '케이뱅크', '24': '토스뱅크',
      '21': '하나', '61': '현대', '11': 'KB국민',
      '91': 'NH농협', '34': 'Sh수협',
    };
    return companies[code] || code || '카드';
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: theme.bgMain }}>
        <div className="w-8 h-8 border-4 border-t-transparent rounded-full animate-spin" style={{ borderColor: theme.accent }} />
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: theme.bgMain }}>
      <div className="max-w-[640px] mx-auto">
        <div className="sticky top-0 z-10 px-4 py-3 flex items-center gap-3" style={{ backgroundColor: theme.bgMain, borderBottom: `1px solid ${theme.border}` }}>
          <button onClick={() => router.back()}>
            <ArrowLeft className="w-6 h-6" style={{ color: theme.textPrimary }} />
          </button>
          <h1 className="text-lg font-bold" style={{ color: theme.textPrimary }}>결제 카드 관리</h1>
        </div>

        <div className="p-4 space-y-4">
          <button
            onClick={handleAddCard}
            className="w-full p-4 rounded-xl border-2 border-dashed flex items-center justify-center gap-2"
            style={{ borderColor: theme.accent, color: theme.accent }}
          >
            <Plus className="w-5 h-5" />
            <span className="font-medium">새 카드 등록</span>
          </button>

          {cards.length === 0 ? (
            <div className="text-center py-12">
              <CreditCard className="w-16 h-16 mx-auto mb-4" style={{ color: theme.textMuted }} />
              <p style={{ color: theme.textMuted }}>등록된 카드가 없습니다</p>
            </div>
          ) : (
            <div className="space-y-3">
              {cards.map((card) => (
                <div
                  key={card.id}
                  className="p-4 rounded-xl flex items-center justify-between"
                  style={{ backgroundColor: theme.bgCard, border: card.is_default ? `2px solid ${theme.accent}` : 'none' }}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-8 rounded flex items-center justify-center" style={{ backgroundColor: theme.bgInput }}>
                      <CreditCard className="w-6 h-6" style={{ color: theme.textMuted }} />
                    </div>
                    <div>
                      <p className="font-medium" style={{ color: theme.textPrimary }}>
                        {getCardCompanyName(card.card_company)} {card.card_number}
                      </p>
                      <p className="text-sm" style={{ color: theme.textMuted }}>
                        {card.card_type === 'CREDIT' ? '신용카드' : '체크카드'}
                        {card.is_default && ' • 기본 결제 카드'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {!card.is_default && (
                      <button
                        onClick={() => handleSetDefault(card.id)}
                        className="p-2 rounded-lg"
                        style={{ backgroundColor: theme.bgInput }}
                        title="기본 카드로 설정"
                      >
                        <Check className="w-5 h-5" style={{ color: theme.textMuted }} />
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(card.id)}
                      className="p-2 rounded-lg"
                      style={{ backgroundColor: theme.bgInput }}
                      title="삭제"
                    >
                      <Trash2 className="w-5 h-5" style={{ color: theme.red }} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function CardsPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">로딩중...</div>}>
      <CardsContent />
    </Suspense>
  );
}