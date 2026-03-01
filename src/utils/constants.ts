export const FACE_REGIONS = {
  FOREHEAD: 'forehead',
  LEFT_CHEEK: 'left_cheek',
  RIGHT_CHEEK: 'right_cheek',
  CHIN: 'chin',
  NOSE: 'nose', // T-Zone
  T_ZONE: 't_zone'
};

export const REGION_COLORS = {
  [FACE_REGIONS.FOREHEAD]: '#FF5733',
  [FACE_REGIONS.LEFT_CHEEK]: '#33FF57',
  [FACE_REGIONS.RIGHT_CHEEK]: '#3357FF',
  [FACE_REGIONS.CHIN]: '#F333FF',
  [FACE_REGIONS.NOSE]: '#FF33A1',
  [FACE_REGIONS.T_ZONE]: '#33FFF3'
};

// Default landmarks for template face (normalized 0-1)
export const DEFAULT_LANDMARKS = {
  [FACE_REGIONS.FOREHEAD]: { x: 0.5, y: 0.2 },
  [FACE_REGIONS.LEFT_CHEEK]: { x: 0.3, y: 0.5 },
  [FACE_REGIONS.RIGHT_CHEEK]: { x: 0.7, y: 0.5 },
  [FACE_REGIONS.CHIN]: { x: 0.5, y: 0.85 },
  [FACE_REGIONS.NOSE]: { x: 0.5, y: 0.45 },
  [FACE_REGIONS.T_ZONE]: { x: 0.5, y: 0.35 }
};

export interface SensorData {
  moisture: number;
  sebum: number;
}

// Default hydration values (initial state)
export const INITIAL_HYDRATION_DATA: Record<string, SensorData> = {
  [FACE_REGIONS.FOREHEAD]: { moisture: 0, sebum: 0 },
  [FACE_REGIONS.LEFT_CHEEK]: { moisture: 0, sebum: 0 },
  [FACE_REGIONS.RIGHT_CHEEK]: { moisture: 0, sebum: 0 },
  [FACE_REGIONS.CHIN]: { moisture: 0, sebum: 0 },
  [FACE_REGIONS.NOSE]: { moisture: 0, sebum: 0 },
  [FACE_REGIONS.T_ZONE]: { moisture: 0, sebum: 0 }
};
