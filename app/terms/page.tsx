import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default function TermsPage() {
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

        <h1 className="text-4xl font-bold mb-8">이용약관</h1>

        <div className="space-y-8 text-gray-300">
          <section>
            <h2 className="text-2xl font-bold text-white mb-4">제1조 (목적)</h2>
            <p>
              본 약관은 Vocatify(이하 &apos;서비스&apos;)의 이용과 관련하여 서비스 제공자와 이용자 간의 권리, 의무 및 책임사항을 규정함을 목적으로 합니다.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">제2조 (정의)</h2>
            <ul className="list-disc list-inside space-y-2">
              <li>&apos;서비스&apos;란 Vocatify가 제공하는 보컬로이드 음악 차트 및 관련 서비스를 의미합니다.</li>
              <li>&apos;이용자&apos;란 본 약관에 따라 서비스를 이용하는 회원 및 비회원을 의미합니다.</li>
              <li>&apos;회원&apos;이란 서비스에 가입하여 지속적으로 서비스를 이용할 수 있는 자를 의미합니다.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">제3조 (서비스의 제공)</h2>
            <ul className="list-disc list-inside space-y-2">
              <li>보컬로이드 음악 차트 정보 제공</li>
              <li>음악 재생 및 플레이리스트 기능</li>
              <li>즐겨찾기 및 개인화 기능</li>
              <li>기타 서비스 제공자가 정하는 서비스</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">제4조 (저작권)</h2>
            <p>
              서비스에서 제공하는 음악 콘텐츠는 VocaDB 및 YouTube의 API를 통해 제공되며, 모든 저작권은 원 저작권자에게 있습니다.
              서비스는 콘텐츠의 집계 및 정보 제공 목적으로만 사용됩니다.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">제5조 (면책사항)</h2>
            <p>
              서비스는 외부 API(VocaDB, YouTube)에 의존하여 운영되며, 외부 서비스의 장애 또는 변경으로 인한 서비스 중단에 대해 책임을 지지 않습니다.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">제6조 (문의)</h2>
            <p>
              본 약관과 관련된 문의사항은 GitHub 저장소를 통해 연락 주시기 바랍니다.
            </p>
          </section>

          <p className="text-sm text-gray-500 mt-12">
            최종 수정일: 2026년 1월 28일
          </p>
        </div>
      </div>
    </div>
  );
}
