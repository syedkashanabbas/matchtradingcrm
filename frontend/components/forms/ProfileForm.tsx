'use client';

import { useState } from 'react';
import { Save, X } from 'lucide-react';
import { UserAvatar } from '@/components/shared/UserAvatar';
import { apiClient } from '@/lib/api';
import { useAuthContext } from '@/lib/auth-context';
import type { CurrentUser } from '@/lib/types';

interface ProfileFormProps {
  user: CurrentUser;
}

export function ProfileForm({ user }: ProfileFormProps) {
  const { updateUser } = useAuthContext();
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    phone: user.phone || '',
    company: user.company || '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.firstName.trim()) newErrors.firstName = 'First name is required';
    if (!formData.lastName.trim()) newErrors.lastName = 'Last name is required';
    if (!formData.email.includes('@')) newErrors.email = 'Valid email is required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    setIsSaving(true);
    setError('');

    try {
      const response = await apiClient.updateProfile({
        firstName: formData.firstName,
        lastName: formData.lastName,
        phone: formData.phone,
        company: formData.company,
      });

      // Update user in context
      if (updateUser && response.user) {
        const updatedUser = {
          ...user,
          firstName: response.user.firstName,
          lastName: response.user.lastName,
          phone: response.user.phone,
          company: response.user.company,
          name: `${response.user.firstName} ${response.user.lastName}`,
        };
        updateUser(updatedUser);
      }

      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
      setIsEditing(false);
    } catch (err: any) {
      console.error('Profile update error:', err);
      setError(err.message || 'Failed to update profile');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setFormData({
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      phone: user.phone || '',
      company: user.company || '',
    });
    setErrors({});
    setIsEditing(false);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const FormField = ({
    label,
    name,
    value,
    placeholder,
    type = 'text',
  }: any) => (
    <div className="space-y-2">
      <label htmlFor={name} className="block text-sm font-medium text-foreground">
        {label}
      </label>
      {isEditing ? (
        <div>
          <input
            id={name}
            name={name}
            type={type}
            value={value}
            onChange={handleChange}
            placeholder={placeholder}
            disabled={isSaving}
            className={`w-full rounded-lg border px-4 py-2.5 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all disabled:opacity-50 ${
              errors[name]
                ? 'border-red-500 focus:border-red-500'
                : 'border-input bg-background focus:border-primary'
            }`}
          />
          {errors[name] && (
            <p className="text-xs text-red-600 dark:text-red-400 mt-1">
              {errors[name]}
            </p>
          )}
        </div>
      ) : (
        <div className="rounded-lg border border-border bg-muted/50 px-4 py-2.5 text-foreground">
          {value || placeholder}
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Toast */}
      {showToast && (
        <div className="rounded-lg border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/20 p-4 text-sm text-emerald-700 dark:text-emerald-400 flex items-center gap-2">
          <span>✓</span> Profile updated successfully
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 p-4 text-sm text-red-700 dark:text-red-400 flex items-center gap-2">
          <span>✗</span> {error}
        </div>
      )}

      {/* Avatar */}
      <div className="flex items-center gap-6">
        <UserAvatar
          src={user.avatar}
          name={user.name}
          size="xl"
        />
        <div>
          <h3 className="text-lg font-semibold text-foreground">{user.name}</h3>
          <p className="text-sm text-muted-foreground">{user.email}</p>
          {!isEditing && (
            <button
              onClick={() => setIsEditing(true)}
              className="mt-3 text-sm text-primary hover:underline font-medium"
            >
              Edit Profile
            </button>
          )}
        </div>
      </div>

      {/* Form */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <FormField
          label="First Name"
          name="firstName"
          value={formData.firstName}
          placeholder="John"
        />
        <FormField
          label="Last Name"
          name="lastName"
          value={formData.lastName}
          placeholder="Doe"
        />
        <FormField
          label="Email Address"
          name="email"
          type="email"
          value={formData.email}
          placeholder="john@example.com"
        />
        <FormField
          label="Phone Number"
          name="phone"
          type="tel"
          value={formData.phone}
          placeholder="+1 (555) 000-0000"
        />
        <FormField
          label="Company"
          name="company"
          value={formData.company}
          placeholder="Your Company"
        />
      </div>

      {/* Actions */}
      {isEditing && (
        <div className="flex gap-3 pt-4">
          <button
            onClick={handleCancel}
            disabled={isSaving}
            className="flex-1 rounded-lg border border-input px-4 py-2.5 font-medium text-foreground transition-colors hover:bg-muted disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <X className="h-4 w-4" />
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex-1 rounded-lg bg-primary px-4 py-2.5 font-medium text-primary-foreground transition-all hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isSaving ? (
              <>
                <div className="h-4 w-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                Save Changes
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
