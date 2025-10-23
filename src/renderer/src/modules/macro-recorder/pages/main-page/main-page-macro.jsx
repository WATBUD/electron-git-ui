import React from 'react';
import { Outlet } from 'react-router-dom';
import MacroRecorder from '../../components/MacroRecorder';
import './main-page-macro.css';

export const MacroModule = () => {
  return (
    <div className="macro-module">
      <div className="macro-content">
        <MacroRecorder />
      </div>
      <Outlet />
    </div>
  );
};

export default MacroModule;
