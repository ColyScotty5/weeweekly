import { h } from 'preact';
import { useState } from 'preact/hooks';
import { useAuth } from '../contexts/AuthContext';

const Profile = ({ onClose }) => {
  const { user, updateProfile } = useAuth();
  const [formData, setFormData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [avatar, setAvatar] = useState(user?.avatar || null);
  const [avatarFile, setAvatarFile] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (error) setError('');
    if (success) setSuccess('');
  };

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        setError('Avatar file size must be less than 5MB');
        return;
      }
      
      if (!file.type.startsWith('image/')) {
        setError('Please select a valid image file');
        return;
      }

      setAvatarFile(file);
      
      // Create preview URL
      const reader = new FileReader();
      reader.onload = (e) => {
        setAvatar(e.target.result);
      };
      reader.readAsDataURL(file);
      
      if (error) setError('');
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!formData.currentPassword) {
      setError('Current password is required');
      return;
    }

    if (!formData.newPassword) {
      setError('New password is required');
      return;
    }

    if (formData.newPassword.length < 6) {
      setError('New password must be at least 6 characters long');
      return;
    }

    if (formData.newPassword !== formData.confirmPassword) {
      setError('New passwords do not match');
      return;
    }

    if (formData.currentPassword === formData.newPassword) {
      setError('New password must be different from current password');
      return;
    }

    setLoading(true);
    try {
      await updateProfile({
        currentPassword: formData.currentPassword,
        newPassword: formData.newPassword
      });
      
      setSuccess('Password updated successfully!');
      setFormData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAvatarSave = async () => {
    if (!avatarFile && !avatar) return;
    
    setLoading(true);
    setError('');
    setSuccess('');
    
    try {
      await updateProfile({
        avatar: avatar
      });
      setSuccess('Avatar updated successfully!');
      setAvatarFile(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const removeAvatar = async () => {
    setLoading(true);
    setError('');
    setSuccess('');
    
    try {
      await updateProfile({ avatar: null });
      setAvatar(null);
      setAvatarFile(null);
      setSuccess('Avatar removed successfully!');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '20px'
    }}>
      <div style={{
        backgroundColor: 'var(--card-background)',
        borderRadius: '8px',
        padding: '30px',
        width: '100%',
        maxWidth: '500px',
        maxHeight: '90vh',
        overflowY: 'auto',
        border: '1px solid var(--border-color)',
        boxShadow: '0 10px 25px rgba(0, 0, 0, 0.2)'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '25px'
        }}>
          <h2 style={{ 
            margin: 0, 
            color: 'var(--text-color)',
            fontSize: '24px'
          }}>
            Profile Settings
          </h2>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '24px',
              cursor: 'pointer',
              color: 'var(--text-secondary)',
              padding: '0',
              width: '30px',
              height: '30px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            ×
          </button>
        </div>

        {/* User Info */}
        <div style={{
          marginBottom: '30px',
          padding: '20px',
          backgroundColor: 'var(--background-color)',
          borderRadius: '6px',
          border: '1px solid var(--border-color)'
        }}>
          <h3 style={{ 
            margin: '0 0 15px 0', 
            color: 'var(--text-color)',
            fontSize: '18px'
          }}>
            User Information
          </h3>
          <p style={{ margin: '5px 0', color: 'var(--text-secondary)' }}>
            <strong>Name:</strong> {user?.name}
          </p>
          <p style={{ margin: '5px 0', color: 'var(--text-secondary)' }}>
            <strong>Email:</strong> {user?.email}
          </p>
          <p style={{ margin: '5px 0', color: 'var(--text-secondary)' }}>
            <strong>Role:</strong> {user?.role}
          </p>
        </div>

        {/* Avatar Section */}
        <div style={{ marginBottom: '30px' }}>
          <h3 style={{ 
            margin: '0 0 15px 0', 
            color: 'var(--text-color)',
            fontSize: '18px'
          }}>
            Profile Picture
          </h3>
          
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '20px',
            marginBottom: '15px'
          }}>
            <div style={{
              width: '80px',
              height: '80px',
              borderRadius: '50%',
              overflow: 'hidden',
              backgroundColor: 'var(--background-color)',
              border: '2px solid var(--border-color)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '32px',
              color: 'var(--text-secondary)'
            }}>
              {avatar ? (
                <img 
                  src={avatar} 
                  alt="Avatar" 
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover'
                  }}
                />
              ) : (
                <span>👤</span>
              )}
            </div>
            
            <div>
              <input
                type="file"
                accept="image/*"
                onChange={handleAvatarChange}
                style={{ display: 'none' }}
                id="avatar-upload"
              />
              <label
                htmlFor="avatar-upload"
                style={{
                  display: 'inline-block',
                  padding: '8px 16px',
                  backgroundColor: '#007bff',
                  color: 'white',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  marginRight: '10px'
                }}
              >
                Choose Image
              </label>
              
              {avatar && (
                <>
                  {avatarFile && (
                    <button
                      onClick={handleAvatarSave}
                      disabled={loading}
                      style={{
                        padding: '8px 16px',
                        backgroundColor: '#28a745',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: loading ? 'not-allowed' : 'pointer',
                        fontSize: '14px',
                        marginRight: '10px',
                        opacity: loading ? 0.6 : 1
                      }}
                    >
                      Save
                    </button>
                  )}
                  
                  <button
                    onClick={removeAvatar}
                    disabled={loading}
                    style={{
                      padding: '8px 16px',
                      backgroundColor: '#dc3545',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: loading ? 'not-allowed' : 'pointer',
                      fontSize: '14px',
                      opacity: loading ? 0.6 : 1
                    }}
                  >
                    Remove
                  </button>
                </>
              )}
            </div>
          </div>
          <p style={{ 
            fontSize: '12px', 
            color: 'var(--text-secondary)', 
            margin: 0 
          }}>
            Supported formats: JPG, PNG, GIF. Max size: 5MB
          </p>
        </div>

        {/* Change Password Section */}
        <div style={{ marginBottom: '20px' }}>
          <h3 style={{ 
            margin: '0 0 15px 0', 
            color: 'var(--text-color)',
            fontSize: '18px'
          }}>
            Change Password
          </h3>
          
          <form onSubmit={handlePasswordChange}>
            <div style={{ marginBottom: '15px' }}>
              <label style={{
                display: 'block',
                marginBottom: '5px',
                fontSize: '14px',
                color: 'var(--text-color)'
              }}>
                Current Password
              </label>
              <input
                type="password"
                value={formData.currentPassword}
                onChange={(e) => handleInputChange('currentPassword', e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px',
                  borderRadius: '4px',
                  border: '1px solid var(--border-color)',
                  fontSize: '14px',
                  backgroundColor: 'var(--input-background)',
                  color: 'var(--text-color)',
                  boxSizing: 'border-box'
                }}
                disabled={loading}
              />
            </div>

            <div style={{ marginBottom: '15px' }}>
              <label style={{
                display: 'block',
                marginBottom: '5px',
                fontSize: '14px',
                color: 'var(--text-color)'
              }}>
                New Password
              </label>
              <input
                type="password"
                value={formData.newPassword}
                onChange={(e) => handleInputChange('newPassword', e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px',
                  borderRadius: '4px',
                  border: '1px solid var(--border-color)',
                  fontSize: '14px',
                  backgroundColor: 'var(--input-background)',
                  color: 'var(--text-color)',
                  boxSizing: 'border-box'
                }}
                disabled={loading}
              />
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{
                display: 'block',
                marginBottom: '5px',
                fontSize: '14px',
                color: 'var(--text-color)'
              }}>
                Confirm New Password
              </label>
              <input
                type="password"
                value={formData.confirmPassword}
                onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px',
                  borderRadius: '4px',
                  border: '1px solid var(--border-color)',
                  fontSize: '14px',
                  backgroundColor: 'var(--input-background)',
                  color: 'var(--text-color)',
                  boxSizing: 'border-box'
                }}
                disabled={loading}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                padding: '10px 20px',
                backgroundColor: '#28a745',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: loading ? 'not-allowed' : 'pointer',
                fontSize: '14px',
                opacity: loading ? 0.6 : 1
              }}
            >
              {loading ? 'Updating...' : 'Update Password'}
            </button>
          </form>
        </div>

        {/* Messages */}
        {error && (
          <div style={{
            backgroundColor: '#fee',
            color: '#c53030',
            padding: '12px',
            borderRadius: '4px',
            fontSize: '14px',
            marginBottom: '15px',
            border: '1px solid #fed7d7'
          }}>
            {error}
          </div>
        )}

        {success && (
          <div style={{
            backgroundColor: '#f0fff4',
            color: '#22543d',
            padding: '12px',
            borderRadius: '4px',
            fontSize: '14px',
            marginBottom: '15px',
            border: '1px solid #9ae6b4'
          }}>
            {success}
          </div>
        )}
      </div>
    </div>
  );
};

export default Profile;
