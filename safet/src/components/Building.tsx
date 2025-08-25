// components/Building.tsx
import React, { forwardRef, useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import type { ThreeEvent } from '@react-three/fiber';
import * as THREE from 'three';

export type BuildingData = {
    id: number | string; // forced number for consistency
    position: [number, number, number];
    size: [number, number, number];
    debrisRadius?: number;
    damageRadiusSqM: number;
    destroyed?: boolean;
    shaking?: boolean;


    district_id?: number;
    vdcmun_id?: number;
    ward_id?: number;
    age_building?: number; //--
    count_floors_pre_eq?: number;//--
    count_floors_post_eq?: number; //ml
    plinth_area_sq_ft?: number;//--
    height_ft_pre_eq?: number;//--
    height_ft_post_eq?: number; //ml
    has_superstructure_adobe_mud?: boolean;//--
    has_superstructure_mud_mortar_stone?: boolean;
    has_superstructure_stone_flag?: boolean;
    has_superstructure_cement_mortar_stone?: boolean;
    has_superstructure_mud_mortar_brick?: boolean;
    has_superstructure_cement_mortar_brick?: boolean;
    has_superstructure_timber?: boolean;
    has_superstructure_bamboo?: boolean;
    has_superstructure_rc_non_engineered?: boolean;
    has_superstructure_rc_engineered?: boolean;
    has_superstructure_other?: boolean;
    net_rooms?: number; //calc
    net_height?: number; //calc
    land_surface_condition?: string;//--
    foundation_type?: string;//--
    roof_type?: string;//--
    ground_floor_type?: string;//--
    other_floor_type?: string;//--
    position_type?: string;//--
    plan_configuration?: string;
}

type BuildingProps = BuildingData & {
    onClick?: (e: ThreeEvent<MouseEvent>) => void;
    shakeStrength?: number;
};

const hashString = (s: string) => {
    let h = 0;
    for (let i = 0; i < s.length; i++) h = ((h << 5) - h) + s.charCodeAt(i) | 0;
    return Math.abs(h);
};

const Building = forwardRef<THREE.Mesh, BuildingProps>(
    ({ id, position, size, onClick, destroyed = false, shaking = false, shakeStrength = 0.06 }, ref) => {
        const meshRef = useRef<THREE.Mesh | null>(null);
        const seed = useMemo(() => hashString(String(id)) % 1000, [id]);

        // Only apply shaking effect if shaking = true
        useFrame((state) => {
            const m = meshRef.current;
            if (!m) return;
            if (shaking) {
                const t = state.clock.getElapsedTime();
                const ox = Math.sin(t * 12 + seed) * shakeStrength * (0.6 + 0.4 * Math.sin(t * 3 + seed));
                const oz = Math.cos(t * 10 + seed) * shakeStrength * (0.6 + 0.4 * Math.cos(t * 2 + seed));
                m.position.set(position[0] + ox, position[1], position[2] + oz);
                m.rotation.y = Math.sin(t * 6 + seed) * 0.02;
            }
        });

        // Forward the mesh reference to parent
        useEffect(() => {
            if (typeof ref === 'function') {
                ref(meshRef.current);
            } else if (ref) {
                (ref as React.MutableRefObject<THREE.Mesh | null>).current = meshRef.current;
            }
        }, [ref]);

        if (destroyed) return null;

        return (
            <mesh
                ref={meshRef}
                position={position}
                scale={size}
                onClick={onClick}
                castShadow
                receiveShadow
            >
                <boxGeometry args={[1, 1, 1]} />
                <meshStandardMaterial color={'#d2a679'} />
            </mesh>
        );
    }
);

export default Building;
