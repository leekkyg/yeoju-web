"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

interface HeaderProps {
  title?: string;
  showBack?: boolean;
  showLogo?: boolean;
  rightElement?: React.ReactNode;
  transparent?: boolean;
}

export default function Header({ 
  title, 
  showBack = false, 
  showLogo = false,
  rightElement,
  transparent = false 
}: HeaderProps) {
  const router = useRouter();

  return (
    <header className={`sticky top-0 z-50 ${transparent ? 'bg-transparent' : 'bg-white border-b border-gray-100'}`}>
      <div className="max-w-[631px] mx-auto px-4 h-14 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {showBack && (
            <button onClick={() => router.back()} className="text-gray-700 hover:text-gray-900">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          )}
          {showLogo && (
            <Link href="/" className="flex items-center gap-2">
              <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center">
                <span className="text-white font-black text-sm">여</span>
              </div>
              <span className="text-gray-900 font-bold text-lg">여주마켓</span>
            </Link>
          )}
          {title && <h1 className="text-gray-900 font-bold text-lg">{title}</h1>}
        </div>
        
        {rightElement && (
          <div className="flex items-center gap-2">
            {rightElement}
          </div>
        )}
      </div>
    </header>
  );
}
