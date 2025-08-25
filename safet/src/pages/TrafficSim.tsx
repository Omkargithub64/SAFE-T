import React, { useState } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import { Physics, usePlane } from "@react-three/cannon";

type Polygon = [number, number][];

function PolygonMesh({ points, color }: { points: Polygon; color: string }) {
    const shape = new THREE.Shape(points.map(([x, z]) => new THREE.Vector2(x, -z)));
    const geometry = new THREE.ShapeGeometry(shape);

    return (
        <mesh geometry={geometry} rotation={[-Math.PI / 2, 0, 0]}>
            <meshStandardMaterial color={color} transparent opacity={1} emissive={color} emissiveIntensity={0.6} />
        </mesh>
    );
}

function PointMarker({ position, color = "green" }: { position: [number, number]; color?: string }) {
    return (
        <mesh position={[position[0], 0.15, position[1]]}>
            <sphereGeometry args={[0.25, 32, 32]} />
            <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.6} />
        </mesh>
    );
}

function PathLine({ points }: { points: [number, number][] }) {
    if (!points || points.length < 2) return null;

    const curve = new THREE.CatmullRomCurve3(points.map(([x, z]) => new THREE.Vector3(x, 0.2, z)));
    const tubeGeometry = new THREE.TubeGeometry(curve, 100, 0.1, 8, false);

    return (
        <mesh geometry={tubeGeometry}>
            <meshStandardMaterial
                color={"#FFD700"}
                emissive={"#ff0000"}
                emissiveIntensity={0.6}
                metalness={0.3}
                roughness={0.4}
            />
        </mesh>
    );
}

