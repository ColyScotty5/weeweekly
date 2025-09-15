import { h } from 'preact';

const Avatar = ({ 
  src, 
  alt = 'Avatar', 
  size = 32, 
  fallbackIcon = '👤',
  style = {},
  className = ''
}) => {
  const avatarStyle = {
    width: `${size}px`,
    height: `${size}px`,
    borderRadius: '50%',
    overflow: 'hidden',
    backgroundColor: 'var(--background-color)',
    border: '1px solid var(--border-color)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: `${Math.max(12, size * 0.4)}px`,
    color: 'var(--text-secondary)',
    flexShrink: 0,
    ...style
  };

  return (
    <div className={`avatar ${className}`} style={avatarStyle}>
      {src ? (
        <img 
          src={src} 
          alt={alt} 
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover'
          }}
          onError={(e) => {
            // If image fails to load, hide it and show fallback
            e.target.style.display = 'none';
            e.target.parentElement.innerHTML = fallbackIcon;
          }}
        />
      ) : (
        <span>{fallbackIcon}</span>
      )}
    </div>
  );
};

export default Avatar;
