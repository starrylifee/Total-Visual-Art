import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, ChevronLeft, ChevronRight, Maximize2, Volume2, VolumeX } from 'lucide-react';

/**
 * Slideshow component for displaying student artworks in a carousel
 * @param {Array} artworks - Array of artwork objects with { imageUrl, prompt, studentName }
 * @param {boolean} autoPlay - Whether to auto-rotate
 * @param {number} interval - Interval in ms for auto rotation
 */
const ClassSlideshow = ({ artworks = [], autoPlay = true, interval = 5000 }) => {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isPlaying, setIsPlaying] = useState(autoPlay);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [isMuted, setIsMuted] = useState(true);
    const containerRef = useRef(null);
    const audioRef = useRef(null);

    // Auto-play logic
    useEffect(() => {
        if (!isPlaying || artworks.length <= 1) return;

        const timer = setInterval(() => {
            setCurrentIndex(prev => (prev + 1) % artworks.length);
        }, interval);

        return () => clearInterval(timer);
    }, [isPlaying, artworks.length, interval]);

    // Keyboard navigation
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'ArrowLeft') goToPrev();
            if (e.key === 'ArrowRight') goToNext();
            if (e.key === ' ') {
                e.preventDefault();
                setIsPlaying(p => !p);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    const goToNext = () => {
        setCurrentIndex(prev => (prev + 1) % artworks.length);
    };

    const goToPrev = () => {
        setCurrentIndex(prev => (prev - 1 + artworks.length) % artworks.length);
    };

    const toggleFullscreen = () => {
        if (!document.fullscreenElement) {
            containerRef.current?.requestFullscreen();
            setIsFullscreen(true);
        } else {
            document.exitFullscreen();
            setIsFullscreen(false);
        }
    };

    const toggleMusic = () => {
        setIsMuted(!isMuted);
        if (audioRef.current) {
            audioRef.current.muted = !isMuted;
            if (isMuted) {
                audioRef.current.play();
            }
        }
    };

    if (artworks.length === 0) {
        return (
            <div style={{
                textAlign: 'center',
                padding: '3rem',
                background: 'var(--card-bg)',
                borderRadius: '1rem',
                boxShadow: 'var(--shadow)'
            }}>
                <p style={{ fontSize: '3rem', margin: 0 }}>🎭</p>
                <p style={{ color: 'var(--text-sub)' }}>표시할 작품이 없습니다.</p>
            </div>
        );
    }

    const currentArtwork = artworks[currentIndex];

    return (
        <div
            ref={containerRef}
            style={{
                position: 'relative',
                width: '100%',
                height: isFullscreen ? '100vh' : '500px',
                background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
                borderRadius: isFullscreen ? 0 : '1rem',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column'
            }}
        >
            {/* Background music (optional) */}
            <audio
                ref={audioRef}
                loop
                muted={isMuted}
                src="https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3"
            />

            {/* Main Image */}
            <div style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '2rem'
            }}>
                <img
                    src={currentArtwork.imageUrl}
                    alt={currentArtwork.prompt}
                    style={{
                        maxWidth: '100%',
                        maxHeight: '100%',
                        objectFit: 'contain',
                        borderRadius: '0.5rem',
                        boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
                        transition: 'opacity 0.5s ease'
                    }}
                />
            </div>

            {/* Info Overlay */}
            <div style={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
                background: 'linear-gradient(transparent, rgba(0,0,0,0.8))',
                padding: '2rem',
                color: 'white'
            }}>
                <p style={{ margin: 0, fontSize: '1.2rem', fontWeight: '600' }}>
                    {currentArtwork.studentName || '익명'}
                </p>
                <p style={{ margin: '0.5rem 0', fontSize: '0.9rem', opacity: 0.8, maxWidth: '600px' }}>
                    "{currentArtwork.prompt?.substring(0, 100)}{currentArtwork.prompt?.length > 100 ? '...' : ''}"
                </p>
                <p style={{ margin: 0, fontSize: '0.8rem', opacity: 0.6 }}>
                    {currentIndex + 1} / {artworks.length}
                </p>
            </div>

            {/* Controls */}
            <div style={{
                position: 'absolute',
                top: '1rem',
                right: '1rem',
                display: 'flex',
                gap: '0.5rem'
            }}>
                <button
                    onClick={toggleMusic}
                    style={controlButtonStyle}
                    title={isMuted ? '음악 켜기' : '음악 끄기'}
                >
                    {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
                </button>
                <button
                    onClick={toggleFullscreen}
                    style={controlButtonStyle}
                    title="전체화면"
                >
                    <Maximize2 size={20} />
                </button>
            </div>

            {/* Navigation */}
            <button
                onClick={goToPrev}
                style={{ ...navButtonStyle, left: '1rem' }}
            >
                <ChevronLeft size={32} />
            </button>
            <button
                onClick={goToNext}
                style={{ ...navButtonStyle, right: '1rem' }}
            >
                <ChevronRight size={32} />
            </button>

            {/* Play/Pause */}
            <button
                onClick={() => setIsPlaying(!isPlaying)}
                style={{
                    position: 'absolute',
                    bottom: '5rem',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    width: '60px',
                    height: '60px',
                    borderRadius: '50%',
                    border: 'none',
                    background: 'var(--primary)',
                    color: 'white',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 4px 20px rgba(244, 114, 182, 0.5)'
                }}
            >
                {isPlaying ? <Pause size={28} /> : <Play size={28} />}
            </button>

            {/* Progress dots */}
            <div style={{
                position: 'absolute',
                bottom: '1rem',
                left: '50%',
                transform: 'translateX(-50%)',
                display: 'flex',
                gap: '0.5rem'
            }}>
                {artworks.slice(0, 10).map((_, i) => (
                    <button
                        key={i}
                        onClick={() => setCurrentIndex(i)}
                        style={{
                            width: '10px',
                            height: '10px',
                            borderRadius: '50%',
                            border: 'none',
                            background: i === currentIndex ? 'var(--primary)' : 'rgba(255,255,255,0.3)',
                            cursor: 'pointer',
                            transition: 'all 0.3s'
                        }}
                    />
                ))}
                {artworks.length > 10 && <span style={{ color: 'white', fontSize: '0.8rem' }}>+{artworks.length - 10}</span>}
            </div>
        </div>
    );
};

const controlButtonStyle = {
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    border: 'none',
    background: 'rgba(255,255,255,0.2)',
    color: 'white',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backdropFilter: 'blur(10px)'
};

const navButtonStyle = {
    position: 'absolute',
    top: '50%',
    transform: 'translateY(-50%)',
    width: '50px',
    height: '50px',
    borderRadius: '50%',
    border: 'none',
    background: 'rgba(255,255,255,0.2)',
    color: 'white',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backdropFilter: 'blur(10px)'
};

export default ClassSlideshow;
