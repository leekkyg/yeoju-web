import Link from "next/link";

export default function Footer() {
  return (
    <footer className="bg-[#1A1A1A] text-white py-6">
      <div className="max-w-[631px] mx-auto px-4">
        {/* 사업자 정보 */}
        <div className="text-gray-500 text-xs space-y-1">
                 </div>
        
        {/* 하단 */}
        <div className="mt-4 pt-4 border-t border-white/10 flex justify-between items-center text-xs">
          <p className="text-gray-500">© 2026 여주모아</p>
          <div className="flex gap-4 text-gray-500">
            <a href="#" className="hover:text-white">이용약관</a>
            <a href="#" className="hover:text-white">개인정보처리방침</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
