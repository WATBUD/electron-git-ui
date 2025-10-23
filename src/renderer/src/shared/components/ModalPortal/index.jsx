import React from 'react';
import { createPortal } from 'react-dom';

export const ModalPortal = ({ children }) => {
  return createPortal(
    children,
    document.body
  );
}; 