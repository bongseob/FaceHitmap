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
            <meta name="viewport" content="width=device-width, initial-scale=1" />
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
