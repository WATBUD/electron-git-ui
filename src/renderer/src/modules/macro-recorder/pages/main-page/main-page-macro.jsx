import React, { useState, useEffect } from 'react';
import { Button, Card, List, message, Space } from 'antd';
import { DeleteOutlined } from '@ant-design/icons';
import Toolbar from '../../layout/Toolbar';
import { Outlet } from 'react-router-dom';
import './main-page-macro.css';


export const MainPageMacro = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [recordedActions, setRecordedActions] = useState([]);
  const [macroName, setMacroName] = useState('');
  const [savedMacros, setSavedMacros] = useState([]);
  const [selectedMacro, setSelectedMacro] = useState(null);
  const [targetWindow, setTargetWindow] = useState('MapleStory');
  const [availableWindows, setAvailableWindows] = useState([]);
  const [selectedWindowId, setSelectedWindowId] = useState(null);
  const [loop, setLoop] = useState(false);
  const [speed, setSpeed] = useState(1.0);
  
  useEffect(() => {
    const saved = localStorage.getItem('savedMacros');
    if (saved) {
      try {
        setSavedMacros(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to load saved macros:', e);
      }
    }

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

  const refreshWindowList = async () => {
    if (!window.macroAPI) {
      message.error('Macro API not available');
      return;
    }
    
    try {
      const windows = await window.macroAPI.getWindowList();
      setAvailableWindows(windows);
      message.success(`Found ${windows.length} window(s)`);
    } catch (error) {
      console.error('Failed to get window list:', error);
      message.error('Failed to get window list');
    }
  };

  const handleWindowSelect = (windowId) => {
    const window = availableWindows.find(w => w.id === windowId);
    if (window) {
      setSelectedWindowId(windowId);
      setTargetWindow(window.title);
      message.success(`Selected window: ${window.title}`);
    }
  };

  return (
    <div className="macro-module">
      <div className="macro-content">
        <div className="macro-recorder-container">
          <Card 
            title="Macro Recorder" 
            className="recorder-card"
            bodyStyle={{ padding: '16px' }}
          >
            <Toolbar
              isRecording={isRecording}
              isPlaying={isPlaying}
              recordedActions={recordedActions}
              macroName={macroName}
              setMacroName={setMacroName}
              targetWindow={targetWindow}
              setTargetWindow={setTargetWindow}
              availableWindows={availableWindows}
              selectedWindowId={selectedWindowId}
              setSelectedWindowId={setSelectedWindowId}
              speed={speed}
              setSpeed={setSpeed}
              loop={loop}
              setLoop={setLoop}
              onStartRecording={startRecording}
              onStopRecording={stopRecording}
              onPlayMacro={playMacro}
              onStopPlaying={stopPlaying}
              onSaveMacro={saveMacro}
              onRefreshWindowList={refreshWindowList}
              onWindowSelect={(win) => setTargetWindow(win.title)}
            />
            
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
                    {[...recordedActions].reverse().map((action, index) => (
                      <div key={`${action.timestamp}-${index}`} className="action-item">
                        <span className="action-type">{action.type}</span>
                        <span className="action-details">
                          {action.type === 'keydown' || action.type === 'keyup' ? (
                            <span>Keycode: <strong>{action.keycode}</strong></span>
                          ) : action.type === 'mousedown' || action.type === 'mouseup' ? (
                            <span>Button: <strong>{action.button}</strong>, X: {action.x}, Y: {action.y}</span>
                          ) : action.type === 'mousemove' ? (
                            <span>X: {action.x}, Y: {action.y}</span>
                          ) : action.type === 'wheel' ? (
                            <span>Rotation: {action.rotation}, Direction: {action.direction}</span>
                          ) : (
                            JSON.stringify(action)
                          )}
                        </span>
                        <span className="action-time">+{action.timestamp}ms</span>
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
      </div>
      <Outlet />
    </div>
  );
};
