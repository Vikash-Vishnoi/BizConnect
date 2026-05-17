/**
 * 🖼️ Optimized Image Component
 * 
 * Progressive image loading with blur placeholder effect.
 * Uses native lazy loading for better performance.
 * Provides graceful error handling with fallback UI.
 * 
 * @component
 * 
 * @features
 * - Progressive image loading (blur-up effect)
 * - Native lazy loading support
 * - Low-res placeholder display
 * - Error state with fallback UI
 * - Load and error callbacks
 * - Customizable object-fit
 * - Accessibility with alt text
 * 
 * @param {Object} props
 * @param {string} props.src - Image source URL (required)
 * @param {string} props.alt - Alt text for accessibility (required)
 * @param {string} [props.placeholder] - Low-res placeholder image URL (optional)
 * @param {string} [props.className=''] - Additional CSS classes
 * @param {boolean} [props.lazy=true] - Enable native lazy loading
 * @param {string} [props.objectFit='cover'] - CSS object-fit value (cover|contain|fill|none|scale-down)
 * @param {Function} [props.onLoad] - Callback when image successfully loads
 * @param {Function} [props.onError] - Callback when image fails to load
 * 
 * @state
 * - isLoaded: Image load completion status
 * - hasError: Image load error status
 * 
 * @performance
 * - Uses native lazy loading (loading="lazy")
 * - Placeholder renders immediately while main image loads
 * - Smooth fade-in transition on load
 * 
 * @accessibility
 * - Requires alt prop for screen readers
 * - Placeholder marked with aria-hidden="true"
 * - Error state includes descriptive text
 * 
 * @example
 * // Basic usage
 * <OptimizedImage src="/images/photo.jpg" alt="Product photo" />
 * 
 * @example
 * // With placeholder
 * <OptimizedImage 
 *   src="/images/photo.jpg" 
 *   placeholder="/images/photo-thumb.jpg"
 *   alt="Product photo" 
 * />
 * 
 * @example
 * // With callbacks
 * <OptimizedImage 
 *   src="/images/photo.jpg" 
 *   alt="Product photo"
 *   onLoad={(e) => console.log('Loaded')}
 *   onError={(e) => console.error('Failed')}
 * />
 */

import React, { useState } from 'react';
import './OptimizedImage.css';

/**
 * OptimizedImage Component
 * @param {Object} props
 * @param {string} props.src - Image source URL
 * @param {string} props.alt - Alt text for accessibility
 * @param {string} [props.placeholder] - Low-res placeholder image (optional)
 * @param {string} [props.className] - Additional CSS classes
 * @param {boolean} [props.lazy=true] - Enable lazy loading
 * @param {string} [props.objectFit='cover'] - CSS object-fit value
 * @param {Function} [props.onLoad] - Callback when image loads
 * @param {Function} [props.onError] - Callback on load error
 */
const OptimizedImage = ({
  src,
  alt,
  placeholder,
  className = '',
  lazy = true,
  objectFit = 'cover',
  onLoad,
  onError,
  ...props
}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);

  const handleLoad = (e) => {
    setIsLoaded(true);
    onLoad?.(e);
  };

  const handleError = (e) => {
    setHasError(true);
    onError?.(e);
  };

  if (hasError) {
    return (
      <div className={`optimized-image-error ${className}`}>
        <svg
          width="48"
          height="48"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
          <circle cx="8.5" cy="8.5" r="1.5" />
          <polyline points="21 15 16 10 5 21" />
        </svg>
        <span>Image not available</span>
      </div>
    );
  }

  return (
    <div className={`optimized-image-wrapper ${className}`}>
      {placeholder && !isLoaded && (
        <img
          src={placeholder}
          alt=""
          className="optimized-image-placeholder"
          aria-hidden="true"
        />
      )}
      <img
        src={src}
        alt={alt}
        className={`optimized-image ${isLoaded ? 'loaded' : ''}`}
        loading={lazy ? 'lazy' : 'eager'}
        onLoad={handleLoad}
        onError={handleError}
        style={{ objectFit }}
        {...props}
      />
    </div>
  );
};

export default OptimizedImage;
