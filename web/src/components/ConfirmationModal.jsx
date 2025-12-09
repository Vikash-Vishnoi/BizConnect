/**
 * ⚠️ Confirmation Modal Component
 * Industry-standard confirmation dialog with accessibility
 */

import React from 'react';
import { MdWarning, MdClose } from 'react-icons/md';
import Button from './Button';
import './ConfirmationModal.css';

const ConfirmationModal = ({
  isOpen,
  onClose,
  onConfirm,
  title = 'Confirm Action',
  message = 'Are you sure you want to proceed?',
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'danger', // danger, warning, info, success
  loading = false,
}) => {
  if (!isOpen) return null;

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const handleConfirm = () => {
    onConfirm();
  };

  const getIcon = () => {
    switch (variant) {
      case 'danger':
        return <MdWarning className="modal-icon modal-icon-danger" />;
      case 'warning':
        return <MdWarning className="modal-icon modal-icon-warning" />;
      default:
        return <MdWarning className="modal-icon modal-icon-info" />;
    }
  };

  return (
    <div className="modal-overlay" onClick={handleOverlayClick}>
      <div className="confirmation-modal">
        <button 
          className="modal-close-button" 
          onClick={onClose}
          disabled={loading}
          aria-label="Close modal"
        >
          <MdClose />
        </button>

        <div className="modal-icon-container">
          {getIcon()}
        </div>

        <h2 className="modal-title">{title}</h2>
        <p className="modal-message">{message}</p>

        <div className="modal-actions">
          <Button 
            variant="outline" 
            onClick={onClose}
            disabled={loading}
          >
            {cancelText}
          </Button>
          <Button 
            variant={variant === 'danger' ? 'danger' : 'primary'}
            onClick={handleConfirm}
            loading={loading}
          >
            {confirmText}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmationModal;
