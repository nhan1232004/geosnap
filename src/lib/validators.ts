// Schema validation helpers

export interface ValidationResult<T> {
  valid: boolean;
  data?: T;
  error?: string;
}

export const Validators = {
  email: (email: string): boolean => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  },

  password: (password: string): boolean => {
    // Minimum 6 characters
    return password.length >= 6;
  },

  userProfile: (data: any): ValidationResult<any> => {
    const errors: string[] = [];

    if (!data.uid || typeof data.uid !== 'string') {
      errors.push('Invalid UID');
    }
    if (!data.email || !Validators.email(data.email)) {
      errors.push('Invalid email');
    }
    if (data.displayName && typeof data.displayName !== 'string') {
      errors.push('Invalid displayName');
    }
    if (data.role && !['admin', 'user'].includes(data.role)) {
      errors.push('Invalid role');
    }

    return {
      valid: errors.length === 0,
      data: errors.length === 0 ? data : undefined,
      error: errors.length > 0 ? errors.join(', ') : undefined,
    };
  },

  loginData: (email: string, password: string): ValidationResult<{ email: string; password: string }> => {
    const errors: string[] = [];

    if (!Validators.email(email)) {
      errors.push('Invalid email format');
    }
    if (!Validators.password(password)) {
      errors.push('Password must be at least 6 characters');
    }

    return {
      valid: errors.length === 0,
      data: errors.length === 0 ? { email, password } : undefined,
      error: errors.length > 0 ? errors.join(', ') : undefined,
    };
  },

  registerData: (email: string, password: string, displayName: string): ValidationResult<any> => {
    const errors: string[] = [];

    if (!Validators.email(email)) {
      errors.push('Invalid email format');
    }
    if (!Validators.password(password)) {
      errors.push('Password must be at least 6 characters');
    }
    if (!displayName || displayName.trim().length === 0) {
      errors.push('Name is required');
    }
    if (displayName && displayName.length > 100) {
      errors.push('Name is too long');
    }

    return {
      valid: errors.length === 0,
      data: errors.length === 0 ? { email, password, displayName } : undefined,
      error: errors.length > 0 ? errors.join(', ') : undefined,
    };
  },
};
