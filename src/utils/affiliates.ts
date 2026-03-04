/**
 * types and helper functions for Affiliate Products
 */

export interface AffiliateProduct {
    id: string;
    keyword: string[]; // e.g., ['알로에', 'aloe', '芦荟', 'アロエ']
    brand: string;
    productName: string;
    price: number | string; // e.g., "15,000", "12.99"
    buyUrl: string; // The affiliate link (Coupang, Olive Young, etc.)
    mediaUrl: string; // Google Drive link or direct image link
    mediaType: 'image' | 'video';
}

/**
 * Parses a standard Google Drive share link and converts it to a direct download/stream link
 * that can be used directly in <img> or <video> tags.
 */
export function getDriveDirectLink(url: string): string {
    if (!url) return '';

    // Check if it's a standard Google Drive share link (e.g., https://drive.google.com/file/d/FILE_ID/view)
    const match = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)\//);
    if (match && match[1]) {
        return `https://drive.google.com/uc?export=view&id=${match[1]}`;
    }

    // Already a direct link or not a GDrive link
    return url;
}

// Dummy Database (Will be populated with proper affiliate links later)
export const AFFILIATE_PRODUCTS: AffiliateProduct[] = [
    {
        id: 'p-ceramide-01',
        keyword: ['세라마이드', 'ceramide', '神经酰胺', 'セラミド', '保湿霜'],
        brand: 'Aestura',
        productName: 'Atobarrier 365 Cream',
        price: '31,000',
        buyUrl: 'https://www.coupang.com', // Replace with real partner link
        mediaUrl: 'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=800&q=80', // Replace with GDrive link
        mediaType: 'image'
    },
    {
        id: 'p-aloe-01',
        keyword: ['알로에', 'aloe', '芦荟', 'アロエ', '水凝胶', '수분 젤'],
        brand: 'Aromatica',
        productName: 'Organic Aloe Vera Gel',
        price: '12,500',
        buyUrl: 'https://www.oliveyoung.co.kr', // Replace with real partner link
        mediaUrl: 'https://images.unsplash.com/photo-1615397323114-61c0d9aab538?w=800&q=80', // Replace with GDrive link
        mediaType: 'image'
    },
    {
        id: 'p-bakuchiol-01',
        keyword: ['바쿠치올', 'bakuchiol'],
        brand: 'Dr.G',
        productName: 'Bakuchiol Pores Revital Serum',
        price: '28,000',
        buyUrl: 'https://www.coupang.com',
        mediaUrl: 'https://images.unsplash.com/photo-1629198688000-71f23e745b6e?w=800&q=80',
        mediaType: 'image'
    },
    {
        id: 'p-retinol-01',
        keyword: ['레티놀', 'retinol'],
        brand: 'Innisfree',
        productName: 'Retinol Cica Repair Ampoule',
        price: '35,000',
        buyUrl: 'https://www.oliveyoung.co.kr',
        mediaUrl: 'https://images.unsplash.com/photo-1608248543803-ba4f8c70ae0b?w=800&q=80',
        mediaType: 'image'
    },
    {
        id: 'p-vitaminc-01',
        keyword: ['비타민 C', '비타민 c', 'vitamin c'],
        brand: 'Goodal',
        productName: 'Green Tangerine Vita C Dark Spot Serum',
        price: '24,000',
        buyUrl: 'https://www.coupang.com',
        mediaUrl: 'https://images.unsplash.com/photo-1599305090598-fe179d501227?w=800&q=80',
        mediaType: 'image'
    }
];

/**
 * Looks up the database for products matching the recommended AI ingredient
 */
export function getRecommendedProducts(ingredientParams: string): AffiliateProduct[] {
    if (!ingredientParams) return [];

    const searchTerms = ingredientParams.toLowerCase();

    // Find products where any of their keywords are included in the AI's recommendation text
    return AFFILIATE_PRODUCTS.filter(product =>
        product.keyword.some(kw => searchTerms.includes(kw.toLowerCase()))
    ).slice(0, 2); // Return max 2 items
}
