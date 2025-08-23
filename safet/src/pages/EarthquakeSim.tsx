// pages/EarthquakeSim.tsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Stats } from "@react-three/drei";
import { Physics, usePlane } from "@react-three/cannon";
import * as THREE from "three";
import Building from "../components/Building";
import DebrisPiece from "../components/DebrisPiece";
import type { BuildingData } from "../components/Building";
import { useLocation } from "react-router-dom";


type DebrisState = {
    id: string;
    position: [number, number, number];
    size: [number, number, number];
    velocity: [number, number, number];
};

const collapsingNow = new Set<string>();
function computeDamageAreasFromBuildings(
    buildings: (BuildingData & { damageRadiusSqM: number })[]
) {
    return buildings.map((b) => {
        const [w, h, d] = b.size; // building width (x), height (y), depth (z)

        // Base footprint of building
        const metersPerUnit = 2; // e.g., 1 unit = 1 m OR 0.5 m

        // Then convert the backend area (m²) into scene-units²
        const targetAreaUnits = b.damageRadiusSqM / (metersPerUnit * metersPerUnit);

        // Now compute scale factor
        const baseAreaUnits = (w * d); // since w, d are already in scene units
        const scale = baseAreaUnits > 0 ? Math.sqrt(targetAreaUnits / baseAreaUnits) : 1;

        return {
            center: b.position as [number, number, number],
            size: [w * scale, d * scale] as [number, number], // width (x), depth (z) scaled
            buildingSize: b.size as [number, number, number],
        };
    });
}



function Ground() {
    const [ref] = usePlane(() => ({
        rotation: [-Math.PI / 2, 0, 0],
        position: [0, 0, 0],
    }));
    return (
        <mesh ref={ref} receiveShadow>
            <planeGeometry args={[25, 25]} />
            <meshStandardMaterial color="#7fbf7f" />
        </mesh>
    );
}


