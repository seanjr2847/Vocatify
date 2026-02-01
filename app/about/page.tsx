import Link from 'next/link';
import { ArrowLeft, Database, Mail, Code2, Music } from 'lucide-react';

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-black text-white">
      <div className="max-w-4xl mx-auto px-6 py-12">
        {/* Back Navigation */}
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-8"
        >
          <ArrowLeft className="w-5 h-5" />
          <span className="text-sm font-semibold">홈으로 돌아가기</span>
        </Link>

        <h1 className="text-4xl font-bold mb-2">About</h1>
        <p className="text-gray-400 mb-12">Vocatify에 대해 알아보세요</p>

        <div className="space-y-12">
          {/* 서비스 소개 */}
          <section>
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-[#39c5bb]/10 rounded-lg">
                <Music className="w-5 h-5 text-[#39c5bb]" />
              </div>
              <h2 className="text-2xl font-bold">서비스 소개</h2>
            </div>
            <div className="text-gray-300 space-y-4 pl-12">
              <p>
                Vocatify는 전 세계 보컬로이드 음악의 YouTube 조회수를 수집하고
                실시간 랭킹을 제공하는 차트 서비스입니다.
              </p>
              <p>
                하츠네 미쿠, 카가미네 린·렌, 메구리네 루카 등 다양한 보컬로이드와
                UTAU, SynthesizerV, CeVIO 등 음성 합성 소프트웨어로 제작된
                270,000곡 이상의 음악 데이터를 제공합니다.
              </p>
            </div>
          </section>

          {/* 데이터 출처 */}
          <section>
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-[#39c5bb]/10 rounded-lg">
                <Database className="w-5 h-5 text-[#39c5bb]" />
              </div>
              <h2 className="text-2xl font-bold">데이터 출처</h2>
            </div>
            <div className="text-gray-300 space-y-4 pl-12">
              <p>
                Vocatify의 데이터는 다음 소스로부터 수집됩니다:
              </p>
              <ul className="space-y-3">
                <li className="flex items-start gap-3">
                  <span className="text-[#39c5bb] font-semibold min-w-[80px]">VocaDB</span>
                  <span>
                    보컬로이드 음악 데이터베이스에서 곡 정보, 아티스트, 태그 등
                    메타데이터를 가져옵니다.
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-[#39c5bb] font-semibold min-w-[80px]">YouTube</span>
                  <span>
                    YouTube Data API를 통해 조회수를 매일 수집하며,
                    한국어 제목 정보도 함께 가져옵니다.
                  </span>
                </li>
              </ul>
              <p className="text-sm text-gray-500">
                데이터는 매일 자동으로 업데이트됩니다.
              </p>
            </div>
          </section>

          {/* 기술 스택 */}
          <section>
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-[#39c5bb]/10 rounded-lg">
                <Code2 className="w-5 h-5 text-[#39c5bb]" />
              </div>
              <h2 className="text-2xl font-bold">기술 스택</h2>
            </div>
            <div className="pl-12">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {[
                  { name: 'Next.js 15', desc: 'App Router' },
                  { name: 'TypeScript', desc: '타입 안전성' },
                  { name: 'PostgreSQL', desc: '데이터베이스' },
                  { name: 'Prisma', desc: 'ORM' },
                  { name: 'Tailwind CSS', desc: '스타일링' },
                  { name: 'Vercel', desc: '호스팅' },
                ].map((tech) => (
                  <div
                    key={tech.name}
                    className="p-4 bg-[#1a1a1a] rounded-lg border border-gray-800"
                  >
                    <p className="font-semibold text-white">{tech.name}</p>
                    <p className="text-sm text-gray-500">{tech.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* 개발자 정보 */}
          <section>
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-[#39c5bb]/10 rounded-lg">
                <Mail className="w-5 h-5 text-[#39c5bb]" />
              </div>
              <h2 className="text-2xl font-bold">개발자</h2>
            </div>
            <div className="pl-12">
              <div className="p-6 bg-[#1a1a1a] rounded-lg border border-gray-800 inline-block">
                <p className="text-xl font-semibold text-white mb-2">Pytpo</p>
                <a
                  href="mailto:seanjr28475@gmail.com"
                  className="text-[#39c5bb] hover:underline flex items-center gap-2"
                >
                  <Mail className="w-4 h-4" />
                  seanjr28475@gmail.com
                </a>
              </div>
            </div>
          </section>
        </div>

        <p className="text-sm text-gray-500 mt-16 pt-8 border-t border-gray-800">
          © 2026 Vocatify. All rights reserved.
        </p>
      </div>
    </div>
  );
}
