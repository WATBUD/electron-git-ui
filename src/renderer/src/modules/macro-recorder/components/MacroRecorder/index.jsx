import React, { useState, useEffect } from 'react';
import { Button, Input, Select, Card, List, Switch, message, Space, Divider } from 'antd';
import { PlayCircleOutlined, PauseCircleOutlined, SaveOutlined, DeleteOutlined } from '@ant-design/icons';
import './MacroRecorder.css';

const { Option } = Select;

const MacroRecorder = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [recordedActions, setRecordedActions] = useState([]);
  const [macroName, setMacroName] = useState('');
  const [savedMacros, setSavedMacros] = useState([]);
  const [selectedMacro, setSelectedMacro] = useState(null);
  const [targetWindow, setTargetWindow] = useState('MapleStory');
  const [loop, setLoop] = useState(false);
  const [speed, setSpeed] = useState(1.0);
  
  // Load saved macros from localStorage on component mount
  useEffect(() => {
    const saved = localStorage.getItem('savedMacros');
    if (saved) {
      try {
        setSavedMacros(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to load saved macros:', e);
      }
    }

    // Set up IPC listeners
    if (window.macroAPI) {
      window.macroAPI.onRecordedAction((action) => {
        setRecordedActions(prev => [...prev, action]);
      });

      window.macroAPI.onMacroFinished(() => {
        setIsPlaying(false);
        message.success('Macro finished playing');
      });
    }

    return () => {
      // Cleanup listeners
      if (window.macroAPI) {
        window.macroAPI.removeAllListeners();
      }
    };
  }, []);

  const startRecording = () => {
    if (!window.macroAPI) {
      message.error('Macro API not available');
      return;
    }
    
    setIsRecording(true);
    setRecordedActions([]);
    window.macroAPI.startRecording();
    message.info('Recording started. Perform your actions...');
  };

  const stopRecording = () => {
    if (!window.macroAPI) return;
    
    setIsRecording(false);
    window.macroAPI.stopRecording();
    message.success('Recording stopped');
  };

  const playMacro = () => {
    if (recordedActions.length === 0) {
      message.warning('No actions recorded to play');
      return;
    }
    
    if (!window.macroAPI) {
      message.error('Macro API not available');
      return;
    }
    
    setIsPlaying(true);
    window.macroAPI.playMacro({
      actions: recordedActions,
      targetWindow,
      loop,
      speed
    });
    message.info('Playing macro...');
  };

  const stopPlaying = () => {
    if (!window.macroAPI) return;
    
    setIsPlaying(false);
    window.macroAPI.stopMacro();
    message.info('Stopped macro');
  };

  const saveMacro = () => {
    if (!macroName.trim()) {
      message.warning('Please enter a name for the macro');
      return;
    }
    
    const newMacro = {
      id: Date.now(),
      name: macroName,
      actions: [...recordedActions],
      createdAt: new Date().toISOString()
    };
    
    const updatedMacros = [...savedMacros, newMacro];
    setSavedMacros(updatedMacros);
    localStorage.setItem('savedMacros', JSON.stringify(updatedMacros));
    setMacroName('');
    message.success('Macro saved successfully');
  };

  const loadMacro = (macro) => {
    setSelectedMacro(macro);
    setRecordedActions(macro.actions);
  };

  const deleteMacro = (macroId, e) => {
    e.stopPropagation();
    const updatedMacros = savedMacros.filter(macro => macro.id !== macroId);
    setSavedMacros(updatedMacros);
    localStorage.setItem('savedMacros', JSON.stringify(updatedMacros));
    
    if (selectedMacro && selectedMacro.id === macroId) {
      setSelectedMacro(null);
      setRecordedActions([]);
    }
    message.success('Macro deleted');
  };

  return (
    <div className="macro-recorder-container">
      <Card 
        title="Macro Recorder" 
        className="recorder-card"
        bodyStyle={{ padding: '16px' }}
      >
        <div className="recorder-controls">
          <Space wrap>
            {!isRecording ? (
              <Button 
                type="primary" 
                danger 
                onClick={startRecording}
                icon={<PlayCircleOutlined />}
                disabled={isPlaying}
              >
                Record
              </Button>
            ) : (
              <Button 
                type="primary" 
                onClick={stopRecording}
                icon={<PauseCircleOutlined />}
              >
                Stop
              </Button>
            )}
            
            {!isPlaying ? (
              <Button 
                type="primary" 
                onClick={playMacro}
                disabled={recordedActions.length === 0 || isRecording}
                icon={<PlayCircleOutlined />}
              >
                Play
              </Button>
            ) : (
              <Button 
                onClick={stopPlaying}
                icon={<PauseCircleOutlined />}
                disabled={isRecording}
              >
                Stop
              </Button>
            )}
            
            <Button 
              type="primary" 
              onClick={saveMacro}
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
                <Input 
                  value={targetWindow}
                  onChange={(e) => setTargetWindow(e.target.value)}
                  style={{ width: 200 }}
                  placeholder="Window title"
                  disabled={isRecording || isPlaying}
                />
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
        
        <div className="actions-panel">
          <div className="actions-header">
            <h3>Recorded Actions: {recordedActions.length}</h3>
            {recordedActions.length > 0 && (
              <Button 
                type="link" 
                danger 
                onClick={() => setRecordedActions([])}
                disabled={isRecording || isPlaying}
              >
                Clear All
              </Button>
            )}
          </div>
          
          <div className="actions-list">
            {recordedActions.length > 0 ? (
              <div className="actions-container">
                {recordedActions.map((action, index) => (
                  <div key={index} className="action-item">
                    <span className="action-type">{action.type}</span>
                    <span className="action-details">
                      {action.type === 'key' ? (
                        `Key: ${action.key}, State: ${action.state}`
                      ) : (
                        `X: ${action.x}, Y: ${action.y}${action.button ? `, Button: ${action.button}` : ''}${action.state ? `, State: ${action.state}` : ''}`
                      )}
                    </span>
                    <span className="action-time">{action.timestamp}ms</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-state">
                <p>No actions recorded yet. Click 'Record' to start.</p>
              </div>
            )}
          </div>
        </div>
      </Card>
      
      <Card 
        title="Saved Macros" 
        className="saved-macros"
        bodyStyle={{ padding: '16px' }}
      >
        <List
          itemLayout="horizontal"
          dataSource={savedMacros}
          locale={{ emptyText: 'No saved macros' }}
          renderItem={macro => (
            <List.Item 
              onClick={() => loadMacro(macro)}
              className={`macro-item ${selectedMacro?.id === macro.id ? 'selected' : ''}`}
              actions={[
                <Button 
                  key="delete"
                  type="text" 
                  danger 
                  icon={<DeleteOutlined />} 
                  onClick={(e) => deleteMacro(macro.id, e)}
                  disabled={isRecording || isPlaying}
                />
              ]}
            >
              <List.Item.Meta
                title={macro.name}
                description={`${macro.actions.length} actions | ${new Date(macro.createdAt).toLocaleString()}`}
              />
            </List.Item>
          )}
        />
      </Card>
    </div>
  );
};

export default MacroRecorder;
