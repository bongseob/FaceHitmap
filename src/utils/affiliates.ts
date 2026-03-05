/**
 * types and helper functions for Affiliate Products
 */
import Papa from 'papaparse';

export interface AffiliateProduct {
    id: string;
    keyword: string[]; // e.g., ['알로에', 'aloe', '芦荟', 'アロエ']
    brand: string;
    productName: string;
    price: number | string; // e.g., "15,000", "12.99"
    buyUrl: string; // The affiliate link (Coupang, Olive Young, etc.)
    mediaUrl: string; // Google Drive link or direct image link
    mediaType: 'image' | 'video';
    isActive?: boolean;
}

/**
 * Parses a standard Google Drive share link and converts it to a direct download/stream link
 * that can be used directly in <img> or <video> tags.
 */
export function getDriveDirectLink(url: string, mediaType: 'image' | 'video' = 'image'): string {
    if (!url) return '';

    // Check if it's a standard Google Drive share link (e.g., https://drive.google.com/file/d/FILE_ID/view)
    const match = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
    if (match && match[1]) {
        const fileId = match[1];
        // For images, the thumbnail endpoint works reliably without cookie/auth redirects
        if (mediaType === 'image') {
            return `https://drive.google.com/thumbnail?id=${fileId}&sz=w800`;
        }
        // For videos or fallbacks, use the standard uc export
        return `https://drive.google.com/uc?export=view&id=${fileId}`;
    }

    // Already a direct link or not a GDrive link
    return url;
}

let cachedProducts: AffiliateProduct[] = [];
let isProductsLoaded = false;

// Dummy Database (Fallback if google sheets isn't loaded)
export const DEFAULT_AFFILIATE_PRODUCTS: AffiliateProduct[] = [
    {
        id: 'p-ceramide-01',
        keyword: ['세라마이드', 'ceramide', '神经酰胺', 'セラミド', '保湿霜'],
        brand: 'Aestura',
        productName: 'Atobarrier 365 Cream',
        price: '31,000',
        buyUrl: 'https://www.coupang.com', // Replace with real partner link
        mediaUrl: 'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=800&q=80', // Replace with GDrive link
        mediaType: 'image',
        isActive: true
    },
    {
        id: 'p-aloe-01',
        keyword: ['알로에', 'aloe', '芦荟', 'アロエ', '水凝胶', '수분 젤'],
        brand: 'Aromatica',
        productName: 'Organic Aloe Vera Gel',
        price: '12,500',
        buyUrl: 'https://www.oliveyoung.co.kr', // Replace with real partner link
        mediaUrl: 'https://images.unsplash.com/photo-1615397323114-61c0d9aab538?w=800&q=80', // Replace with GDrive link
        mediaType: 'image',
        isActive: true
    }
];

/**
 * Loads affiliate products from a published Google Sheet CSV.
 * URL is expected to be public.
 */
export async function loadAffiliateProducts(csvUrl: string): Promise<void> {
    if (!csvUrl) return;

    try {
        const response = await fetch(csvUrl);
        const csvText = await response.text();

        const parsed = Papa.parse<any>(csvText, {
            header: true,
            skipEmptyLines: true,
        });

        if (parsed.errors.length > 0) {
            console.error("CSV Parsing errors:", parsed.errors);
        }

        const products: AffiliateProduct[] = parsed.data
            .filter(row => {
                // Determine truthiness of isActive (handle TRUE, true, 1, etc.)
                // If the column doesn't exist, we assume it's true to not break backward compatibility for simple sheets
                const activeStr = row.isActive !== undefined ? String(row.isActive).toLowerCase().trim() : 'true';
                return activeStr === 'true' || activeStr === '1' || activeStr === 'y';
            })
            .map((row, index) => {
                let keywords: string[] = [];
                if (row.keyword) {
                    keywords = String(row.keyword).split(',').map(k => k.trim()).filter(Boolean);
                } else if (row.targetIngredient) {
                    // Fallback to legacy targetIngredient if keyword isn't provided
                    keywords = [String(row.targetIngredient).trim()];
                }

                return {
                    id: row.id || `sheet_p${index}`,
                    productName: row.productName || 'Unknown Product',
                    brand: row.brand || '',
                    keyword: keywords,
                    price: parseInt(String(row.price).replace(/[^0-9]/g, ''), 10) || 0,
                    buyUrl: row.buyUrl || '',
                    mediaUrl: row.mediaUrl || '',
                    mediaType: (row.mediaType === 'video' ? 'video' : 'image'),
                    isActive: true
                };
            });

        if (products.length > 0) {
            cachedProducts = products;
            isProductsLoaded = true;
            console.log(`Loaded ${products.length} active affiliate products from Google Sheets`);
        }
    } catch (error) {
        console.error("Failed to load affiliate products from sheets:", error);
    }
}

/**
 * Looks up the database for products matching the recommended AI ingredient
 */
export function getRecommendedProducts(ingredientParams: string): AffiliateProduct[] {
    if (!ingredientParams) return [];

    const searchTerms = ingredientParams.toLowerCase().replace(/\s+/g, '');
    const sourceProducts = isProductsLoaded ? cachedProducts : DEFAULT_AFFILIATE_PRODUCTS;

    console.log(`[Affiliates] Finding match for "${ingredientParams}". Total DB size: ${sourceProducts.length}`);

    // Check if the AI's recommendation text contains the product's keyword OR if the product's keyword contains the recommendation
    const matched = sourceProducts.filter(product => {
        if (!product.isActive) return false;

        return product.keyword.some(kw => {
            const cleanKw = kw.toLowerCase().replace(/\s+/g, '');
            return searchTerms.includes(cleanKw) || cleanKw.includes(searchTerms);
        });
    });

    console.log(`[Affiliates] Matched ${matched.length} products:`, matched.map(m => m.productName));

    return matched.slice(0, 2); // Return max 2 items
}
