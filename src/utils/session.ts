/**
 * Utility to manage a persistent anonymous session/device ID
 * allowing us to link multiple measurements to the same user browser
 * without an explicit login.
 */

const DEVICE_ID_KEY = 'facehitmap_device_id';

export function getOrCreateDeviceId(): string {
    if (typeof window === 'undefined') return ''; // For SSR safety

    let deviceId = localStorage.getItem(DEVICE_ID_KEY);

    if (!deviceId) {
        // Generate a simple pseudo-UUID v4
        deviceId = crypto.randomUUID
            ? crypto.randomUUID()
            : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
                const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
                return v.toString(16);
            });

        localStorage.setItem(DEVICE_ID_KEY, deviceId);
    }

    return deviceId;
}
