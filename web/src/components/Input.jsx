import React, { useState } from 'react';
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
  className = ''
}) => {
  const [showPassword, setShowPassword] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

  const inputId = id || name || `input-${Math.random().toString(36).substr(2, 9)}`;
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
        <div className="input-error-message">
          <span className="input-error-icon"><MdWarning /></span>
          <span>{error}</span>
        </div>
      )}
    </div>
  );
};

export default Input;
