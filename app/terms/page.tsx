"use client";

import { useRouter } from "next/navigation";
import { useTheme } from "@/contexts/ThemeContext";
import { ArrowLeft, FileText } from "lucide-react";
import BottomNav from "@/components/BottomNav";

export default function TermsPage() {
  const router = useRouter();
  const { theme, isDark, mounted } = useTheme();

  if (!mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: theme.bgMain }}>
        <div className="w-10 h-10 border-2 rounded-full animate-spin" style={{ borderColor: theme.border, borderTopColor: theme.accent }}></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-24 transition-colors duration-300" style={{ backgroundColor: theme.bgMain }}>
      {/* 헤더 */}
      <header className="sticky top-0 z-50" style={{ backgroundColor: theme.bgMain, borderBottom: `1px solid ${theme.borderLight}` }}>
        <div className="max-w-[640px] mx-auto px-4 py-3 flex items-center gap-3">
          <button onClick={() => router.back()} className="p-1 -ml-1 rounded-lg" style={{ color: theme.textPrimary }}>
            <ArrowLeft className="w-6 h-6" strokeWidth={1.5} />
          </button>
          <h1 className="text-lg font-bold" style={{ color: theme.textPrimary }}>이용약관</h1>
        </div>
      </header>

      <main className="max-w-[640px] mx-auto px-4 py-4">
        <div className="rounded-2xl p-6 space-y-6" style={{ backgroundColor: theme.bgCard, border: `1px solid ${theme.borderLight}` }}>
          <p className="text-sm" style={{ color: theme.textMuted }}>시행일: 2026년 1월 1일</p>

          <section>
            <h2 className="text-lg font-bold mb-3" style={{ color: theme.textPrimary }}>제1조 (목적)</h2>
            <p className="leading-relaxed" style={{ color: theme.textSecondary }}>
              본 약관은 여주마켓(이하 "회사")이 제공하는 서비스의 이용조건 및 절차, 
              회사와 회원 간의 권리, 의무 및 책임사항을 규정함을 목적으로 합니다.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold mb-3" style={{ color: theme.textPrimary }}>제2조 (용어의 정의)</h2>
            <div className="space-y-3">
              <div className="rounded-xl p-4" style={{ backgroundColor: theme.bgInput }}>
                <p className="font-semibold" style={{ color: theme.textPrimary }}>서비스</p>
                <p className="text-sm mt-1" style={{ color: theme.textMuted }}>
                  회사가 제공하는 공동구매, 커뮤니티, 지역 정보 등 모든 서비스를 의미합니다.
                </p>
              </div>
              <div className="rounded-xl p-4" style={{ backgroundColor: theme.bgInput }}>
                <p className="font-semibold" style={{ color: theme.textPrimary }}>회원</p>
                <p className="text-sm mt-1" style={{ color: theme.textMuted }}>
                  회사와 서비스 이용 계약을 체결하고 이용자 ID를 부여받은 자를 의미합니다.
                </p>
              </div>
              <div className="rounded-xl p-4" style={{ backgroundColor: theme.bgInput }}>
                <p className="font-semibold" style={{ color: theme.textPrimary }}>판매자</p>
                <p className="text-sm mt-1" style={{ color: theme.textMuted }}>
                  회사의 승인을 받아 서비스 내에서 공동구매를 진행하는 사업자 회원을 의미합니다.
                </p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-lg font-bold mb-3" style={{ color: theme.textPrimary }}>제3조 (약관의 효력 및 변경)</h2>
            <ul className="space-y-2" style={{ color: theme.textSecondary }}>
              <li className="flex gap-2">
                <span style={{ color: theme.accent }}>•</span>
                <span>본 약관은 서비스 화면에 게시하거나 기타 방법으로 회원에게 공지함으로써 효력이 발생합니다.</span>
              </li>
              <li className="flex gap-2">
                <span style={{ color: theme.accent }}>•</span>
                <span>회사는 필요한 경우 약관을 변경할 수 있으며, 변경된 약관은 공지사항을 통해 공지합니다.</span>
              </li>
              <li className="flex gap-2">
                <span style={{ color: theme.accent }}>•</span>
                <span>회원이 변경된 약관에 동의하지 않는 경우 서비스 이용을 중단하고 탈퇴할 수 있습니다.</span>
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold mb-3" style={{ color: theme.textPrimary }}>제4조 (회원가입)</h2>
            <ul className="space-y-2" style={{ color: theme.textSecondary }}>
              <li className="flex gap-2">
                <span style={{ color: theme.accent }}>•</span>
                <span>이용자는 회사가 정한 가입 양식에 따라 회원정보를 기입한 후 본 약관에 동의함으로써 회원가입을 신청합니다.</span>
              </li>
              <li className="flex gap-2">
                <span style={{ color: theme.accent }}>•</span>
                <span>회사는 신청자의 신청에 대하여 서비스 이용을 승낙함을 원칙으로 합니다. 다만, 다음에 해당하는 경우 승낙을 거부할 수 있습니다.</span>
              </li>
            </ul>
            <div className="rounded-xl p-4 mt-2 text-sm space-y-1" style={{ backgroundColor: theme.bgInput, color: theme.textMuted }}>
              <p>• 타인의 명의나 타인의 명의를 사용한 경우</p>
              <p>• 허위 정보를 기재한 경우</p>
              <p>• 이전에 회원 자격을 상실한 적이 있는 경우</p>
              <p>• 기타 회사가 정한 가입조건을 충족하지 못한 경우</p>
            </div>
          </section>

          <section>
            <h2 className="text-lg font-bold mb-3" style={{ color: theme.textPrimary }}>제5조 (서비스의 제공)</h2>
            <p className="mb-2 leading-relaxed" style={{ color: theme.textSecondary }}>회사는 다음과 같은 서비스를 제공합니다.</p>
            <ul className="space-y-1" style={{ color: theme.textSecondary }}>
              <li className="flex gap-2">
                <span style={{ color: theme.accent }}>•</span>
                <span>공동구매 서비스</span>
              </li>
              <li className="flex gap-2">
                <span style={{ color: theme.accent }}>•</span>
                <span>커뮤니티 서비스</span>
              </li>
              <li className="flex gap-2">
                <span style={{ color: theme.accent }}>•</span>
                <span>지역 정보 서비스</span>
              </li>
              <li className="flex gap-2">
                <span style={{ color: theme.accent }}>•</span>
                <span>기타 회사가 정하는 서비스</span>
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold mb-3" style={{ color: theme.textPrimary }}>제6조 (회원의 의무)</h2>
            <p className="mb-2 leading-relaxed" style={{ color: theme.textSecondary }}>회원은 다음 행위를 하여서는 안 됩니다.</p>
            <div className="rounded-xl p-4 text-sm space-y-1" style={{ backgroundColor: theme.redBg, color: theme.red }}>
              <p>• 허위 정보 등록</p>
              <p>• 타인의 정보 도용</p>
              <p>• 회사 또는 타인의 명예훼손 및 지식재산권 침해</p>
              <p>• 회사 또는 타인의 명예 훼손, 업무 방해</p>
              <p>• 외설문, 폭력물 등 공서양속에 반하는 내용 게시</p>
              <p>• 해킹, 악성 프로그램 유포</p>
              <p>• 광고성 정보의 무단 전송</p>
              <p>• 기타 관계 법령에 위반되는 행위</p>
            </div>
          </section>

          <section>
            <h2 className="text-lg font-bold mb-3" style={{ color: theme.textPrimary }}>제7조 (서비스 이용 제한)</h2>
            <p className="leading-relaxed" style={{ color: theme.textSecondary }}>
              회사는 회원이 본 약관의 의무를 위반하거나 서비스의 정상적인 운영을 방해한 경우, 
              경고, 일시정지, 영구이용정지 등으로 서비스 이용을 단계적으로 제한할 수 있습니다.
            </p>
            <div className="rounded-xl p-4 mt-2 text-sm" style={{ backgroundColor: `${theme.accent}15`, color: theme.accent }}>
              <p className="font-semibold">제재 단계</p>
              <p className="mt-1">1차 경고 / 2차 글쓰기·댓글 제한 (1~30일) / 3차 영구 이용정지</p>
            </div>
          </section>

          <section>
            <h2 className="text-lg font-bold mb-3" style={{ color: theme.textPrimary }}>제8조 (공동구매 관련 규정)</h2>
            <ul className="space-y-2" style={{ color: theme.textSecondary }}>
              <li className="flex gap-2">
                <span style={{ color: theme.accent }}>•</span>
                <span>공동구매의 계약은 구매자와 판매자 간에 직접 체결되며, 회사는 중개 플랫폼의 역할을 합니다.</span>
              </li>
              <li className="flex gap-2">
                <span style={{ color: theme.accent }}>•</span>
                <span>공동구매 목표 인원 미달 시 취소될 수 있으며 그 경우 결제금액은 환불됩니다.</span>
              </li>
              <li className="flex gap-2">
                <span style={{ color: theme.accent }}>•</span>
                <span>상품의 하자, 배송 등에 관한 책임은 판매자에게 있습니다.</span>
              </li>
              <li className="flex gap-2">
                <span style={{ color: theme.accent }}>•</span>
                <span>구매 확정 후 환불은 판매자의 환불 정책에 따릅니다.</span>
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold mb-3" style={{ color: theme.textPrimary }}>제9조 (게시물의 권리 및 책임)</h2>
            <ul className="space-y-2" style={{ color: theme.textSecondary }}>
              <li className="flex gap-2">
                <span style={{ color: theme.accent }}>•</span>
                <span>회원이 작성한 게시물의 저작권은 해당 회원에게 귀속됩니다.</span>
              </li>
              <li className="flex gap-2">
                <span style={{ color: theme.accent }}>•</span>
                <span>회사는 서비스 운영 목적으로 회원의 게시물을 사용할 수 있습니다.</span>
              </li>
              <li className="flex gap-2">
                <span style={{ color: theme.accent }}>•</span>
                <span>회사는 법령 위반 또는 약관 위반 게시물을 사전 통보 없이 삭제할 수 있습니다.</span>
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold mb-3" style={{ color: theme.textPrimary }}>제10조 (면책조항)</h2>
            <ul className="space-y-2" style={{ color: theme.textSecondary }}>
              <li className="flex gap-2">
                <span style={{ color: theme.accent }}>•</span>
                <span>회사는 천재지변 또는 불가항력적 사유로 서비스를 제공할 수 없는 경우 책임이 면제됩니다.</span>
              </li>
              <li className="flex gap-2">
                <span style={{ color: theme.accent }}>•</span>
                <span>회사는 회원의 귀책사유로 인한 서비스 이용 장애에 대해 책임지지 않습니다.</span>
              </li>
              <li className="flex gap-2">
                <span style={{ color: theme.accent }}>•</span>
                <span>회사는 회원 간 또는 회원과 타인 간의 분쟁에 개입하지 않으며 이로 인한 피해를 배상할 책임이 없습니다.</span>
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold mb-3" style={{ color: theme.textPrimary }}>제11조 (분쟁 해결)</h2>
            <p className="leading-relaxed" style={{ color: theme.textSecondary }}>
              본 약관과 관련된 분쟁은 대한민국 법령에 따르며 
              분쟁 발생 시 회사 소재지 관할 법원을 전속 관할 법원으로 합니다.
            </p>
          </section>

          <div className="pt-4" style={{ borderTop: `1px solid ${theme.border}` }}>
            <p className="text-sm text-center" style={{ color: theme.textMuted }}>
              본 약관은 2026년 1월 1일부터 시행됩니다.
            </p>
          </div>
        </div>
      </main>

      <BottomNav />
    </div>
  );
}
