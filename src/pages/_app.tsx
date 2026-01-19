import Head from 'next/head';
import type { AppProps } from 'next/app';
import '../styles/globals.css';
import { Inter } from "next/font/google";

const inter = Inter({ subsets: ["latin"] });

export default function App({ Component, pageProps }: AppProps) {
    return (
        <div className={inter.className}>
            <Head>
                <title>Face Hitmap - 실시간 얼굴 수분 분석</title>
                <meta name="description" content="얼굴 부위별 수분 측정 및 히트맵 시각화 솔루션" />
                <meta name="viewport" content="width=device-width, initial-scale=1" />
            </Head>
            <Component {...pageProps} />
        </div>
    );
}
