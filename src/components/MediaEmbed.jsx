import React from 'react';
import ReactPlayer from 'react-player';

/**
 * Parse URL and return media type
 * @param {string} url 
 * @returns {{ type: 'youtube' | 'canva' | 'image' | 'unknown', embedUrl: string }}
 */
export function parseMediaUrl(url) {
    if (!url) return { type: 'unknown', embedUrl: '' };

    const urlLower = url.toLowerCase();

    // YouTube detection
    if (urlLower.includes('youtube.com') || urlLower.includes('youtu.be')) {
        return { type: 'youtube', embedUrl: url };
    }

    // Canva detection
    if (urlLower.includes('canva.com')) {
        // Convert to embed URL if it's a design link
        let embedUrl = url;
        if (url.includes('/design/')) {
            embedUrl = url.replace('/design/', '/embed/');
        }
        return { type: 'canva', embedUrl };
    }

    // Image detection
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.bmp'];
    if (imageExtensions.some(ext => urlLower.includes(ext))) {
        return { type: 'image', embedUrl: url };
    }

    // Check if it's a direct image URL (common image hosting)
    if (urlLower.includes('imgur') || urlLower.includes('unsplash') || urlLower.includes('pexels') || urlLower.includes('cloudinary')) {
        return { type: 'image', embedUrl: url };
    }

    return { type: 'unknown', embedUrl: url };
}

/**
 * Universal Media Embed Component
 * Automatically detects and embeds YouTube, Canva, or images
 */
const MediaEmbed = ({ url, width = '100%', height = '400px', title = 'Embedded Media' }) => {
    const { type, embedUrl } = parseMediaUrl(url);

    const containerStyle = {
        width,
        height,
        borderRadius: '0.5rem',
        overflow: 'hidden',
        background: '#f8f8f8',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
    };

    switch (type) {
        case 'youtube':
            return (
                <div style={containerStyle}>
                    <ReactPlayer
                        url={embedUrl}
                        width="100%"
                        height="100%"
                        controls
                        config={{
                            youtube: {
                                playerVars: { modestbranding: 1 }
                            }
                        }}
                    />
                </div>
            );

        case 'canva':
            return (
                <div style={containerStyle}>
                    <iframe
                        src={embedUrl}
                        width="100%"
                        height="100%"
                        style={{ border: 'none' }}
                        title={title}
                        allow="fullscreen"
                        loading="lazy"
                    />
                </div>
            );

        case 'image':
            return (
                <div style={{ ...containerStyle, background: 'transparent' }}>
                    <img
                        src={embedUrl}
                        alt={title}
                        style={{
                            maxWidth: '100%',
                            maxHeight: '100%',
                            objectFit: 'contain',
                            borderRadius: '0.5rem'
                        }}
                        loading="lazy"
                    />
                </div>
            );

        default:
            return (
                <div style={containerStyle}>
                    <div style={{ textAlign: 'center', color: 'var(--text-sub)', padding: '2rem' }}>
                        <p style={{ fontSize: '2rem', margin: 0 }}>🔗</p>
                        <p>지원되지 않는 미디어 형식입니다.</p>
                        <a href={url} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--primary)' }}>
                            링크 열기
                        </a>
                    </div>
                </div>
            );
    }
};

/**
 * Preview card for media with type badge
 */
export const MediaPreviewCard = ({ url, onClick }) => {
    const { type } = parseMediaUrl(url);

    const typeLabels = {
        youtube: '🎬 YouTube',
        canva: '🎨 Canva',
        image: '🖼️ 이미지',
        unknown: '🔗 링크'
    };

    return (
        <div
            onClick={onClick}
            style={{
                padding: '0.75rem',
                background: 'var(--card-bg)',
                borderRadius: '0.5rem',
                border: '1px solid #eee',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                transition: 'box-shadow 0.2s'
            }}
        >
            <span style={{
                padding: '0.25rem 0.5rem',
                background: 'var(--primary)',
                color: 'white',
                borderRadius: '0.25rem',
                fontSize: '0.75rem',
                fontWeight: '600'
            }}>
                {typeLabels[type]}
            </span>
            <span style={{
                flex: 1,
                fontSize: '0.85rem',
                color: 'var(--text-sub)',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis'
            }}>
                {url}
            </span>
        </div>
    );
};

export default MediaEmbed;
