import React from 'react';
import './FileStatus.css';

export const FileStatus = ({ 
  fileStatus, 
  onStageFile, 
  onUnstageFile,
  getStatusIcon,
  getStatusText 
}) => {
  return (
    <div className="file-status-panel">
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
                >
                  ➜
                </button>
              </div>
            ))}
        </div>
      </div>

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
                >
                  ⬅
                </button>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}; 