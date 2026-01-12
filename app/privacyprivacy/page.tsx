"use client";

import { useRouter } from "next/navigation";
import BottomNav from "@/components/BottomNav";

export default function PrivacyPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* 헤더 */}
      <header className="bg-white sticky top-0 z-50 border-b border-gray-100">
        <div className="max-w-[631px] mx-auto px-4 h-14 flex items-center gap-3">
          <button onClick={() => router.back()} className="text-gray-600">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-gray-900 font-bold text-lg">개인정보처리방침</h1>
        </div>
      </header>

      <main className="max-w-[631px] mx-auto px-4 py-6">
        <div className="bg-white rounded-2xl p-6 space-y-6">
          <p className="text-gray-500 text-sm">시행일: 2026년 1월 1일</p>

          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-3">제1조 (목적)</h2>
            <p className="text-gray-700 leading-relaxed">
              여주마켓(이하 "회사")은 이용자의 개인정보를 중요시하며, 「개인정보 보호법」을 준수하고 있습니다. 
              본 개인정보처리방침은 회사가 제공하는 서비스 이용과 관련하여 이용자의 개인정보가 어떻게 수집, 이용, 보관, 파기되는지에 대해 안내드립니다.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-3">제2조 (수집하는 개인정보 항목)</h2>
            <p className="text-gray-700 leading-relaxed mb-2">회사는 서비스 제공을 위해 아래와 같은 개인정보를 수집합니다.</p>
            <div className="bg-gray-50 rounded-xl p-4 space-y-3">
              <div>
                <p className="font-semibold text-gray-800">필수 항목</p>
                <p className="text-gray-600 text-sm">이메일 주소, 비밀번호, 닉네임</p>
              </div>
              <div>
                <p className="font-semibold text-gray-800">선택 항목</p>
                <p className="text-gray-600 text-sm">프로필 사진, 연락처</p>
              </div>
              <div>
                <p className="font-semibold text-gray-800">자동 수집 항목</p>
                <p className="text-gray-600 text-sm">IP 주소, 접속 기기 정보, 서비스 이용 기록, 쿠키</p>
              </div>
              <div>
                <p className="font-semibold text-gray-800">사업자 회원 (선택)</p>
                <p className="text-gray-600 text-sm">상호명, 사업자등록번호, 대표자명, 사업장 주소, 계좌정보</p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-3">제3조 (개인정보의 수집 및 이용 목적)</h2>
            <ul className="text-gray-700 space-y-2">
              <li className="flex gap-2">
                <span className="text-emerald-500">•</span>
                <span>회원 가입 및 관리: 본인 확인, 서비스 제공, 공지사항 전달</span>
              </li>
              <li className="flex gap-2">
                <span className="text-emerald-500">•</span>
                <span>서비스 제공: 공동구매 참여, 커뮤니티 이용, 알림 발송</span>
              </li>
              <li className="flex gap-2">
                <span className="text-emerald-500">•</span>
                <span>고객 지원: 문의 응대, 불만 처리, 분쟁 해결</span>
              </li>
              <li className="flex gap-2">
                <span className="text-emerald-500">•</span>
                <span>서비스 개선: 이용 통계 분석, 신규 서비스 개발</span>
              </li>
              <li className="flex gap-2">
                <span className="text-emerald-500">•</span>
                <span>부정 이용 방지: 비인가 사용 방지, 약관 위반 회원 관리</span>
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-3">제4조 (개인정보의 보유 및 이용 기간)</h2>
            <p className="text-gray-700 leading-relaxed mb-2">
              회사는 개인정보 수집 및 이용 목적이 달성된 후에는 해당 정보를 지체 없이 파기합니다. 
              단, 관계 법령에 따라 보존할 필요가 있는 경우 아래와 같이 보관합니다.
            </p>
            <div className="bg-gray-50 rounded-xl p-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">계약 또는 청약철회 기록</span>
                <span className="text-gray-800 font-medium">5년</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">대금결제 및 재화 공급 기록</span>
                <span className="text-gray-800 font-medium">5년</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">소비자 불만 또는 분쟁 처리 기록</span>
                <span className="text-gray-800 font-medium">3년</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">접속 기록</span>
                <span className="text-gray-800 font-medium">3개월</span>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-3">제5조 (개인정보의 제3자 제공)</h2>
            <p className="text-gray-700 leading-relaxed">
              회사는 이용자의 개인정보를 원칙적으로 외부에 제공하지 않습니다. 
              다만, 아래의 경우에는 예외로 합니다.
            </p>
            <ul className="text-gray-700 mt-2 space-y-1">
              <li className="flex gap-2">
                <span className="text-emerald-500">•</span>
                <span>이용자가 사전에 동의한 경우</span>
              </li>
              <li className="flex gap-2">
                <span className="text-emerald-500">•</span>
                <span>법령의 규정에 의거하거나, 수사 목적으로 법령에 정해진 절차와 방법에 따라 수사기관의 요구가 있는 경우</span>
              </li>
              <li className="flex gap-2">
                <span className="text-emerald-500">•</span>
                <span>공동구매 진행 시 판매자에게 주문 정보 제공 (구매자 동의 시)</span>
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-3">제6조 (개인정보의 파기)</h2>
            <p className="text-gray-700 leading-relaxed">
              회사는 개인정보 보유 기간의 경과, 처리 목적 달성 등 개인정보가 불필요하게 되었을 때에는 
              지체 없이 해당 개인정보를 파기합니다.
            </p>
            <div className="bg-gray-50 rounded-xl p-4 mt-2 space-y-2 text-sm">
              <div>
                <span className="font-semibold text-gray-800">전자적 파일:</span>
                <span className="text-gray-600"> 복구 불가능한 방법으로 영구 삭제</span>
              </div>
              <div>
                <span className="font-semibold text-gray-800">종이 문서:</span>
                <span className="text-gray-600"> 분쇄기로 분쇄 또는 소각</span>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-3">제7조 (이용자의 권리와 행사 방법)</h2>
            <p className="text-gray-700 leading-relaxed mb-2">
              이용자는 언제든지 본인의 개인정보에 대해 다음의 권리를 행사할 수 있습니다.
            </p>
            <ul className="text-gray-700 space-y-1">
              <li className="flex gap-2">
                <span className="text-emerald-500">•</span>
                <span>개인정보 열람 요청</span>
              </li>
              <li className="flex gap-2">
                <span className="text-emerald-500">•</span>
                <span>오류 등이 있을 경우 정정 요청</span>
              </li>
              <li className="flex gap-2">
                <span className="text-emerald-500">•</span>
                <span>삭제 요청</span>
              </li>
              <li className="flex gap-2">
                <span className="text-emerald-500">•</span>
                <span>처리 정지 요청</span>
              </li>
            </ul>
            <p className="text-gray-600 text-sm mt-2">
              * 위 권리 행사는 마이페이지 또는 고객센터를 통해 가능합니다.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-3">제8조 (개인정보의 안전성 확보 조치)</h2>
            <p className="text-gray-700 leading-relaxed mb-2">
              회사는 개인정보의 안전성 확보를 위해 다음과 같은 조치를 취하고 있습니다.
            </p>
            <ul className="text-gray-700 space-y-1">
              <li className="flex gap-2">
                <span className="text-emerald-500">•</span>
                <span>비밀번호 암호화 저장</span>
              </li>
              <li className="flex gap-2">
                <span className="text-emerald-500">•</span>
                <span>SSL/TLS를 이용한 데이터 암호화 전송</span>
              </li>
              <li className="flex gap-2">
                <span className="text-emerald-500">•</span>
                <span>해킹 등에 대비한 보안 시스템 운영</span>
              </li>
              <li className="flex gap-2">
                <span className="text-emerald-500">•</span>
                <span>개인정보 취급자 최소화 및 교육</span>
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-3">제9조 (개인정보 보호책임자)</h2>
            <div className="bg-emerald-50 rounded-xl p-4">
              <p className="text-gray-700">
                <span className="font-semibold">개인정보 보호책임자</span>
              </p>
              <div className="mt-2 text-sm text-gray-600 space-y-1">
                <p>성명: 여주마켓 관리자</p>
                <p>이메일: privacy@yeojumarket.com</p>
              </div>
              <p className="text-gray-500 text-sm mt-3">
                개인정보 관련 문의사항은 위 연락처로 문의해 주시기 바랍니다.
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-3">제10조 (개인정보처리방침 변경)</h2>
            <p className="text-gray-700 leading-relaxed">
              이 개인정보처리방침은 법령, 정책 또는 보안 기술의 변경에 따라 내용이 추가, 삭제 및 수정될 수 있습니다. 
              변경 시에는 시행일 최소 7일 전에 공지사항을 통해 안내드립니다.
            </p>
          </section>

          <div className="pt-4 border-t border-gray-100">
            <p className="text-gray-400 text-sm text-center">
              본 방침은 2026년 1월 1일부터 시행됩니다.
            </p>
          </div>
        </div>
      </main>

      <BottomNav />
    </div>
  );
}
