/**
 * Card Component
 * Reusable container with consistent styling and optional interactions
 * 
 * @component
 * @param {Object} props - Component props
 * @param {React.ReactNode} props.children - Card content
 * @param {string} [props.className=''] - Additional CSS classes
 * @param {'none'|'sm'|'base'|'lg'} [props.padding='base'] - Padding size
 * @param {boolean} [props.hoverable=false] - Enable hover effect
 * @param {Function} [props.onClick] - Click handler (makes card clickable)
 * @param {string} [props.role] - ARIA role
 * @param {string} [props.ariaLabel] - ARIA label for accessibility
 * @returns {JSX.Element} Card component
 * 
 * @example
 * <Card hoverable onClick={() => navigate('/details')}>
 *   <h3>Title</h3>
 *   <p>Content</p>
 * </Card>
 */

import React from 'react';
import './Card.css';

const Card = ({ 
  children, 
  className = '',
  padding = 'base',
  hoverable = false,
  onClick = null,
  role,
  ariaLabel,
  ...rest
}) => {
  const cardClass = `
    card 
    card-padding-${padding} 
    ${hoverable ? 'card-hoverable' : ''} 
    ${onClick ? 'card-clickable' : ''}
    ${className}
  `.trim().replace(/\s+/g, ' ');

  const handleKeyDown = (e) => {
    if (onClick && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      onClick(e);
    }
  };

  return (
    <div 
      className={cardClass} 
      onClick={onClick}
      onKeyDown={handleKeyDown}
      role={onClick ? (role || 'button') : role}
      tabIndex={onClick ? 0 : undefined}
      aria-label={ariaLabel}
      {...rest}
    >
      {children}
    </div>
  );
};

export default Card;
