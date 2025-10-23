import React, { useState } from 'react';
import { Button, Space, Input, Select, Switch, Divider, Tag, message } from 'antd';
import { 
  PlayCircleOutlined, 
  PauseCircleOutlined, 
  SaveOutlined, 
  ReloadOutlined, 
  WindowsOutlined 
} from '@ant-design/icons';

const { Option } = Select;

export const Toolbar = ({
  isRecording,
  isPlaying,
  recordedActions = [],
  macroName,
  setMacroName,
  targetWindow,
  setTargetWindow,
  availableWindows = [],
  selectedWindowId,
  setSelectedWindowId,
  speed,
  setSpeed,
  loop,
  setLoop,
  onStartRecording,
  onStopRecording,
  onPlayMacro,
  onStopPlaying,
  onSaveMacro,
  onRefreshWindowList,
  onWindowSelect
}) => {
  const handleWindowSelect = (windowId) => {
    setSelectedWindowId(windowId);
    const window = availableWindows.find(w => w.id === windowId);
    if (window) {
      setTargetWindow(window.title);
      onWindowSelect?.(window);
      message.success(`Selected window: ${window.title}`);
    }
  };

  return (
    <div className="recorder-controls">
      <Space wrap>
        {!isRecording ? (
          <Button 
            type="primary" 
            danger 
            onClick={onStartRecording}
            icon={<PlayCircleOutlined />}
            disabled={isPlaying}
          >
            Record
          </Button>
        ) : (
          <Button 
            type="primary" 
            onClick={onStopRecording}
            icon={<PauseCircleOutlined />}
          >
            Stop
          </Button>
        )}
        
        {!isPlaying ? (
          <Button 
            type="primary" 
            onClick={onPlayMacro}
            disabled={recordedActions.length === 0 || isRecording}
            icon={<PlayCircleOutlined />}
          >
            Play
          </Button>
        ) : (
          <Button 
            onClick={onStopPlaying}
            icon={<PauseCircleOutlined />}
            disabled={isRecording}
          >
            Stop
          </Button>
        )}
        
        <Button 
          type="primary" 
          onClick={onSaveMacro}
          disabled={recordedActions.length === 0 || isRecording || isPlaying}
          icon={<SaveOutlined />}
        >
          Save Macro
        </Button>
        
        <Input
          placeholder="Enter macro name"
          value={macroName}
          onChange={(e) => setMacroName(e.target.value)}
          style={{ width: 200 }}
          disabled={recordedActions.length === 0 || isRecording || isPlaying}
        />
      </Space>
      
      <Divider style={{ margin: '16px 0' }} />
      
      <div className="macro-settings">
        <Space wrap>
          <div className="setting-group">
            <span className="setting-label">Target Window:</span>
            <Space.Compact>
              <Button 
                icon={<ReloadOutlined />}
                onClick={onRefreshWindowList}
                disabled={isRecording || isPlaying}
                title="Refresh window list"
              />
              {availableWindows.length > 0 ? (
                <Select
                  value={selectedWindowId}
                  onChange={handleWindowSelect}
                  style={{ width: 300 }}
                  placeholder="Select a window"
                  disabled={isRecording || isPlaying}
                  showSearch
                  filterOption={(input, option) =>
                    option.children.toLowerCase().includes(input.toLowerCase())
                  }
                >
                  {availableWindows.map(win => (
                    <Option key={win.id} value={win.id}>
                      <Space>
                        <WindowsOutlined />
                        {win.title}
                        {win.type === 'macos-app' && <Tag color="green">macOS</Tag>}
                        {win.type === 'electron' && <Tag color="blue">Electron</Tag>}
                      </Space>
                    </Option>
                  ))}
                </Select>
              ) : (
                <Input 
                  value={targetWindow}
                  onChange={(e) => setTargetWindow(e.target.value)}
                  style={{ width: 200 }}
                  placeholder="Window title or click refresh"
                  disabled={isRecording || isPlaying}
                />
              )}
            </Space.Compact>
          </div>
          
          <div className="setting-group">
            <span className="setting-label">Speed:</span>
            <Select 
              value={speed} 
              onChange={setSpeed}
              style={{ width: 100 }}
              disabled={isRecording || isPlaying}
            >
              <Option value={0.5}>0.5x</Option>
              <Option value={0.75}>0.75x</Option>
              <Option value={1.0}>1.0x</Option>
              <Option value={1.5}>1.5x</Option>
              <Option value={2.0}>2.0x</Option>
            </Select>
          </div>
          
          <div className="setting-group">
            <span className="setting-label">Loop:</span>
            <Switch 
              checked={loop} 
              onChange={setLoop}
              disabled={isRecording || isPlaying}
            />
          </div>
        </Space>
      </div>
    </div>
  );
};

export default Toolbar;