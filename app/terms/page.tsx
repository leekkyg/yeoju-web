"use client";

import { useRouter } from "next/navigation";
import BottomNav from "@/components/BottomNav";

export default function TermsPage() {
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
          <h1 className="text-gray-900 font-bold text-lg">이용약관</h1>
        </div>
      </header>

      <main className="max-w-[631px] mx-auto px-4 py-6">
        <div className="bg-white rounded-2xl p-6 space-y-6">
          <p className="text-gray-500 text-sm">시행일: 2026년 1월 1일</p>

          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-3">제1조 (목적)</h2>
            <p className="text-gray-700 leading-relaxed">
              본 약관은 여주마켓(이하 "회사")이 제공하는 서비스의 이용조건 및 절차, 
              회사와 회원 간의 권리, 의무 및 책임사항을 규정함을 목적으로 합니다.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-3">제2조 (용어의 정의)</h2>
            <div className="space-y-3">
              <div className="bg-gray-50 rounded-xl p-4">
                <p className="font-semibold text-gray-800">서비스</p>
                <p className="text-gray-600 text-sm mt-1">
                  회사가 제공하는 공동구매, 커뮤니티, 지역 정보 등 모든 서비스를 의미합니다.
                </p>
              </div>
              <div className="bg-gray-50 rounded-xl p-4">
                <p className="font-semibold text-gray-800">회원</p>
                <p className="text-gray-600 text-sm mt-1">
                  회사와 서비스 이용 계약을 체결하고 이용자 ID를 부여받은 자를 의미합니다.
                </p>
              </div>
              <div className="bg-gray-50 rounded-xl p-4">
                <p className="font-semibold text-gray-800">판매자</p>
                <p className="text-gray-600 text-sm mt-1">
                  회사의 승인을 받아 서비스 내에서 공동구매를 진행하는 사업자 회원을 의미합니다.
                </p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-3">제3조 (약관의 효력 및 변경)</h2>
            <ul className="text-gray-700 space-y-2">
              <li className="flex gap-2">
                <span className="text-emerald-500">①</span>
                <span>본 약관은 서비스 화면에 게시하거나 기타의 방법으로 회원에게 공지함으로써 효력이 발생합니다.</span>
              </li>
              <li className="flex gap-2">
                <span className="text-emerald-500">②</span>
                <span>회사는 필요한 경우 약관을 변경할 수 있으며, 변경된 약관은 공지사항을 통해 공지합니다.</span>
              </li>
              <li className="flex gap-2">
                <span className="text-emerald-500">③</span>
                <span>회원이 변경된 약관에 동의하지 않는 경우 서비스 이용을 중단하고 탈퇴할 수 있습니다.</span>
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-3">제4조 (회원가입)</h2>
            <ul className="text-gray-700 space-y-2">
              <li className="flex gap-2">
                <span className="text-emerald-500">①</span>
                <span>이용자는 회사가 정한 가입 양식에 따라 회원정보를 기입한 후 본 약관에 동의함으로써 회원가입을 신청합니다.</span>
              </li>
              <li className="flex gap-2">
                <span className="text-emerald-500">②</span>
                <span>회사는 신청자의 신청에 대해 서비스 이용을 승낙함을 원칙으로 합니다. 다만, 다음에 해당하는 경우 승낙을 거부할 수 있습니다.</span>
              </li>
            </ul>
            <div className="bg-gray-50 rounded-xl p-4 mt-2 text-sm text-gray-600 space-y-1">
              <p>• 실명이 아니거나 타인의 명의를 사용한 경우</p>
              <p>• 허위 정보를 기재한 경우</p>
              <p>• 이전에 회원 자격을 상실한 적이 있는 경우</p>
              <p>• 기타 회사가 정한 가입 요건을 충족하지 못한 경우</p>
            </div>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-3">제5조 (서비스의 제공)</h2>
            <p className="text-gray-700 leading-relaxed mb-2">회사는 다음과 같은 서비스를 제공합니다.</p>
            <ul className="text-gray-700 space-y-1">
              <li className="flex gap-2">
                <span className="text-emerald-500">•</span>
                <span>공동구매 서비스</span>
              </li>
              <li className="flex gap-2">
                <span className="text-emerald-500">•</span>
                <span>커뮤니티 서비스</span>
              </li>
              <li className="flex gap-2">
                <span className="text-emerald-500">•</span>
                <span>지역 정보 서비스</span>
              </li>
              <li className="flex gap-2">
                <span className="text-emerald-500">•</span>
                <span>기타 회사가 정하는 서비스</span>
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-3">제6조 (회원의 의무)</h2>
            <p className="text-gray-700 leading-relaxed mb-2">회원은 다음 행위를 하여서는 안 됩니다.</p>
            <div className="bg-red-50 rounded-xl p-4 text-sm text-red-700 space-y-1">
              <p>• 허위 정보 등록</p>
              <p>• 타인의 정보 도용</p>
              <p>• 회사 또는 제3자의 저작권 등 지적재산권 침해</p>
              <p>• 회사 또는 제3자의 명예 훼손, 업무 방해</p>
              <p>• 음란물, 욕설 등 공서양속에 반하는 내용 게시</p>
              <p>• 해킹, 악성 프로그램 유포</p>
              <p>• 광고성 정보의 무단 전송</p>
              <p>• 기타 관계 법령에 위배되는 행위</p>
            </div>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-3">제7조 (서비스 이용 제한)</h2>
            <p className="text-gray-700 leading-relaxed">
              회사는 회원이 본 약관의 의무를 위반하거나 서비스의 정상적인 운영을 방해한 경우, 
              경고, 일시정지, 영구이용정지 등으로 서비스 이용을 단계적으로 제한할 수 있습니다.
            </p>
            <div className="bg-amber-50 rounded-xl p-4 mt-2 text-sm text-amber-700">
              <p className="font-semibold">제재 단계</p>
              <p className="mt-1">1차: 경고 / 2차: 글쓰기·댓글 제한 (1~30일) / 3차: 영구 이용정지</p>
            </div>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-3">제8조 (공동구매 관련 규정)</h2>
            <ul className="text-gray-700 space-y-2">
              <li className="flex gap-2">
                <span className="text-emerald-500">①</span>
                <span>공동구매의 계약은 구매자와 판매자 간에 직접 체결되며, 회사는 중개 플랫폼의 역할을 합니다.</span>
              </li>
              <li className="flex gap-2">
                <span className="text-emerald-500">②</span>
                <span>공동구매 목표 인원 미달 시 취소될 수 있으며, 이 경우 결제금액은 환불됩니다.</span>
              </li>
              <li className="flex gap-2">
                <span className="text-emerald-500">③</span>
                <span>상품의 품질, 배송 등에 관한 책임은 판매자에게 있습니다.</span>
              </li>
              <li className="flex gap-2">
                <span className="text-emerald-500">④</span>
                <span>구매 확정 후 환불은 판매자의 환불 정책에 따릅니다.</span>
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-3">제9조 (게시물의 권리 및 책임)</h2>
            <ul className="text-gray-700 space-y-2">
              <li className="flex gap-2">
                <span className="text-emerald-500">①</span>
                <span>회원이 작성한 게시물의 저작권은 해당 회원에게 귀속됩니다.</span>
              </li>
              <li className="flex gap-2">
                <span className="text-emerald-500">②</span>
                <span>회사는 서비스 운영 목적으로 회원의 게시물을 사용할 수 있습니다.</span>
              </li>
              <li className="flex gap-2">
                <span className="text-emerald-500">③</span>
                <span>회사는 법령 위반 또는 약관 위반 게시물을 사전 통보 없이 삭제할 수 있습니다.</span>
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-3">제10조 (면책조항)</h2>
            <ul className="text-gray-700 space-y-2">
              <li className="flex gap-2">
                <span className="text-emerald-500">①</span>
                <span>회사는 천재지변 또는 불가항력적 사유로 서비스를 제공할 수 없는 경우 책임이 면제됩니다.</span>
              </li>
              <li className="flex gap-2">
                <span className="text-emerald-500">②</span>
                <span>회사는 회원의 귀책사유로 인한 서비스 이용 장애에 대해 책임지지 않습니다.</span>
              </li>
              <li className="flex gap-2">
                <span className="text-emerald-500">③</span>
                <span>회사는 회원 간 또는 회원과 제3자 간의 분쟁에 개입하지 않으며, 이로 인한 손해를 배상할 책임이 없습니다.</span>
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-3">제11조 (분쟁 해결)</h2>
            <p className="text-gray-700 leading-relaxed">
              본 약관과 관련된 분쟁은 대한민국 법률에 따르며, 
              분쟁 발생 시 회사 소재지 관할 법원을 전속 관할 법원으로 합니다.
            </p>
          </section>

          <div className="pt-4 border-t border-gray-100">
            <p className="text-gray-400 text-sm text-center">
              본 약관은 2026년 1월 1일부터 시행됩니다.
            </p>
          </div>
        </div>
      </main>

      <BottomNav />
    </div>
  );
}
