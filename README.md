This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## 전문가용 써멀 히트맵 시각화 구현 계획
제공된 예시 이미지(열화상 카메라 스타일)와 동일한 시각적 효과를 리포트 화면의 히트맵 영역에 구현합니다.

제안된 변경 사항
[Component] ReportView.tsx
연속적 히트맵 렌더링: 단순한 점(Dot) 형태가 아닌, 여러 데이터 포인트가 겹치며 자연스러운 색상 분포를 만드는 열화상 알고리즘 적용
써멀 컬러 팔레트: 0%(파랑) -> 50%(녹색) -> 100%(빨강)로 이어지는 과학적 히트맵 색상 적용
Color Scale Bar: 히트맵 우측에 수분도 백분율을 나타내는 수직 색상 바 추가
얼굴 마스킹: 히트맵이 얼굴 형태(실루엣) 안에서만 자연스럽게 표현되도록 마스킹 처리 개선
검증 계획
Automated Tests
npm run build를 통한 타입 및 빌드 안정성 확인
하드코딩된 데이터 스냅샷을 이용한 히트맵 색상 정확도 검증
Manual Verification
리포트 화면에서 써멀 이미지가 예시와 유사하게 출력되는지 육안 확인
Color Scale Bar의 수치와 히트맵 색상이 일치하는지 확인

<img width="1346" height="846" alt="image" src="https://github.com/user-attachments/assets/1af7ccbf-205f-4fc6-b93d-314e6d9ec076" />


<img width="1016" height="917" alt="image" src="https://github.com/user-attachments/assets/6b4dbe4c-432e-41a0-ab67-b1fda5bd66d9" />
