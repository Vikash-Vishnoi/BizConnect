/**
 * Input Component
 * Reusable form input with built-in validation, icons, and accessibility
 * 
 * @component
 * @param {Object} props - Component props
 * @param {string} [props.label] - Input label text
 * @param {string} [props.type='text'] - Input type (text, password, email, etc.)
 * @param {string} props.value - Input value (controlled)
 * @param {Function} props.onChange - Change handler
 * @param {string} [props.error] - Error message to display
 * @param {string} [props.placeholder] - Placeholder text
 * @param {React.ReactNode} [props.leftIcon] - Icon to display on left
 * @param {React.ReactNode} [props.rightIcon] - Icon to display on right
 * @param {boolean} [props.disabled=false] - Disable input
 * @param {boolean} [props.readOnly=false] - Make input read-only
 * @param {boolean} [props.required=false] - Mark as required field
 * @param {string} [props.autoComplete='off'] - Autocomplete attribute
 * @param {string} [props.name] - Input name attribute
 * @param {string} [props.id] - Input ID (auto-generated if not provided)
 * @param {string} [props.className] - Additional CSS classes
 * @param {string} [props['aria-describedby']] - ARIA describedby attribute
 * @returns {JSX.Element} Input component
 */

import React, { useState, useId } from 'react';
import { MdVisibility, MdVisibilityOff, MdWarning } from 'react-icons/md';
import './Input.css';

const Input = ({ 
  label,
  type = 'text',
  value,
  onChange,
  error = '',
  placeholder = '',
  leftIcon = null,
  rightIcon = null,
  disabled = false,
  readOnly = false,
  required = false,
  autoComplete = 'off',
  name = '',
  id = '',
  className = '',
  'aria-describedby': ariaDescribedby
}) => {
  const [showPassword, setShowPassword] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  
  // Generate unique ID for accessibility
  const generatedId = useId();
  const inputId = id || name || `input-${generatedId}`;
  const errorId = `${inputId}-error`;
  const inputType = type === 'password' && showPassword ? 'text' : type;

  return (
    <div className={`input-container ${className}`}>
      {label && (
        <label htmlFor={inputId} className="input-label">
          {label}
          {required && <span className="input-required">*</span>}
        </label>
      )}
      
      <div className={`input-wrapper ${error ? 'input-error' : ''} ${isFocused ? 'input-focused' : ''} ${disabled ? 'input-disabled' : ''} ${readOnly ? 'input-readonly' : ''}`}>
        {leftIcon && (
          <span className="input-icon input-icon-left">{leftIcon}</span>
        )}
        
        <input
          id={inputId}
          name={name}
          type={inputType}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          disabled={disabled}
          readOnly={readOnly}
          required={required}
          autoComplete={autoComplete}
          className="input-field"
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          aria-invalid={!!error}
          aria-describedby={error ? errorId : ariaDescribedby}
        />
        
        {type === 'password' && (
          <button
            type="button"
            className="input-icon input-icon-right input-password-toggle"
            onClick={() => setShowPassword(!showPassword)}
            tabIndex={-1}
          >
            {showPassword ? <MdVisibility /> : <MdVisibilityOff />}
          </button>
        )}
        
        {rightIcon && type !== 'password' && (
          <span className="input-icon input-icon-right">{rightIcon}</span>
        )}
      </div>
      {error && (
        <div className="input-error" id={errorId} role="alert">
          <span className="input-error-icon"><MdWarning /></span>
          <span>{error}</span>
        </div>
      )}
    </div>
  );
};

export default Input;
