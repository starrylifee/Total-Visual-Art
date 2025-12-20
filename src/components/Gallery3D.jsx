import React, { Suspense, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Text, Image as DreiImage, Environment } from '@react-three/drei';

// Single artwork frame in 3D
function ArtworkFrame({ position, imageUrl, title, onClick }) {
    const [hovered, setHovered] = useState(false);

    return (
        <group position={position}>
            {/* Frame */}
            <mesh
                onPointerOver={() => setHovered(true)}
                onPointerOut={() => setHovered(false)}
                onClick={onClick}
            >
                <boxGeometry args={[2.2, 2.7, 0.1]} />
                <meshStandardMaterial color={hovered ? '#f472b6' : '#4a044e'} />
            </mesh>

            {/* Artwork Image */}
            {imageUrl && (
                <Suspense fallback={null}>
                    <DreiImage
                        url={imageUrl}
                        position={[0, 0, 0.06]}
                        scale={[2, 2.5]}
                    />
                </Suspense>
            )}

            {/* Title */}
            <Text
                position={[0, -1.6, 0.1]}
                fontSize={0.12}
                color="#ffffff"
                anchorX="center"
                anchorY="middle"
            >
                {title || '제목 없음'}
            </Text>
        </group>
    );
}

// Gallery Wall
function GalleryWall({ artworks = [], onSelectArtwork }) {
    const wallWidth = 20;
    const wallHeight = 8;

    // Calculate positions for artworks in a grid
    const cols = 4;
    const spacing = 3;

    return (
        <group>
            {/* Floor */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -2, 0]}>
                <planeGeometry args={[30, 30]} />
                <meshStandardMaterial color="#fdf2f8" />
            </mesh>

            {/* Back Wall */}
            <mesh position={[0, 2, -5]}>
                <boxGeometry args={[wallWidth, wallHeight, 0.5]} />
                <meshStandardMaterial color="#fff" />
            </mesh>

            {/* Artworks */}
            {artworks.map((art, i) => (
                <ArtworkFrame
                    key={art.id || i}
                    position={[
                        (i % cols - cols / 2 + 0.5) * spacing,
                        Math.floor(i / cols) * -3 + 1.5,
                        -4.5
                    ]}
                    imageUrl={art.imageUrl}
                    title={art.title || art.prompt?.substring(0, 20)}
                    onClick={() => onSelectArtwork(art)}
                />
            ))}
        </group>
    );
}

// Main 3D Gallery Component
const Gallery3D = ({ artworks = [], onSelectArtwork }) => {
    return (
        <div style={{ width: '100%', height: '500px', borderRadius: '1rem', overflow: 'hidden' }}>
            <Canvas camera={{ position: [0, 2, 8], fov: 60 }}>
                <ambientLight intensity={0.7} />
                <pointLight position={[10, 10, 10]} intensity={1} />
                <spotLight position={[0, 10, 0]} angle={0.3} penumbra={1} intensity={0.5} />

                <Suspense fallback={null}>
                    <GalleryWall artworks={artworks} onSelectArtwork={onSelectArtwork} />
                </Suspense>

                <OrbitControls
                    enablePan={true}
                    enableZoom={true}
                    enableRotate={true}
                    minDistance={3}
                    maxDistance={15}
                    maxPolarAngle={Math.PI / 2}
                />
            </Canvas>
        </div>
    );
};

export default Gallery3D;
