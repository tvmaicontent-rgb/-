import React from 'react';
import { Modal } from '../common/Modal';
import { AnalyticsTab } from '../analytics/AnalyticsTab';

interface AnalyticsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AnalyticsModal: React.FC<AnalyticsModalProps> = ({ isOpen, onClose }) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Аналитический отчет и KPI отдела"
      maxWidth="6xl"
    >
      <div className="pt-2">
        <AnalyticsTab />
      </div>
    </Modal>
  );
};
