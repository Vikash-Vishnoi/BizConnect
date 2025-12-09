import React from 'react';
import './Card.css';

const Card = ({ 
  children, 
  className = '',
  padding = 'base',
  hoverable = false,
  onClick = null
}) => {
  const cardClass = `
    card 
    card-padding-${padding} 
    ${hoverable ? 'card-hoverable' : ''} 
    ${onClick ? 'card-clickable' : ''}
    ${className}
  `.trim().replace(/\s+/g, ' ');

  return (
    <div className={cardClass} onClick={onClick}>
      {children}
    </div>
  );
};

export default Card;
