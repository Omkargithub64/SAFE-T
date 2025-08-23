// pages/Builder.tsx
import { Canvas } from '@react-three/fiber';
import { OrbitControls, TransformControls, Stats } from '@react-three/drei';
import { useRef, useState, useEffect } from 'react';
import * as THREE from 'three';
import Building from '../components/Building';
import type { BuildingData } from '../components/Building';
import { Physics, usePlane } from '@react-three/cannon';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

function Ground() {
    const [ref] = usePlane(() => ({
        rotation: [-Math.PI / 2, 0, 0],
        position: [0, 0, 0],
    }));
    return (
        <mesh ref={ref} receiveShadow>
            <planeGeometry args={[25, 25]} />
            <meshStandardMaterial color="#000000ff" />
        </mesh>
    );
}


export default function Builder() {
    const [buildings, setBuildings] = useState<BuildingData[]>([
        { id: 1, position: [0, 0.5, 0], size: [1, 1, 1], damageRadiusSqM: 20 },
        { id: 2, position: [3, 0.5, 0], size: [1, 1, 1], damageRadiusSqM: 20 },
    ]);

    const [selectedId, setSelectedId] = useState<number | null>(null);
    const [mode, setMode] = useState<'scale' | 'translate'>('translate');
    const [scale, setScale] = useState<number>(1);

    const navigate = useNavigate();

    const orbitRef = useRef<any>(null);
    const transformRef = useRef<any>(null);
    const meshRefs = useRef<Record<number, THREE.Mesh>>({});
    const snap = (value: number, step = 1) => Math.round(value / step) * step;


    // Sync building data when transformation happens
    const handleTransform = () => {
        if (!transformRef.current || selectedId === null) return;
        const mesh = meshRefs.current[selectedId];
        if (!mesh) return;

        const snap = (value: number, step = 1) => Math.round(value / step) * step;

        setBuildings((prev) =>
            prev.map((b) =>
                Number(b.id) === selectedId
                    ? {
                        ...b,
                        position: [
                            snap(mesh.position.x, 1), // snap to 1m grid
                            snap(mesh.position.y, 0.5), // snap height, if needed
                            snap(mesh.position.z, 1),
                        ],
                        size: [
                            Math.max(snap(mesh.scale.x, 1), 1), // min size = 1m
                            Math.max(snap(mesh.scale.y, 1), 1),
                            Math.max(snap(mesh.scale.z, 1), 1),
                        ],
                    }
                    : b
            )
        );
    };

    // Attach selected mesh to TransformControls
    useEffect(() => {
        if (transformRef.current && selectedId !== null) {
            transformRef.current.attach(meshRefs.current[selectedId]);
        }
    }, [selectedId, mode]);

    // Add new building
    const addBuilding = () => {
        const id = Date.now();
        setBuildings((prev) => [
            ...prev,
            {
                id,
                position: [snap(Math.random() * 10, 1), 0.5, snap(Math.random() * 10, 1)],
                size: [1, 1, 1],
                damageRadiusSqM: 0,
            },
        ]);
    };

    // Export layout as JSON file
    const saveLayout = () => {
        const buildingsWithRadius = buildings.map(b => {
            const [w, h, d] = b.size.map(s => s * scale);
            const footprintArea = w * d; // m² footprint
            const damageRadiusSqM = footprintArea * 2.5; // Example multiplier for damage area

            return {
                ...b,
                size: [w, h, d],
                damageRadiusSqM, // in square meters
            };
        });

        const json = JSON.stringify(buildingsWithRadius, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'layout.json';
        a.click();
        URL.revokeObjectURL(url);
    };


    // Import layout from JSON file
    const loadLayout = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const data = JSON.parse(event.target?.result as string);
                if (Array.isArray(data)) {
                    setBuildings(data);
                    setSelectedId(null);
                }
            } catch (err) {
                console.error('Invalid JSON file', err);
            }
        };
        reader.readAsText(file);
    };
    function BuildingForm({ building, onChange }: { building: BuildingData; onChange: (updated: BuildingData) => void }) {
        if (!building) return null;

        const handleChange = (field: keyof BuildingData, value: any) => {
            onChange({ ...building, [field]: value });
        };

        return (
            <div style={{
                position: 'absolute',
                top: 80,
                right: 0,
                width: '300px',
                height: '100%',
                overflowY: 'auto',
                background: '#f9f9f9',
                borderLeft: '1px solid #ccc',
                padding: '10px'
            }}>
                <label>
                    Scale (1 unit = X meters):
                    <input
                        type="number"
                        value={scale}
                        onChange={(e) => setScale(Number(e.target.value))}
                        min={0.1}
                        step={0.1}
                        />
                </label>
                <br />
                <br />
                <h3>Building Details</h3>


                <label>
                    Building Age:
                    <input
                        type="number"
                        defaultValue={building.age_building ?? ""}
                        onBlur={(e) => handleChange("age_building", e.target.value ? Number(e.target.value) : 0)}
                    />
                </label>
                <br />
                <label>
                    Floors Count:
                    <input
                        type="number"
                        defaultValue={building.count_floors_pre_eq ?? ''}
                        onBlur={(e) => handleChange('count_floors_pre_eq', e.target.value ? Number(e.target.value) : 0)}
                    />
                </label>
                <br />
                <label>
                    Plinth Area:
                    <input
                        type="number"
                        defaultValue={building.plinth_area_sq_ft ?? ''}
                        onBlur={(e) => handleChange('plinth_area_sq_ft', e.target.value ? Number(e.target.value) : 0)}
                    />
                </label>
                <br />
                <label>
                    Building Height (Ft):
                    <input
                        type="number"
                        defaultValue={building.height_ft_pre_eq ?? ''}
                        onBlur={(e) => handleChange('height_ft_pre_eq', e.target.value ? Number(e.target.value) : 0)}
                    />
                </label>
                <br />
                <br />

                {/* Example boolean field */}
                <h4>Superstructures</h4>

                <label>
                    Adobe Mud:
                    <input
                        type="checkbox"
                        defaultChecked={!!building.has_superstructure_adobe_mud}
                        onBlur={(e) => handleChange('has_superstructure_adobe_mud', e.target.checked)}
                    />
                </label>
                <label>
                    Mud Mortar Stone:
                    <input
                        type="checkbox"
                        defaultChecked={!!building.has_superstructure_mud_mortar_stone}
                        onBlur={(e) => handleChange('has_superstructure_mud_mortar_stone', e.target.checked)}
                    />
                </label>
                <label>
                    Stone:
                    <input
                        type="checkbox"
                        defaultChecked={!!building.has_superstructure_stone_flag}
                        onBlur={(e) => handleChange('has_superstructure_stone_flag', e.target.checked)}
                    />
                </label>
                <label>
                    Cement Mortar Stone:
                    <input
                        type="checkbox"
                        defaultChecked={!!building.has_superstructure_cement_mortar_stone}
                        onBlur={(e) => handleChange('has_superstructure_cement_mortar_stone', e.target.checked)}
                    />
                </label>
                <label>
                    Mud Mortar Brick:
                    <input
                        type="checkbox"
                        defaultChecked={!!building.has_superstructure_mud_mortar_brick}
                        onBlur={(e) => handleChange('has_superstructure_mud_mortar_brick', e.target.checked)}
                    />
                </label>
                <label>
                    Cement Mortar Brick:
                    <input
                        type="checkbox"
                        defaultChecked={!!building.has_superstructure_cement_mortar_brick}
                        onBlur={(e) => handleChange('has_superstructure_cement_mortar_brick', e.target.checked)}
                    />
                </label>
                <label>
                    Timber:
                    <input
                        type="checkbox"
                        defaultChecked={!!building.has_superstructure_timber}
                        onBlur={(e) => handleChange('has_superstructure_timber', e.target.checked)}
                    />
                </label>
                <label>
                    Bamboo:
                    <input
                        type="checkbox"
                        defaultChecked={!!building.has_superstructure_bamboo}
                        onBlur={(e) => handleChange('has_superstructure_bamboo', e.target.checked)}
                    />
                </label>
                <label>
                    Others:
                    <input
                        type="checkbox"
                        defaultChecked={!!building.has_superstructure_other}
                        onBlur={(e) => handleChange('has_superstructure_other', e.target.checked)}
                    />
                </label>

                <br />
                <br />
                {/* Repeat for all other fields */}
                <label>
                    Foundation Type:
                    <select
                        defaultValue={building.foundation_type ?? ''}
                        onBlur={(e) => handleChange('foundation_type', e.target.value)}
                    >
                        <option value="Mud mortar-Stone/Brick">Mud mortar-Stone/Brick</option>
                        <option value="Bamboo/Timber">Bamboo/Timber</option>
                        <option value="Cement-Stone/Brick">Cement-Stone/Brick</option>
                        <option value="RC">RC</option>
                        <option value="Other">Other</option>
                    </select>
                </label>
                <br />
                <label>
                    Land Condition:
                    <select
                        defaultValue={building.land_surface_condition ?? ''}
                        onBlur={(e) => handleChange('land_surface_condition', e.target.value)}
                    >
                        <option value="Flat">Flat</option>
                        <option value="Moderate slope">Moderate slope</option>
                        <option value="Steep slope">Steep slope</option>
                    </select>
                </label>
                <br />
                <label>
                    Roof Type:
                    <select
                        defaultValue={building.roof_type ?? ''}
                        onBlur={(e) => handleChange('roof_type', e.target.value)}
                    >
                        <option value="Bamboo/Timber-Light roof">Bamboo/Timber-Light roof</option>
                        <option value="Bamboo/Timber-Heavy roof">Bamboo/Timber-Heavy roof</option>
                        <option value="RCC/RB/RBC">RCC/RB/RBC</option>
                    </select>
                </label>
                <br />

                <label>
                    Ground Floor Type:
                    <select
                        defaultValue={building.ground_floor_type ?? ''}
                        onBlur={(e) => handleChange('ground_floor_type', e.target.value)}
                    >
                        <option value="Mud">Mud</option>
                        <option value="RC">RC</option>
                        <option value="Brick/Stone">Brick/Stone</option>
                        <option value="Timber">Timber</option>
                    </select>
                </label>
                <br />

                <label>
                    Other Floor Type:
                    <select
                        defaultValue={building.other_floor_type ?? ''}
                        onBlur={(e) => handleChange('other_floor_type', e.target.value)}
                    >
                        <option value="Timber-Planck">Timber-Planck</option>
                        <option value="TImber/Bamboo-Mud">TImber/Bamboo-Mud</option>
                        <option value="RCC/RB/RBC">RCC/RB/RBC</option>
                        <option value="Not applicable">Not applicable</option>
                    </select>
                </label>
                <br />

                <label>
                    Position Type:
                    <select
                        defaultValue={building.position_type ?? ''}
                        onBlur={(e) => handleChange('position_type', e.target.value)}
                    >
                        <option value="Not attached">Not attached</option>
                        <option value="Attached-1 side">Attached-1 side</option>
                        <option value="Attached-2 side">Attached-2 side</option>
                        <option value="Attached-3 side">Attached-3 side</option>
                    </select>
                </label>
                <br />

                <label>
                    Plan Configuration:
                    <select
                        defaultValue={building.plan_configuration ?? ''}
                        onBlur={(e) => handleChange('plan_configuration', e.target.value)}
                    >
                        <option value="Rectangular">Rectangular</option>
                        <option value="Square">Square</option>
                        <option value="L-shape">L-shape</option>
                        <option value="T-shape">T-shape</option>
                        <option value="Multi-projected">Multi-projected</option>
                        <option value="U-shape">U-shape</option>
                        <option value="E-shape">E-shape</option>
                        <option value="Building with Central Courtyard">Building with Central Courtyard</option>
                        <option value="H-shape">H-shape</option>
                        <option value="Others">Others</option>
                    </select>
                </label>
                <br />

            </div>
        );
    }

    const handelBackendDataSending = async () => {
        const payload = buildings.map(b => ({
            id: b.id,
            position: b.position,
            size: b.size,
            damageRadiusSqM: b.damageRadiusSqM ?? 0,


            district_id: b.district_id ?? 12,
            vdcmun_id: b.vdcmun_id ?? 1207,
            ward_id: b.ward_id ?? 120703,
            age_building: b.age_building ?? 0,
            count_floors_pre_eq: b.count_floors_pre_eq ?? 0,
            plinth_area_sq_ft: b.plinth_area_sq_ft ?? 0,
            height_ft_pre_eq: b.height_ft_pre_eq ?? 0,

            has_superstructure_adobe_mud: b.has_superstructure_adobe_mud ?? false,
            has_superstructure_mud_mortar_stone: b.has_superstructure_mud_mortar_stone ?? false,
            has_superstructure_stone_flag: b.has_superstructure_stone_flag ?? false,
            has_superstructure_cement_mortar_stone: b.has_superstructure_cement_mortar_stone ?? false,
            has_superstructure_mud_mortar_brick: b.has_superstructure_mud_mortar_brick ?? false,
            has_superstructure_cement_mortar_brick: b.has_superstructure_cement_mortar_brick ?? false,
            has_superstructure_timber: b.has_superstructure_timber ?? false,
            has_superstructure_bamboo: b.has_superstructure_bamboo ?? false,
            has_superstructure_rc_non_engineered: b.has_superstructure_rc_non_engineered ?? false,
            has_superstructure_rc_engineered: b.has_superstructure_rc_engineered ?? false,
            has_superstructure_other: b.has_superstructure_other ?? false,

            land_surface_condition: b.land_surface_condition ?? "Flat",
            foundation_type: b.foundation_type ?? "Mud mortar-Stone/Brick",
            roof_type: b.roof_type ?? "Bamboo/Timber-Light roof",
            ground_floor_type: b.ground_floor_type ?? "Mud",
            other_floor_type: b.other_floor_type ?? "TImber/Bamboo-Mud",
            position_type: b.position_type ?? "Not attached",
            plan_configuration: b.plan_configuration ?? "Rectangular"
        }));
        try {
            console.log(payload);

            const response = await axios.post('http://127.0.0.1:8000/predict', { buildings: payload }, { headers: { 'Content-Type': 'application/json' } })
            console.log(response.data);
            const cleanData = JSON.parse(JSON.stringify(response.data));
            navigate('/simulate/earthquake', {state:{cleanData}})
        } catch (e) {
            console.error(e);
        }

    }




    return (
        <div style={{ width: '90vw', height: '100vh' }}>
            <Canvas shadows camera={{ position: [10, 10, 10], fov: 50 }}>
                <ambientLight />
                <directionalLight castShadow position={[10, 10, 10]} />
                <gridHelper args={[25 * scale, 25]} />

                <OrbitControls
                    ref={orbitRef}
                    makeDefault
                    enablePan={true}
                    enableZoom={true}
                    enableRotate={true}
                />
                <Stats />
                <Physics>
                    <Ground></Ground>
                    {buildings.map((b) => (
                        <Building
                            key={Number(b.id)}
                            {...b}
                            ref={(mesh) => {
                                if (mesh) meshRefs.current[Number(b.id)] = mesh;
                            }}
                            onClick={(e) => {
                                e.stopPropagation();
                                setSelectedId(Number(Number(b.id)));
                            }}
                        />
                    ))}

                    {selectedId !== null && (
                        <TransformControls
                            ref={transformRef}
                            mode={mode}
                            onObjectChange={handleTransform} // fires when object actually changes
                            onMouseDown={() => (orbitRef.current.enabled = false)}
                            onMouseUp={() => (orbitRef.current.enabled = true)}
                        />
                    )}


                </Physics>
            </Canvas>

            {selectedId !== null && (
                <BuildingForm
                    building={buildings.find(b => b.id === selectedId)!}
                    onChange={(updated) => {
                        setBuildings(prev =>
                            prev.map(b => b.id === updated.id ? updated : b)
                        );
                    }}
                />
            )}
            {/* UI */}
            <div
                style={{
                    position: 'absolute',
                    top: 10,
                    left: 10,
                    zIndex: 10,
                    background: '#fff',
                    padding: '8px',
                    borderRadius: '6px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '5px',
                }}
            >
                <button onClick={addBuilding}>Add Building</button>
                <button onClick={() => setMode('translate')} disabled={mode === 'translate'}>
                    Move
                </button>
                <button onClick={() => setMode('scale')} disabled={mode === 'scale'}>
                    Resize
                </button>
                <button onClick={saveLayout}>Save Layout</button>
                <input
                    type="file"
                    accept=".json"
                    onChange={loadLayout}
                    style={{ marginTop: '5px' }}
                />
                <button onClick={handelBackendDataSending}>Simulate Earthquake</button>
            </div>
        </div>
    );
}
