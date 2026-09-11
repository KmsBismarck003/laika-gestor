import React from 'react';
import { PermissionWall } from '../../../components';
import BigDataVisualizer from '../../admin/Dashboard/BigDataVisualizer';
import { useAuth } from '../../../context/AuthContext';

const ManagerAnalytics = () => {
  const { user } = useAuth();

  return (
    <PermissionWall 
      permission="canViewEventAnalytics"
      label="ver los datos financieros y tendencias"
    >
      <div className="manager-analytics">
        {user ? (
          <BigDataVisualizer managerId={user.id} />
        ) : (
          <div style={{ color: '#fff', textAlign: 'center', padding: '2rem' }}>Cargando analítica...</div>
        )}
      </div>
    </PermissionWall>
  );
};

export default ManagerAnalytics;
