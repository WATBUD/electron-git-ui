import React from 'react';
import { LoadingModal } from '../../../../shared/components/LoadingModal';
import { RefreshButton } from '../../../../shared/components/RefreshButton';
import './FileStatus.css';

export const FileStatus = ({ 
  fileStatus, 
  onStageFile, 
  onUnstageFile,
  getStatusIcon,
  getStatusText,
  onRefresh,
  loading,
  loadingMessage
}) => {
  return (
    <div className="file-status-panel">
      <LoadingModal message={loadingMessage} />
      <div className="file-status-header">
        <h3></h3>
        <RefreshButton
          onClick={onRefresh}
          disabled={loading}
          title="Refresh status"
          text="File Status Refresh"
        />
      </div>
      <div className="file-status-content">

        <div className="file-status-section">
          <h3>Staging Area</h3>
          <div className="file-list">
            {fileStatus
              .filter(file => file.isStaged)
              .map((file, index) => (
                <div key={`staged-${index}`} className="file-item">
                  <span className="file-icon">{getStatusIcon(file)}</span>
                  <div className="file-info">
                    <span className="file-name">{file.file}</span>
                    <span className="file-status">{getStatusText(file)}</span>
                  </div>
                  <button
                    onClick={() => onUnstageFile(file.file)}
                    className="unstage-btn"
                    title="Unstage file"
                    disabled={loading}
                  >
                    ⬅
                  </button>
                </div>
              ))}
          </div>
        </div>
        <div className="file-status-section">
          <h3>Working Directory</h3>
          <div className="file-list">
            {fileStatus
              .filter(file => !file.isStaged)
              .map((file, index) => (
                <div key={`working-${index}`} className="file-item">
                  <span className="file-icon">{getStatusIcon(file)}</span>
                  <div className="file-info">
                    <span className="file-name">{file.file}</span>
                    <span className="file-status">{getStatusText(file)}</span>
                  </div>
                  <button
                    onClick={() => onStageFile(file.file)}
                    className="stage-btn"
                    title="Stage file"
                    disabled={loading}
                  >
                    ➜
                  </button>
                </div>
              ))}
          </div>
        </div>
      </div>
    </div>
  );
}; 