export default function EarthquakeSim() {
    const [buildings, setBuildings] = useState<
        (BuildingData & {
            destroyed: boolean;
            shaking: boolean;
            damageRadiusSqM: number;
        })[]
    >([]);
    const [debris, setDebris] = useState<DebrisState[]>([]);

    const orbitRef = useRef<any>(null);

    const [epicenterX, setEpicenterX] = useState(0);
    const [epicenterZ, setEpicenterZ] = useState(0);
    const [debrisRadius, setDebrisRadius] = useState(6);
    const [debrisActive, setDebrisActive] = useState(false);

    useEffect(() => {
        if (buildings.length && orbitRef.current) {
            // Compute buildings center (average position)
            const center = new THREE.Vector3();
            buildings.forEach((b) => {
                center.add(new THREE.Vector3(...b.position));
            });
            center.divideScalar(buildings.length);

            orbitRef.current.target.copy(center);
            orbitRef.current.update();
        }
    }, [buildings]);

    const location = useLocation();
    const data = location.state;


    useEffect(() => {
        if (!data?.cleanData?.predictions) {
            console.warn("No predictions found in backend data:", data);
            return;
        }

        try {
            const predictions = Array.isArray(data.cleanData.predictions)
                ? data.cleanData.predictions
                : [data.cleanData.predictions];

            const normalized = predictions.map((rec: any, i: number) => {
                const b = rec.buildings; // inner geometry

                return {
                    id: b.id !== undefined ? String(b.id) : `b-${i}-${Date.now()}`,
                    position: b.position as [number, number, number],
                    size: b.size as [number, number, number],
                    damageRadiusSqM:
                        typeof rec.debris_area_m2 === "number" ? rec.debris_area_m2 : 0,
                    destroyed: false,
                    shaking: false,
                    predicted_grade: rec.predicted_grade,
                };
            });

            collapsingNow.clear();
            setDebris([]);
            setBuildings(normalized);
        } catch (err) {
            console.error("Invalid backend layout:", err, data.cleanData);
        }
    }, [data]);


    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
            try {
                const json = JSON.parse(ev.target?.result as string);
                if (Array.isArray(json)) {
                    const normalized = json.map((b: any, i: number) => ({
                        id: b.id !== undefined ? String(b.id) : `b-${i}-${Date.now()}`,
                        position: b.position as [number, number, number],
                        size: b.size as [number, number, number],
                        damageRadiusSqM:
                            typeof b.damageRadiusSqM === "number" ? b.damageRadiusSqM : 0,
                        destroyed: false,
                        shaking: false,
                    }));
                    collapsingNow.clear();
                    setDebris([]);
                    setBuildings(normalized);
                } else {
                    alert("Invalid layout format. Expected an array.");
                }
            } catch {
                alert("Invalid JSON file.");
            }
        };
        reader.readAsText(file);
    };


    const collapseAllBuildings = () => {
        // Mark all buildings destroyed immediately
        setBuildings((prev) =>
            prev.map((b) => ({ ...b, destroyed: true, shaking: false }))
        );

        const allDebris: DebrisState[] = [];

        buildings.forEach((b) => {
            const [bx, by, bz] = b.position;
            const [bw, bh, bd] = b.size;

            const piecesX = Math.max(1, Math.floor(bw / 0.5));
            const piecesY = Math.max(1, Math.floor(bh / 0.5));
            const piecesZ = Math.max(1, Math.floor(bd / 0.5));

            const sizeX = bw / piecesX;
            const sizeY = bh / piecesY;
            const sizeZ = bd / piecesZ;

            for (let ix = 0; ix < piecesX; ix++) {
                for (let iy = 0; iy < piecesY; iy++) {
                    for (let iz = 0; iz < piecesZ; iz++) {
                        const offsetX = -bw / 2 + sizeX / 2 + ix * sizeX;
                        const offsetY = -bh / 2 + sizeY / 2 + iy * sizeY;
                        const offsetZ = -bd / 2 + sizeZ / 2 + iz * sizeZ;

                        const jitterX = (Math.random() - 0.5) * sizeX * 0.4;
                        const jitterY = (Math.random() - 0.5) * sizeY * 0.4;
                        const jitterZ = (Math.random() - 0.5) * sizeZ * 0.4;

                        const posX = bx + offsetX + jitterX;
                        const posY = by + offsetY + jitterY;
                        const posZ = bz + offsetZ + jitterZ;

                        const id = `${b.id}-debris-${ix}-${iy}-${iz}-`;

                        const velocity: [number, number, number] = [
                            (Math.random() - 0.5) * 0.1,
                            (Math.random() - 0.5) * 0.1,
                            (Math.random() - 0.5) * 0.1,
                        ];

                        allDebris.push({
                            id,
                            position: [posX, posY, posZ],
                            size: [sizeX, sizeY, sizeZ],
                            velocity,
                        });
                    }
                }
            }
        });

        // Set debris and activate physics immediately
        setDebris(allDebris);
        setDebrisActive(true);
    };


    const triggerEarthquake = () => {
        collapsingNow.clear();
        setDebris([]);
        collapseAllBuildings();
    };


    const damageAreas = useMemo(() => computeDamageAreasFromBuildings(buildings), [buildings]);

    // Grid/matrix version of damage areas (0 = damaged, 1 = safe)
    const damageMatrix = useMemo(() => {
        const gridSize = 50; // 50x50 matrix
        const groundWidth = 100; // world units X
        const groundHeight = 100; // world units Z

        const matrix = [];
        const cellWidth = groundWidth / gridSize;
        const cellHeight = groundHeight / gridSize;

        for (let row = 0; row < gridSize; row++) {
            const rowArray = [];
            for (let col = 0; col < gridSize; col++) {
                const x = -groundWidth / 2 + col * cellWidth + cellWidth / 2;
                const z = -groundHeight / 2 + row * cellHeight + cellHeight / 2;

                const isDamaged = damageAreas.some(area => {
                    const [centerX, , centerZ] = area.center;
                    const [sizeX, sizeZ] = area.size;
                    return (
                        x >= centerX - sizeX / 2 &&
                        x <= centerX + sizeX / 2 &&
                        z >= centerZ - sizeZ / 2 &&
                        z <= centerZ + sizeZ / 2
                    );
                });

                rowArray.push(isDamaged ? 0 : 1);
            }
            matrix.push(rowArray);
        }
        return matrix;
    }, [damageAreas]);

    function saveMatrixToFile() {
        const blob = new Blob([JSON.stringify(damageMatrix)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "damageMatrix.json";
        a.click();
        URL.revokeObjectURL(url);
    }



    return (
        <div style={{ width: "100vw", height: "100vh" }}>
            <Canvas shadows camera={{ position: [10, 10, 16], fov: 50 }}>
                <ambientLight intensity={0.6} />
                <directionalLight castShadow position={[10, 20, 10]} intensity={1} />
                <Stats />
                <OrbitControls ref={orbitRef} makeDefault enablePan={true} />
                <primitive object={new THREE.GridHelper(25, 25)} />

                <Physics gravity={[0, -9.81, 0]}>
                    <Ground />
                    {buildings.map((b) => (
                        <Building
                            key={b.id}
                            {...b}
                            destroyed={b.destroyed}
                            shaking={b.shaking}
                            onClick={(e) => {
                                e.stopPropagation();
                                setEpicenterX(b.position[0]);
                                setEpicenterZ(b.position[2]);
                            }}
                        />
                    ))}
                    {debris.map((d) => {
                        const building = buildings.find((b) => d.id.startsWith(b.id));
                        if (!building) return null;

                        return (
                            <DebrisPiece
                                key={d.id}
                                id={d.id}
                                position={d.position}
                                size={d.size}
                                initialVelocity={d.velocity}
                                isActive={debrisActive}
                                // buildingCenter={building.position}
                                // buildingSize={building.size}  // <--- Pass it here
                                // damageAreaSqM={building.damageRadiusSqM}
                                damageAreas={damageAreas}
                            />
                        );
                    })}
                    {damageAreas.map((area, i) => (
                        <mesh
                            key={i}
                            position={[area.center[0], 0.01, area.center[2]]}
                            rotation={[-Math.PI / 2, 0, 0]}
                        >
                            <planeGeometry args={area.size} />
                            <meshBasicMaterial color="red" transparent opacity={0.3} />
                        </mesh>
                    ))}
                </Physics>
            </Canvas>

            <div
                style={{
                    position: "absolute",
                    top: 10,
                    left: 10,
                    zIndex: 20,
                    background: "#ffffffdd",
                    padding: 12,
                    borderRadius: 8,
                    display: "flex",
                    flexDirection: "column",
                    gap: 8,
                }}
            >
                <input type="file" accept=".json" onChange={handleFileUpload} />
                <div style={{ display: "flex", gap: 8 }}>
                    <label>
                        Epicenter X:
                        <input
                            type="number"
                            value={epicenterX}
                            onChange={(e) => setEpicenterX(Number(e.target.value))}
                            style={{ width: 80, marginLeft: 6 }}
                        />
                    </label>
                    <label>
                        Z:
                        <input
                            type="number"
                            value={epicenterZ}
                            onChange={(e) => setEpicenterZ(Number(e.target.value))}
                            style={{ width: 80, marginLeft: 6 }}
                        />
                    </label>
                    <label>
                        Radius:
                        <input
                            type="number"
                            value={debrisRadius}
                            onChange={(e) => setDebrisRadius(Number(e.target.value))}
                            style={{ width: 80, marginLeft: 6 }}
                        />
                    </label>
                </div>

                <div style={{ display: "flex", gap: 8 }}>
                    <button
                        onClick={() => triggerEarthquake()}
                    >
                        Trigger Earthquake
                    </button>
                    <button
                        onClick={() => {
                            collapsingNow.clear();
                            setDebris([]);
                            setBuildings((prev) =>
                                prev.map((b) => ({ ...b, destroyed: false, shaking: false }))
                            );
                        }}
                    >
                        Reset
                    </button>
                </div>
                <div style={{ fontSize: 12, color: "#333" }}>
                    Upload a layout (JSON), set epicenter, then trigger.
                </div>
                <button onClick={saveMatrixToFile}>Save Matrix</button>
            </div>
        </div>
    );
}
