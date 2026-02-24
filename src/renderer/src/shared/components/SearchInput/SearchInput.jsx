import React from 'react'
import styles from './SearchInput.module.css'

export const SearchInput = ({
  value,
  onChange,
  placeholder = 'Search...',
  className = '',
  ...props
}) => {
  return (
    <div className={styles.searchContainer}>
      <input
        type="text"
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className={`${styles.searchInput} ${className}`}
        {...props}
      />
    </div>
  )
}
