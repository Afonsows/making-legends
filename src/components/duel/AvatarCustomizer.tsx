import React from 'react';
import { EditProfileModal } from '../modals/EditProfileModal';

interface AvatarCustomizerProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AvatarCustomizer: React.FC<AvatarCustomizerProps> = ({ isOpen, onClose }) => {
  return <EditProfileModal isOpen={isOpen} onClose={onClose} />;
};
