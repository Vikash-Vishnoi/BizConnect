/**
 * Business Setup Required Component
 * Displays a prompt when user needs to complete business setup
 * Used as a guard/placeholder for features requiring business configuration
 * 
 * @component
 * @param {Object} props - Component props
 * @param {string} [props.title='Business Setup Required'] - Main heading
 * @param {string} [props.message] - Description message
 * @param {boolean} [props.showIcon=true] - Show business icon
 * @param {string} [props.redirectPath='/business/create'] - Setup page path
 * @returns {JSX.Element} Business setup prompt
 * 
 * @example
 * <BusinessSetupRequired 
 *   title="Complete Setup to Access Campaigns"
 *   message="Set up your WhatsApp Business account to start creating campaigns"
 * />
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';
import Card from './Card';
import Button from './Button';
import { MdBusiness } from 'react-icons/md';
import { ROUTES } from '../config/constants';
import './BusinessSetupRequired.css';

const BusinessSetupRequired = ({ 
  title = 'Business Setup Required',
  message = 'Please complete your business setup to access this feature',
  showIcon = true,
  redirectPath = ROUTES.BUSINESS_SETUP || '/business/create'
}) => {
  const navigate = useNavigate();

  return (
    <Card className="business-setup-required" role="alert" aria-live="polite">
      <div className="business-setup-content">
        {showIcon && (
          <span className="business-setup-icon" role="img" aria-label="Business building">
            🏢
          </span>
        )}
        <h3 className="business-setup-title">{title}</h3>
        <p className="business-setup-message">{message}</p>
        <Button 
          variant="primary" 
          size="large" 
          onClick={() => navigate(redirectPath)}
          icon={<MdBusiness />}
          ariaLabel="Set up your business account"
        >
          Setup Business
        </Button>
      </div>
    </Card>
  );
};

export default BusinessSetupRequired;
