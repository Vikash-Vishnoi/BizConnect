/**
 * 💀 Loading Skeleton Component
 * Industry-standard loading placeholders
 */

import React from 'react';
import './LoadingSkeleton.css';

export const SkeletonLine = ({ width = '100%', height = '16px', marginBottom = '8px' }) => (
  <div 
    className="skeleton-line" 
    style={{ width, height, marginBottom }}
  />
);

export const SkeletonCircle = ({ size = '40px' }) => (
  <div 
    className="skeleton-circle" 
    style={{ width: size, height: size }}
  />
);

export const SkeletonCard = () => (
  <div className="skeleton-card">
    <SkeletonLine width="60%" height="20px" marginBottom="12px" />
    <SkeletonLine width="100%" marginBottom="8px" />
    <SkeletonLine width="90%" marginBottom="8px" />
    <SkeletonLine width="70%" />
  </div>
);

export const SkeletonTable = ({ rows = 5, columns = 4 }) => (
  <div className="skeleton-table">
    <div className="skeleton-table-header">
      {Array.from({ length: columns }).map((_, i) => (
        <SkeletonLine key={i} width="80px" />
      ))}
    </div>
    {Array.from({ length: rows }).map((_, rowIndex) => (
      <div key={rowIndex} className="skeleton-table-row">
        {Array.from({ length: columns }).map((_, colIndex) => (
          <SkeletonLine key={colIndex} width="100%" />
        ))}
      </div>
    ))}
  </div>
);

export const SkeletonList = ({ items = 5 }) => (
  <div className="skeleton-list">
    {Array.from({ length: items }).map((_, i) => (
      <div key={i} className="skeleton-list-item">
        <SkeletonCircle size="48px" />
        <div style={{ flex: 1 }}>
          <SkeletonLine width="40%" height="18px" marginBottom="8px" />
          <SkeletonLine width="70%" height="14px" />
        </div>
      </div>
    ))}
  </div>
);

export const SkeletonDashboard = () => (
  <div className="skeleton-dashboard">
    <div className="skeleton-stats-grid">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="skeleton-stat-card">
          <SkeletonCircle size="40px" />
          <div style={{ flex: 1 }}>
            <SkeletonLine width="50%" height="14px" marginBottom="8px" />
            <SkeletonLine width="70%" height="24px" />
          </div>
        </div>
      ))}
    </div>
    <div className="skeleton-content-grid">
      <SkeletonCard />
      <SkeletonCard />
    </div>
  </div>
);

const LoadingSkeleton = ({ type = 'line', ...props }) => {
  switch (type) {
    case 'circle':
      return <SkeletonCircle {...props} />;
    case 'card':
      return <SkeletonCard {...props} />;
    case 'table':
      return <SkeletonTable {...props} />;
    case 'list':
      return <SkeletonList {...props} />;
    case 'dashboard':
      return <SkeletonDashboard {...props} />;
    default:
      return <SkeletonLine {...props} />;
  }
};

export default LoadingSkeleton;
