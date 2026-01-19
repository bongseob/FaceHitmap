import { useState, useCallback, useRef } from 'react';
import { FACE_REGIONS } from '../utils/constants';

export const useBluetoothDevice = () => {
    const [device, setDevice] = useState<any>(null);
    const [isConnecting, setIsConnecting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [measurementData, setMeasurementData] = useState<any>(null);
    const [isSimulating, setIsSimulating] = useState(false);
    const simIntervalRef = useRef<NodeJS.Timeout | null>(null);

    const connect = useCallback(async () => {
        const nav = typeof window !== 'undefined' ? (navigator as any) : null;

        if (!nav || !nav.bluetooth) {
            setError('이 브라우저는 블루투스를 지원하지 않습니다. (시뮬레이션 모드를 사용합니다)');
            startSimulation();
            return;
        }

        setIsConnecting(true);
        setError(null);

        try {
            const device = await nav.bluetooth.requestDevice({
                acceptAllDevices: true,
                optionalServices: ['battery_service']
            });

            setDevice(device);
            await device.gatt?.connect();

            device.addEventListener('gattserverdisconnected', () => {
                setDevice(null);
                setError('장비 연결이 해제되었습니다.');
            });

        } catch (err: any) {
            setError(err.message || '연결에 실패했습니다. (시뮬레이션 모드를 사용합니다)');
            startSimulation();
        } finally {
            setIsConnecting(false);
        }
    }, []);

    const startSimulation = useCallback(() => {
        if (simIntervalRef.current) return;

        setIsSimulating(true);
        const regions = Object.values(FACE_REGIONS);

        simIntervalRef.current = setInterval(() => {
            const randomRegion = regions[Math.floor(Math.random() * regions.length)];
            const randomValue = Math.floor(Math.random() * 40) + 40; // 40-80% range

            setMeasurementData({
                region: randomRegion,
                value: randomValue
            });
        }, 2000); // 2 seconds interval
    }, []);

    const stopSimulation = useCallback(() => {
        if (simIntervalRef.current) {
            clearInterval(simIntervalRef.current);
            simIntervalRef.current = null;
        }
        setIsSimulating(false);
    }, []);

    const disconnect = useCallback(() => {
        stopSimulation();
        if (device && device.gatt?.connected) {
            device.gatt.disconnect();
        }
        setDevice(null);
    }, [device, stopSimulation]);

    return { connect, disconnect, device, isConnecting, error, measurementData, isSimulating };
};
