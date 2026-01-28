import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default function PrivacyPage() {
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

        <h1 className="text-4xl font-bold mb-8">개인정보처리방침</h1>

        <div className="space-y-8 text-gray-300">
          <section>
            <h2 className="text-2xl font-bold text-white mb-4">1. 개인정보의 수집 및 이용 목적</h2>
            <p>
              Vocatify는 다음의 목적을 위해 개인정보를 수집 및 이용합니다:
            </p>
            <ul className="list-disc list-inside space-y-2 mt-3">
              <li>회원 가입 및 관리</li>
              <li>서비스 제공 및 개인화</li>
              <li>플레이리스트 및 즐겨찾기 저장</li>
              <li>서비스 개선 및 통계 분석</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">2. 수집하는 개인정보 항목</h2>
            <div className="space-y-4">
              <div>
                <h3 className="text-xl font-semibold text-white mb-2">필수 항목 (Google OAuth)</h3>
                <ul className="list-disc list-inside space-y-1">
                  <li>이메일 주소</li>
                  <li>이름</li>
                  <li>프로필 사진 URL</li>
                </ul>
              </div>
              <div>
                <h3 className="text-xl font-semibold text-white mb-2">자동 수집 항목</h3>
                <ul className="list-disc list-inside space-y-1">
                  <li>접속 로그</li>
                  <li>쿠키 (세션 유지용)</li>
                </ul>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">3. 개인정보의 보유 및 이용 기간</h2>
            <p>
              회원 탈퇴 시까지 보유하며, 탈퇴 시 즉시 파기합니다. 다만, 관련 법령에 따라 보존할 필요가 있는 경우 해당 기간 동안 보관합니다.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">4. 개인정보의 제3자 제공</h2>
            <p>
              Vocatify는 원칙적으로 이용자의 개인정보를 제3자에게 제공하지 않습니다. 다만, 다음의 경우 예외로 합니다:
            </p>
            <ul className="list-disc list-inside space-y-2 mt-3">
              <li>이용자가 사전에 동의한 경우</li>
              <li>법령의 규정에 의한 경우</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">5. 개인정보의 위탁</h2>
            <p>
              서비스는 다음의 외부 서비스를 이용합니다:
            </p>
            <ul className="list-disc list-inside space-y-2 mt-3">
              <li>Google OAuth (로그인 인증)</li>
              <li>Vercel (호스팅)</li>
              <li>Neon (데이터베이스)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">6. 쿠키의 운영</h2>
            <p>
              서비스는 사용자 로그인 상태 유지를 위해 필수 쿠키를 사용합니다.
              브라우저 설정을 통해 쿠키를 거부할 수 있으나, 이 경우 서비스 이용에 제한이 있을 수 있습니다.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">7. 개인정보 보호책임자</h2>
            <p>
              개인정보 보호와 관련된 문의사항은 GitHub 저장소를 통해 연락 주시기 바랍니다.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">8. 권리 행사</h2>
            <p>
              이용자는 언제든지 다음의 권리를 행사할 수 있습니다:
            </p>
            <ul className="list-disc list-inside space-y-2 mt-3">
              <li>개인정보 열람 요구</li>
              <li>개인정보 정정 요구</li>
              <li>개인정보 삭제 요구 (회원 탈퇴)</li>
              <li>개인정보 처리 정지 요구</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">9. 개인정보의 안전성 확보 조치</h2>
            <ul className="list-disc list-inside space-y-2">
              <li>개인정보 암호화</li>
              <li>접근 제한</li>
              <li>정기적인 보안 업데이트</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">10. 개인정보처리방침의 변경</h2>
            <p>
              본 개인정보처리방침은 법령, 정책 또는 보안기술의 변경에 따라 내용이 추가, 삭제 및 수정될 수 있으며,
              변경 시 서비스 공지사항을 통해 고지합니다.
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
