import React, { useEffect } from 'react';
import ReactDOM from 'react-dom';
import { Button } from 'antd';
import { CloseOutlined } from '@ant-design/icons';

interface CustomModalProps {
  title: React.ReactNode;
  open: boolean;
  onCancel: () => void;
  onOk?: () => void;
  confirmLoading?: boolean;
  width?: number;
  okText?: string;
  okButtonProps?: any;
  children: React.ReactNode;
}

export default function CustomModal({
  title,
  open,
  onCancel,
  onOk,
  confirmLoading = false,
  width = 500,
  okText = 'OK',
  okButtonProps = {},
  children
}: CustomModalProps) {
  
  // Lock background scroll when open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  // Handle ESC key press to close modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && open) {
        onCancel();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onCancel]);

  if (!open) return null;

  const modalContent = (
    <div className="custom-modal-overlay" onClick={onCancel}>
      <div 
        className="custom-modal-container" 
        style={{ maxWidth: `${width}px` }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="custom-modal-header">
          <div className="custom-modal-title">{title}</div>
          <button className="custom-modal-close-btn" onClick={onCancel} aria-label="Close modal">
            <CloseOutlined />
          </button>
        </div>
        
        <div className="custom-modal-body">
          {children}
        </div>

        <div className="custom-modal-footer">
          <Button onClick={onCancel} disabled={confirmLoading}>
            Cancel
          </Button>
          {onOk && (
            <Button 
              type="primary" 
              loading={confirmLoading} 
              onClick={onOk}
              {...okButtonProps}
            >
              {okText}
            </Button>
          )}
        </div>
      </div>
    </div>
  );

  return ReactDOM.createPortal(modalContent, document.body);
}
