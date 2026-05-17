/**
 * Confirmation Modal Component
 * Industry-standard confirmation dialog with full accessibility support
 * Includes focus trap, keyboard navigation, and ARIA attributes
 * 
 * @component
 * @param {Object} props - Component props
 * @param {boolean} props.isOpen - Modal visibility state
 * @param {Function} props.onClose - Close handler
 * @param {Function} props.onConfirm - Confirm action handler
 * @param {string} [props.title='Confirm Action'] - Modal title
 * @param {string} [props.message='Are you sure...'] - Confirmation message
 * @param {string} [props.confirmText='Confirm'] - Confirm button text
 * @param {string} [props.cancelText='Cancel'] - Cancel button text
 * @param {'danger'|'warning'|'info'|'success'} [props.variant='danger'] - Visual variant
 * @param {boolean} [props.loading=false] - Loading state
 * @returns {JSX.Element|null} Modal component or null if closed
 * 
 * @example
 * <ConfirmationModal
 *   isOpen={showModal}
 *   onClose={() => setShowModal(false)}
 *   onConfirm={handleDelete}
 *   title="Delete Item"
 *   message="This action cannot be undone."
 *   variant="danger"
 * />
 */

import React, { useEffect, useRef } from 'react';
import { MdWarning, MdClose, MdInfo, MdCheckCircle } from 'react-icons/md';
import Button from './Button';
import './Modal.css';

// Modal variant icons mapping
const VARIANT_ICONS = {
  danger: MdWarning,
  warning: MdWarning,
  info: MdInfo,
  success: MdCheckCircle,
};

const ConfirmationModal = ({
  isOpen,
  onClose,
  onConfirm,
  title = 'Confirm Action',
  message = 'Are you sure you want to proceed?',
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'danger',
  loading = false,
}) => {
  const modalRef = useRef(null);
  const closeButtonRef = useRef(null);

  // Focus trap and keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    // Focus the close button when modal opens
    if (closeButtonRef.current) {
      closeButtonRef.current.focus();
    }

    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && !loading) {
        onClose();
      }

      // Trap focus within modal
      if (e.key === 'Tab' && modalRef.current) {
        const focusableElements = modalRef.current.querySelectorAll(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"]):not([disabled])'
        );
        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        if (e.shiftKey && document.activeElement === firstElement) {
          e.preventDefault();
          lastElement.focus();
        } else if (!e.shiftKey && document.activeElement === lastElement) {
          e.preventDefault();
          firstElement.focus();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, loading]);

  if (!isOpen) return null;

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget && !loading) {
      onClose();
    }
  };

  const handleConfirm = () => {
    onConfirm();
  };

  /**
   * Get icon component based on variant
   * @returns {JSX.Element} Icon component
   */
  const getIcon = () => {
    const IconComponent = VARIANT_ICONS[variant] || VARIANT_ICONS.info;
    return <IconComponent className={`modal-icon modal-icon-${variant}`} />;
  };

  return (
    <div className="modal-overlay" onClick={handleOverlayClick} role="dialog" aria-modal="true">
      <div className="confirmation-modal" role="document" ref={modalRef}>
        <button 
          ref={closeButtonRef}
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

        <h2 className="modal-title" id="modal-title">{title}</h2>
        <p className="modal-message" id="modal-description">{message}</p>

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
