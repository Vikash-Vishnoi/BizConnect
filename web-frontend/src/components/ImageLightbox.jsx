/**
 * Image Lightbox Component
 * Full-screen image viewer for chat messages
 * Similar to WhatsApp's image preview
 * 
 * @component
 * @param {Object} props - Component props
 * @param {boolean} props.isOpen - Lightbox visibility state
 * @param {Function} props.onClose - Close handler
 * @param {string} props.imageUrl - URL of the image to display
 * @param {string} [props.caption] - Optional image caption
 * @returns {JSX.Element|null} Lightbox component or null if closed
 * 
 * @example
 * <ImageLightbox
 *   isOpen={showLightbox}
 *   onClose={() => setShowLightbox(false)}
 *   imageUrl="https://example.com/image.jpg"
 *   caption="Photo description"
 * />
 */

import React, { useEffect } from 'react';
import { MdClose, MdDownload } from 'react-icons/md';
import './ImageLightbox.css';

const ImageLightbox = ({ isOpen, onClose, imageUrl, caption }) => {
  // Handle keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    // Prevent body scroll when lightbox is open
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Handle download
  const handleDownload = async () => {
    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `image-${Date.now()}.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to download image:', error);
    }
  };

  return (
    <div 
      className="image-lightbox-overlay" 
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Image preview"
    >
      <div className="image-lightbox-content" onClick={(e) => e.stopPropagation()}>
        {/* Header with close and download buttons */}
        <div className="image-lightbox-header">
          <button
            className="image-lightbox-btn"
            onClick={handleDownload}
            aria-label="Download image"
            title="Download"
          >
            <MdDownload size={24} />
          </button>
          <button
            className="image-lightbox-btn image-lightbox-close"
            onClick={onClose}
            aria-label="Close"
            title="Close"
          >
            <MdClose size={24} />
          </button>
        </div>

        {/* Image */}
        <div className="image-lightbox-image-wrapper">
          <img 
            src={imageUrl} 
            alt={caption || "Full size preview"} 
            className="image-lightbox-image"
          />
        </div>

        {/* Caption */}
        {caption && (
          <div className="image-lightbox-caption">
            <p>{caption}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ImageLightbox;
