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
    <div className="searchContainer">
      <input
        type="text"
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className={`searchInput ${className}`}
        {...props}
      />
    </div>
  );
};
