import React from 'react';
import { useNavigate } from 'react-router-dom';
import Card from './Card';
import Button from './Button';
import { MdBusiness } from 'react-icons/md';
import './BusinessSetupRequired.css';

const BusinessSetupRequired = ({ 
  title = 'Business Setup Required',
  message = 'Please complete your business setup to access this feature',
  showIcon = true 
}) => {
  const navigate = useNavigate();

  return (
    <Card className="business-setup-required">
      <div className="business-setup-content">
        {showIcon && <span className="business-setup-icon">🏢</span>}
        <h3 className="business-setup-title">{title}</h3>
        <p className="business-setup-message">{message}</p>
        <Button 
          variant="primary" 
          size="large" 
          onClick={() => navigate('/business/create')}
          icon={<MdBusiness />}
        >
              Setup Business
        </Button>
      </div>
    </Card>
  );
};

export default BusinessSetupRequired;