export default function PolygonViewer() {
    const [polygons, setPolygons] = useState<Polygon[]>([]);
    const [startPoint, setStartPoint] = useState<[number, number] | null>(null);
    const [endPoint, setEndPoint] = useState<[number, number] | null>(null);
    const [shortestPath, setShortestPath] = useState<[number, number][] | null>(null);
    const [safetyCamp, setSafetyCamp] = useState<[number, number] | null>(null);
    const [safetyPath, setSafetyPath] = useState<[number, number][] | null>(null);

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const data = JSON.parse(event.target?.result as string);
                setPolygons(data);
                resetPoints();
            } catch (err) {
                console.error("Invalid JSON:", err);
                alert("Invalid JSON file. Make sure it's an array of polygons.");
            }
        };
        reader.readAsText(file);
    };

    const handleComputePath = async () => {
        if (!startPoint || !endPoint) return alert("Select both start and end points!");
        try {
            const response = await fetch("http://localhost:8000/compute-path", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ polygons, start: startPoint, goal: endPoint }),
            });
            if (!response.ok) throw new Error("Failed to compute shortest path");
            const data = await response.json();
            setShortestPath(data.path);
        } catch (err) {
            console.error(err);
            alert("You are inside the building. Better luck next time");
        }
    };


    const handleSafetyCamp = async () => {
        if (!startPoint || polygons.length === 0) return alert("Upload polygons and select start point!");
        try {
            const response = await fetch("http://localhost:8000/safety-camp", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ polygons, start: startPoint }),
            });
            if (!response.ok) throw new Error("Failed to compute safety camp");
            const data = await response.json();
            setSafetyCamp(data.safety_camp);
            setSafetyPath(data.path);
        } catch (err) {
            console.error(err);
            alert("Error computing safety camp.");
        }
    };

    const resetPoints = () => {
        setStartPoint(null);
        setEndPoint(null);
        setShortestPath(null);
        setSafetyCamp(null);
        setSafetyPath(null);
    };

    function Safetycamp({ position, radius = 1, color = "green" }: { position: [number, number]; radius?: number; color?: string }) {
    return (
        <mesh position={[position[0], 0.05, position[1]]} rotation={[-Math.PI / 2, 0, 0]}>
            <circleGeometry args={[radius, 64]} /> {/* radius & smoothness */}
            <meshStandardMaterial color={color} transparent opacity={0.5} emissive={color} emissiveIntensity={0.6} />
        </mesh>
    );
}

    function ClickHandler({ setStartPoint, setEndPoint, startPoint, endPoint, polygons }: any) {
        const { camera, raycaster, gl } = useThree();

        const handleClick = (event: MouseEvent | TouchEvent) => {
            if (!polygons || polygons.length === 0) return;

            let clientX: number, clientY: number;
            if (event instanceof MouseEvent) {
                clientX = event.clientX;
                clientY = event.clientY;
            } else {
                clientX = event.touches[0].clientX;
                clientY = event.touches[0].clientY;
            }

            const rect = gl.domElement.getBoundingClientRect();
            const x = ((clientX - rect.left) / rect.width) * 2 - 1;
            const y = -((clientY - rect.top) / rect.height) * 2 + 1;

            const mouse = new THREE.Vector2(x, y);
            raycaster.setFromCamera(mouse, camera);

            const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
            const point = new THREE.Vector3();
            raycaster.ray.intersectPlane(plane, point);

            if (!startPoint) {
                setStartPoint([point.x, point.z]);
            } else if (!endPoint) {
                const dx = point.x - startPoint[0];
                const dz = point.z - startPoint[1];
                const distance = Math.sqrt(dx * dx + dz * dz);
                if (distance < 0.5) return; // ignore if too close
                setEndPoint([point.x, point.z]);
            }
        };

        React.useEffect(() => {
            window.addEventListener("click", handleClick);
            window.addEventListener("touchstart", handleClick);
            return () => {
                window.removeEventListener("click", handleClick);
                window.removeEventListener("touchstart", handleClick);
            };
        }, [startPoint, endPoint, polygons]);

        return null;
    }

    function getPolygonsBounds(polygons: Polygon[]): { minX: number; maxX: number; minZ: number; maxZ: number } {
        let minX = Infinity,
            maxX = -Infinity,
            minZ = Infinity,
            maxZ = -Infinity;

        polygons.forEach((poly) =>
            poly.forEach(([x, z]) => {
                if (x < minX) minX = x;
                if (x > maxX) maxX = x;
                if (z < minZ) minZ = z;
                if (z > maxZ) maxZ = z;
            })
        );

        return { minX, maxX, minZ, maxZ };
    }

    const bounds = getPolygonsBounds(polygons);
    const width = bounds.maxX - bounds.minX;
    const depth = bounds.maxZ - bounds.minZ;

    const cameraPosition: [number, number, number] = [
        (bounds.minX + bounds.maxX) / 2,
        Math.max(width, depth) * 1.5,
        (bounds.minZ + bounds.maxZ) / 2,
    ];

    function Border({ bounds, padding = 1 }: { bounds: { minX: number; maxX: number; minZ: number; maxZ: number }; padding?: number }) {
        const { minX, maxX, minZ, maxZ } = bounds;
        const points = [
            new THREE.Vector3(minX - padding, 0.01, minZ - padding),
            new THREE.Vector3(maxX + padding, 0.01, minZ - padding),
            new THREE.Vector3(maxX + padding, 0.01, maxZ + padding),
            new THREE.Vector3(minX - padding, 0.01, maxZ + padding),
            new THREE.Vector3(minX - padding, 0.01, minZ - padding), // close loop
        ];
        const geometry = new THREE.BufferGeometry().setFromPoints(points);

        return (
            <line geometry={geometry}>
                <lineBasicMaterial attach="material" color="black" linewidth={2} />
            </line>
        );
    }
    return (
        <div
            style={{
                width: "100vw",
                height: "100vh",
                background: "#f0f0f0",
                overflow: "hidden",
                position: "relative",
            }}
        >
            {/* Controls - Responsive */}
            <div
                style={{
                    position: "absolute",
                    zIndex: 10,
                    top: 10,
                    left: 10,
                    display: "flex",
                    flexWrap: "wrap",
                    gap: "8px",
                    maxWidth: "90vw",
                }}
            >
                <input
                    type="file"
                    accept="application/json"
                    onChange={handleFileUpload}
                    style={{
                        padding: "6px",
                        borderRadius: 5,
                        border: "1px solid #ccc",
                        fontSize: "14px",
                        maxWidth: "140px",
                    }}
                />
                <button
                    onClick={handleComputePath}
                    style={{
                        padding: "6px 10px",
                        borderRadius: 5,
                        background: "#4caf50",
                        color: "white",
                        border: "none",
                        fontSize: "14px",
                    }}
                >
                    Compute
                </button>
                <button onClick={handleSafetyCamp} style={{ padding: "6px 12px", borderRadius: 5, background: "#ff9800", color: "white", border: "none" }}>
                    Safety Camp
                </button>
                <button
                    onClick={resetPoints}
                    style={{
                        padding: "6px 10px",
                        borderRadius: 5,
                        background: "#f44336",
                        color: "white",
                        border: "none",
                        fontSize: "14px",
                    }}
                >
                    Reset
                </button>
            </div>

            <Canvas camera={{ position: [15, 15, 15], fov: 50 }}>
                <ambientLight intensity={0.6} />
                <directionalLight position={[10, 15, 10]} intensity={1} />
                <OrbitControls makeDefault />
                


                <Border bounds={bounds} padding={2} />
                {/* <primitive

                    object={new THREE.GridHelper(
                        Math.max(width, depth) + 2,
                        Math.ceil(Math.max(width, depth)),
                        "grey",
                        "lightgrey"
                    )}
                    position={[cameraPosition[0], 0, cameraPosition[2]]}
                /> */}

                <ClickHandler
                    startPoint={startPoint}
                    endPoint={endPoint}
                    setStartPoint={setStartPoint}
                    setEndPoint={setEndPoint}
                    polygons={polygons}
                />

                {polygons.map((poly, i) => (
                    <PolygonMesh key={i} points={poly} color={i % 2 === 0 ? "red" : "red"} />
                ))}

                {startPoint && <PointMarker position={startPoint} color="green" />}
                {endPoint && <PointMarker position={endPoint} color="red" />}
                {shortestPath && <PathLine points={shortestPath} />}
                {safetyCamp && <PointMarker position={safetyCamp} color="orange" />}
                {safetyCamp && <Safetycamp position={safetyCamp} radius={1} color="orange" />}
                {safetyPath && <PathLine points={safetyPath} />}
            </Canvas>
        </div>
    );
}
