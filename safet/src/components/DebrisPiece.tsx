// components/DebrisPiece.tsx
import { useBox } from "@react-three/cannon";
import { useEffect } from "react";

export type DamageArea = {
    center: [number, number, number]; // building center [x,y,z]
    size: [number, number];           // damage area rectangle width (x) and depth (z)
};

type DebrisProps = {
    id: string | number;
    position: [number, number, number];
    size: [number, number, number];
    initialVelocity?: [number, number, number];
    isActive: boolean;
    damageAreas?: DamageArea[] | DamageArea;
};

export default function DebrisPiece({
    id,
    position,
    size,
    initialVelocity = [
        (Math.random() - 0.5) * 0.08,
        0,
        (Math.random() - 0.5) * 0.08,
    ],
    isActive,
    damageAreas,
}: DebrisProps) {
    const [ref, api] = useBox(() => ({
        args: size,
        mass: 1,
        position,
        linearDamping: 0.6,
        angularDamping: 0.8,
        allowSleep: true,
    }));

    const areas = Array.isArray(damageAreas)
        ? damageAreas
        : damageAreas
            ? [damageAreas]
            : [];

    useEffect(() => {
        if (isActive) {
            api.velocity.set(...initialVelocity);
            api.angularVelocity.set(
                (Math.random() - 0.5) * 0.25,
                (Math.random() - 0.5) * 0.25,
                (Math.random() - 0.5) * 0.25
            );
            api.wakeUp();

            const stopTimer = setTimeout(() => {
                api.velocity.set(0, 0, 0);
                api.angularVelocity.set(0, 0, 0);
            }, 6000);

            return () => clearTimeout(stopTimer);
        }
    }, [isActive, api, initialVelocity]);

    useEffect(() => {
        const unsubscribe = api.position.subscribe(([x, y, z]) => {
            if (areas.length === 0) return;

            let clampedX = x;
            let clampedZ = z;
            let insideAny = false;

            for (const area of areas) {
                const [cx, , cz] = area.center;
                const [dw, dd] = area.size;

                const minX = cx - dw / 2;
                const maxX = cx + dw / 2;
                const minZ = cz - dd / 2;
                const maxZ = cz + dd / 2;

                if (x >= minX && x <= maxX && z >= minZ && z <= maxZ) {
                    insideAny = true;
                    clampedX = Math.min(Math.max(x, minX), maxX);
                    clampedZ = Math.min(Math.max(z, minZ), maxZ);
                    break;
                }
            }

            if (!insideAny) {
                let best: { area: typeof areas[number]; distSq: number } | null = null;
                for (const area of areas) {
                    const [cx, , cz] = area.center;
                    const dx = x - cx;
                    const dz = z - cz;
                    const d2 = dx * dx + dz * dz;
                    if (!best || d2 < best.distSq) best = { area, distSq: d2 };
                }
                if (best) {
                    const { area } = best;
                    const [cx, , cz] = area.center;
                    const [dw, dd] = area.size;
                    const minX = cx - dw / 2;
                    const maxX = cx + dw / 2;
                    const minZ = cz - dd / 2;
                    const maxZ = cz + dd / 2;
                    clampedX = Math.min(Math.max(x, minX), maxX);
                    clampedZ = Math.min(Math.max(z, minZ), maxZ);
                }
            }

            if (clampedX !== x || clampedZ !== z) {
                api.position.set(clampedX, y, clampedZ);

                // 🛑 Freeze this debris completely
                api.velocity.set(0, 0, 0);
                api.angularVelocity.set(0, 0, 0);
                api.mass.set(0); // makes it ignore gravity/forces
                api.sleep();
            }
        });

        return () => unsubscribe();
    }, [api, areas]);

    return (
        <mesh ref={ref} castShadow receiveShadow>
            <boxGeometry args={size} />
            <meshStandardMaterial color={"#d2a679"} />
        </mesh>
    );
}
