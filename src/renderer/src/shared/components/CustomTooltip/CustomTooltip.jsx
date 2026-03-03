import React, { useState, useEffect } from 'react'
import { Tooltip } from 'antd'
import { Bold } from 'lucide-react'

const stylePresets = [
  {
    // 熱情橘
    backgroundColor: 'rgba(255, 159, 67, 0.5)',
    color: 'rgba(33, 33, 33, 0.95)'
  },
  {
    // 海洋藍
    backgroundColor: 'rgba(59, 130, 246, 0.5)',
    color: 'rgba(245, 245, 245, 0.95)'
  },
  {
    // 薰衣草紫
    backgroundColor: 'rgba(181, 147, 249, 0.5)',
    color: 'rgba(34, 34, 34, 0.95)'
  },
  {
    // 綠意薄荷
    backgroundColor: 'rgba(167, 243, 208, 0.5)',
    color: 'rgba(20, 83, 45, 0.95)'
  },
  {
    // 日落粉
    backgroundColor: 'rgba(252, 165, 179, 0.5)',
    color: 'rgba(45, 0, 20, 0.95)'
  },
  {
    // 暖灰巧克力
    backgroundColor: 'rgba(120, 113, 108, 0.5)',
    color: 'rgba(250, 245, 240, 0.95)'
  },
  {
    // 藍黑科技
    backgroundColor: 'rgba(10, 25, 47, 0.7)',
    color: 'rgba(200, 220, 255, 0.95)'
  },
  {
    // 橄欖綠柔和
    backgroundColor: 'rgba(202, 230, 185, 0.5)',
    color: 'rgba(34, 48, 22, 0.95)'
  }
]

export const CustomTooltip = ({
  children,
  title,
  placement = 'top',
  styles: userStyles = {},
  discoMode = true,
  ...props
}) => {
  const [styleIndex, setStyleIndex] = useState(() =>
    Math.floor(Math.random() * stylePresets.length)
  )
  const [isVisible, setIsVisible] = useState(false)

  const handleOpenChange = (visible) => {
    setIsVisible(visible)
    if (visible) {
      setStyleIndex(Math.floor(Math.random() * stylePresets.length))
    }
    if (props.onOpenChange) {
      props.onOpenChange(visible)
    }
  }

  // Disco Mode: 每秒切換顏色
  useEffect(() => {
    let intervalId = null
    if (discoMode && isVisible) {
      intervalId = setInterval(() => {
        setStyleIndex((prevIndex) => (prevIndex + 1) % stylePresets.length)
      }, 350)
    }
    return () => {
      if (intervalId) clearInterval(intervalId)
    }
  }, [discoMode, isVisible])

  const defaultContentStyle = {
    backgroundColor: stylePresets[styleIndex].backgroundColor,
    color: stylePresets[styleIndex].color,
    backdropFilter: 'blur(10px)',
    WebkitBackdropFilter: 'blur(10px)',
    border: '1px solid rgba(255, 255, 255, 0.12)',
    borderRadius: '10px',
    padding: '8px 14px',
    fontSize: '12.5px',
    fontWeight: '500',
    letterSpacing: '0.3px',
    lineHeight: '1.5',
    transition: 'all 0.3s ease'
  }

  const mergedStyle = { ...defaultContentStyle, ...userStyles }

  return (
    <Tooltip
      title={
        <>
          <div style={{ fontWeight: 'bold', fontSize: '13px' }}>{title}</div>
        </>
      }
      placement={placement}
      color={mergedStyle.backgroundColor}
      arrow={true}
      onOpenChange={handleOpenChange}
      styles={{
        body: mergedStyle
      }}
      mouseEnterDelay={0.4}
      {...props}
    >
      {children}
    </Tooltip>
  )
}

export default CustomTooltip
