import React from 'react';
import './SearchInput.css';

export const  SearchInput = ({ 
  value, 
  onChange, 
  placeholder = "Search...", 
  className = "",
  ...props 
}) => {
  return (
    <div className="search-container">
      <input
        type="text"
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className={`search-input ${className}`}
        {...props}
      />
    </div>
  );
};
