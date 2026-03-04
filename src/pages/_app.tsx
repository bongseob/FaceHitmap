import Head from 'next/head';
import type { AppProps } from 'next/app';
import '../styles/globals.css';
import { Inter } from "next/font/google";
import { I18nProvider, useI18n } from '../i18n/I18nContext';

const inter = Inter({ subsets: ["latin"] });

function AppHead() {
    const { t } = useI18n();
    return (
        <Head>
            <title>{t.meta.title}</title>
            <meta name="description" content={t.meta.description} />
            <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=0" />

            {/* SEO & Open Graph Tags */}
            <meta property="og:title" content={t.meta.title} />
            <meta property="og:description" content={t.meta.description} />
            <meta property="og:type" content="website" />
            <meta property="og:site_name" content="Face Hitmap" />

            {/* Twitter Card Tags */}
            <meta name="twitter:card" content="summary_large_image" />
            <meta name="twitter:title" content={t.meta.title} />
            <meta name="twitter:description" content={t.meta.description} />

            {/* Additional PWA/Mobile Tags */}
            <meta name="theme-color" content="#0f172a" />
            <link rel="manifest" href="/site.webmanifest" />
        </Head>
    );
}

export default function App({ Component, pageProps }: AppProps) {
    return (
        <I18nProvider>
            <div className={inter.className}>
                <AppHead />
                <Component {...pageProps} />
            </div>
        </I18nProvider>
    );
}
