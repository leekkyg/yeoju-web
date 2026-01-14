"use client";

import { useRouter } from "next/navigation";
import { useTheme } from "@/contexts/ThemeContext";
import { ArrowLeft, Shield } from "lucide-react";
import BottomNav from "@/components/BottomNav";

export default function PrivacyPage() {
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
          <h1 className="text-lg font-bold" style={{ color: theme.textPrimary }}>개인정보처리방침</h1>
        </div>
      </header>

      <main className="max-w-[640px] mx-auto px-4 py-4">
        <div className="rounded-2xl p-6 space-y-6" style={{ backgroundColor: theme.bgCard, border: `1px solid ${theme.borderLight}` }}>
          <p className="text-sm" style={{ color: theme.textMuted }}>시행일: 2026년 1월 1일</p>

          <section>
            <h2 className="text-lg font-bold mb-3" style={{ color: theme.textPrimary }}>제1조 (개인정보의 처리 목적)</h2>
            <p className="leading-relaxed mb-3" style={{ color: theme.textSecondary }}>
              여주마켓(이하 "회사")은 다음의 목적을 위하여 개인정보를 처리합니다.
            </p>
            <ul className="space-y-2" style={{ color: theme.textSecondary }}>
              <li className="flex gap-2">
                <span style={{ color: theme.accent }}>•</span>
                <span>회원 가입 및 관리: 회원 가입의사 확인, 본인 식별·인증, 회원자격 유지·관리</span>
              </li>
              <li className="flex gap-2">
                <span style={{ color: theme.accent }}>•</span>
                <span>서비스 제공: 공동구매, 커뮤니티, 콘텐츠 제공, 맞춤서비스 제공</span>
              </li>
              <li className="flex gap-2">
                <span style={{ color: theme.accent }}>•</span>
                <span>고충처리: 민원인의 신원 확인, 민원사항 확인, 처리결과 통보</span>
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold mb-3" style={{ color: theme.textPrimary }}>제2조 (수집하는 개인정보 항목)</h2>
            <div className="space-y-3">
              <div className="rounded-xl p-4" style={{ backgroundColor: theme.bgInput }}>
                <p className="font-semibold" style={{ color: theme.textPrimary }}>필수항목</p>
                <p className="text-sm mt-1" style={{ color: theme.textMuted }}>
                  이메일, 비밀번호, 닉네임
                </p>
              </div>
              <div className="rounded-xl p-4" style={{ backgroundColor: theme.bgInput }}>
                <p className="font-semibold" style={{ color: theme.textPrimary }}>선택항목</p>
                <p className="text-sm mt-1" style={{ color: theme.textMuted }}>
                  프로필 이미지, 휴대폰 번호, 주소
                </p>
              </div>
              <div className="rounded-xl p-4" style={{ backgroundColor: theme.bgInput }}>
                <p className="font-semibold" style={{ color: theme.textPrimary }}>자동 수집 항목</p>
                <p className="text-sm mt-1" style={{ color: theme.textMuted }}>
                  IP 주소, 접속 로그, 서비스 이용 기록, 기기 정보
                </p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-lg font-bold mb-3" style={{ color: theme.textPrimary }}>제3조 (개인정보의 보유 및 이용기간)</h2>
            <p className="leading-relaxed mb-3" style={{ color: theme.textSecondary }}>
              회사는 원칙적으로 개인정보 수집 및 이용목적이 달성된 후에는 해당 정보를 지체 없이 파기합니다. 
              단, 관계법령에 따라 보존할 필요가 있는 경우 일정 기간 보관합니다.
            </p>
            <div className="rounded-xl p-4 text-sm space-y-2" style={{ backgroundColor: theme.bgInput, color: theme.textMuted }}>
              <p>• 계약 또는 청약철회 등에 관한 기록: 5년</p>
              <p>• 대금결제 및 재화 등의 공급에 관한 기록: 5년</p>
              <p>• 소비자의 불만 또는 분쟁처리에 관한 기록: 3년</p>
              <p>• 접속에 관한 기록: 3개월</p>
            </div>
          </section>

          <section>
            <h2 className="text-lg font-bold mb-3" style={{ color: theme.textPrimary }}>제4조 (개인정보의 제3자 제공)</h2>
            <p className="leading-relaxed" style={{ color: theme.textSecondary }}>
              회사는 원칙적으로 이용자의 개인정보를 외부에 제공하지 않습니다. 
              다만, 다음의 경우에는 예외로 합니다.
            </p>
            <ul className="space-y-2 mt-3" style={{ color: theme.textSecondary }}>
              <li className="flex gap-2">
                <span style={{ color: theme.accent }}>•</span>
                <span>이용자가 사전에 동의한 경우</span>
              </li>
              <li className="flex gap-2">
                <span style={{ color: theme.accent }}>•</span>
                <span>법령의 규정에 의한 경우</span>
              </li>
              <li className="flex gap-2">
                <span style={{ color: theme.accent }}>•</span>
                <span>서비스 제공에 따른 요금정산을 위해 필요한 경우</span>
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold mb-3" style={{ color: theme.textPrimary }}>제5조 (개인정보처리의 위탁)</h2>
            <p className="leading-relaxed mb-3" style={{ color: theme.textSecondary }}>
              회사는 서비스 향상을 위해 개인정보 처리를 외부에 위탁할 수 있습니다.
            </p>
            <div className="rounded-xl p-4 text-sm" style={{ backgroundColor: theme.bgInput }}>
              <div className="grid grid-cols-2 gap-2" style={{ color: theme.textMuted }}>
                <div>
                  <p className="font-semibold" style={{ color: theme.textPrimary }}>수탁업체</p>
                  <p>Supabase (인증·DB)</p>
                  <p>Cloudflare (이미지 저장)</p>
                </div>
                <div>
                  <p className="font-semibold" style={{ color: theme.textPrimary }}>위탁업무</p>
                  <p>회원 인증, 데이터 저장</p>
                  <p>이미지 호스팅</p>
                </div>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-lg font-bold mb-3" style={{ color: theme.textPrimary }}>제6조 (이용자의 권리·의무)</h2>
            <ul className="space-y-2" style={{ color: theme.textSecondary }}>
              <li className="flex gap-2">
                <span style={{ color: theme.accent }}>•</span>
                <span>개인정보 열람 요구권</span>
              </li>
              <li className="flex gap-2">
                <span style={{ color: theme.accent }}>•</span>
                <span>오류 등이 있을 경우 정정 요구권</span>
              </li>
              <li className="flex gap-2">
                <span style={{ color: theme.accent }}>•</span>
                <span>삭제 요구권</span>
              </li>
              <li className="flex gap-2">
                <span style={{ color: theme.accent }}>•</span>
                <span>처리정지 요구권</span>
              </li>
            </ul>
            <p className="mt-3 text-sm" style={{ color: theme.textMuted }}>
              위 권리 행사는 마이페이지 또는 고객센터를 통해 가능합니다.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold mb-3" style={{ color: theme.textPrimary }}>제7조 (개인정보의 파기)</h2>
            <ul className="space-y-2" style={{ color: theme.textSecondary }}>
              <li className="flex gap-2">
                <span style={{ color: theme.accent }}>•</span>
                <span>전자적 파일: 복구할 수 없는 방법으로 영구 삭제</span>
              </li>
              <li className="flex gap-2">
                <span style={{ color: theme.accent }}>•</span>
                <span>종이 문서: 분쇄기로 분쇄 또는 소각</span>
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold mb-3" style={{ color: theme.textPrimary }}>제8조 (개인정보 보호책임자)</h2>
            <div className="rounded-xl p-4" style={{ backgroundColor: `${theme.accent}15`, border: `1px solid ${theme.accent}30` }}>
              <div className="space-y-2 text-sm" style={{ color: theme.textSecondary }}>
                <p><span className="font-semibold" style={{ color: theme.textPrimary }}>담당부서:</span> 개인정보보호팀</p>
                <p><span className="font-semibold" style={{ color: theme.textPrimary }}>이메일:</span> privacy@yeojumarket.com</p>
                <p><span className="font-semibold" style={{ color: theme.textPrimary }}>연락처:</span> 고객센터 문의</p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-lg font-bold mb-3" style={{ color: theme.textPrimary }}>제9조 (개인정보 자동 수집 장치)</h2>
            <p className="leading-relaxed" style={{ color: theme.textSecondary }}>
              회사는 쿠키(Cookie)를 사용하여 이용자의 정보를 저장하고 수시로 불러옵니다. 
              이용자는 웹 브라우저 설정을 통해 쿠키 저장을 거부할 수 있습니다.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold mb-3" style={{ color: theme.textPrimary }}>제10조 (개인정보의 안전성 확보조치)</h2>
            <ul className="space-y-2" style={{ color: theme.textSecondary }}>
              <li className="flex gap-2">
                <span style={{ color: theme.accent }}>•</span>
                <span>개인정보 암호화</span>
              </li>
              <li className="flex gap-2">
                <span style={{ color: theme.accent }}>•</span>
                <span>해킹 등에 대비한 기술적 대책</span>
              </li>
              <li className="flex gap-2">
                <span style={{ color: theme.accent }}>•</span>
                <span>개인정보 접근 제한</span>
              </li>
              <li className="flex gap-2">
                <span style={{ color: theme.accent }}>•</span>
                <span>접속기록의 보관 및 위변조 방지</span>
              </li>
            </ul>
          </section>

          <div className="pt-4" style={{ borderTop: `1px solid ${theme.border}` }}>
            <p className="text-sm text-center" style={{ color: theme.textMuted }}>
              본 방침은 2026년 1월 1일부터 시행됩니다.
            </p>
          </div>
        </div>
      </main>

      <BottomNav />
    </div>
  );
}
