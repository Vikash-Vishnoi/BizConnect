/**
 * Button Component
 * Reusable button with multiple variants, sizes, and states
 * Fully accessible with keyboard support and loading states
 * 
 * @component
 * @param {Object} props - Component props
 * @param {React.ReactNode} props.children - Button content/text
 * @param {Function} [props.onClick] - Click handler
 * @param {'button'|'submit'|'reset'} [props.type='button'] - Button type
 * @param {'primary'|'secondary'|'success'|'danger'|'outline'|'ghost'} [props.variant='primary'] - Visual style
 * @param {'small'|'medium'|'large'} [props.size='medium'] - Button size
 * @param {boolean} [props.fullWidth=false] - Make button full width
 * @param {boolean} [props.disabled=false] - Disable button
 * @param {boolean} [props.loading=false] - Show loading spinner
 * @param {React.ReactNode} [props.icon] - Icon to display before text
 * @param {string} [props.className=''] - Additional CSS classes
 * @param {string} [props.ariaLabel] - ARIA label for accessibility
 * @returns {JSX.Element} Button component
 * 
 * @example
 * <Button variant="primary" icon={<MdSave />} onClick={handleSave}>
 *   Save Changes
 * </Button>
 * 
 * @example
 * <Button variant="danger" loading={isDeleting} onClick={handleDelete}>
 *   Delete Item
 * </Button>
 */

import React from 'react';
import './Button.css';

const Button = ({ 
  children, 
  onClick, 
  type = 'button', 
  variant = 'primary', 
  size = 'medium',
  fullWidth = false,
  disabled = false,
  loading = false,
  icon = null,
  className = '',
  ariaLabel,
  ...rest
}) => {
  const buttonClass = `
    btn 
    btn-${variant} 
    btn-${size} 
    ${fullWidth ? 'btn-full-width' : ''} 
    ${disabled || loading ? 'btn-disabled' : ''}
    ${className}
  `.trim().replace(/\s+/g, ' ');

  return (
    <button
      type={type}
      className={buttonClass}
      onClick={onClick}
      disabled={disabled || loading}
      aria-label={ariaLabel || (typeof children === 'string' ? children : undefined)}
      aria-busy={loading}
      {...rest}
    >
      {loading ? (
        <>
          <span className="btn-spinner" role="status" aria-label="Loading"></span>
          <span className="sr-only">Loading...</span>
        </>
      ) : (
        <>
          {icon && <span className="btn-icon" aria-hidden="true">{icon}</span>}
          <span>{children}</span>
        </>
      )}
    </button>
  );
};

export default Button;
