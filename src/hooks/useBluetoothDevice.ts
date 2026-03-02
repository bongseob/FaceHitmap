import { useState, useCallback, useRef } from 'react';

export interface MeasurementData {
    moisture: number;
    sebum: number;
}

export const useBluetoothDevice = () => {
    const [device, setDevice] = useState<any>(null);
    const [isConnecting, setIsConnecting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    // measurementData: 순차적 측정 방식이므로 단순히 받아온 수분 '수치값'만 전달
    const [measurementData, setMeasurementData] = useState<MeasurementData | null>(null);
    const [isSimulating, setIsSimulating] = useState(false);
    const simIntervalRef = useRef<NodeJS.Timeout | null>(null);

    const connect = useCallback(async () => {
        const nav = typeof window !== 'undefined' ? (navigator as any) : null;

        if (!nav || !nav.bluetooth) {
            setError('BT_NOT_SUPPORTED');
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
                setError('BT_DISCONNECTED');
            });

        } catch (err: any) {
            setError(err.message || 'BT_CONNECT_FAILED');
            startSimulation();
        } finally {
            setIsConnecting(false);
        }
    }, []);

    const startSimulation = useCallback(() => {
        if (simIntervalRef.current) return;

        setIsSimulating(true);

        simIntervalRef.current = setInterval(() => {
            // 버튼 클릭 시 들어오는 임의의 수분도 및 유분도 (20~80%)
            const randomMoisture = Math.floor(Math.random() * 60) + 20;
            const randomSebum = Math.floor(Math.random() * 60) + 20;

            // To simulate a one-time button press event that React can always detect even if value is same,
            // we will just set the object. The Dashboard should reset this to null after handling it.
            setMeasurementData({ moisture: randomMoisture, sebum: randomSebum });
        }, 3000); // 3 seconds interval
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

    return { connect, disconnect, device, isConnecting, error, measurementData, setMeasurementData, isSimulating };
};
