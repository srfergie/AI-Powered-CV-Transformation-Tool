import React, { useState, useEffect } from 'react';

const EditableField = ({
    value,
    onChange,
    isEditing = false,
    multiline = false,
    placeholder = '',
    style = {},
    validation = null,
    type = 'text'
}) => {
    const [internalValue, setInternalValue] = useState(value || '');
    const [isValid, setIsValid] = useState(true);
    const [isFocused, setIsFocused] = useState(false);

    useEffect(() => {
        setInternalValue(value || '');
    }, [value]);

    const handleChange = (e) => {
        const newValue = e.target.value;
        setInternalValue(newValue);

        // Validate if validation function is provided
        if (validation) {
            const validationResult = validation(newValue);
            setIsValid(validationResult.isValid || true);
        }

        if (onChange) {
            onChange(newValue);
        }
    };

    const handleBlur = () => {
        setIsFocused(false);
    };

    const handleFocus = () => {
        setIsFocused(true);
    };

    const baseStyle = {
        border: 'none',
        background: 'transparent',
        font: 'inherit',
        color: 'inherit',
        padding: '4px',
        margin: '0',
        outline: 'none',
        width: '100%',
        ...style
    };

    const editingStyle = {
        ...baseStyle,
        border: `1px solid ${isValid ? (isFocused ? '#3498db' : '#bdc3c7') : '#e74c3c'}`,
        borderRadius: '4px',
        backgroundColor: isFocused ? '#f8f9fa' : '#ffffff',
        padding: multiline ? '8px' : '4px 8px',
        transition: 'all 0.2s ease-in-out',
        boxShadow: isFocused ? '0 0 5px rgba(52, 152, 219, 0.3)' : 'none'
    };

    const readOnlyStyle = {
        ...baseStyle,
        cursor: 'default',
        borderRadius: '4px',
        padding: multiline ? '8px' : '4px'
    };

    if (!isEditing) {
        return (
            <span style={readOnlyStyle}>
                {value || (placeholder && <em style={{ color: '#95a5a6', fontStyle: 'italic' }}>{placeholder}</em>)}
            </span>
        );
    }

    const inputProps = {
        value: internalValue,
        onChange: handleChange,
        onBlur: handleBlur,
        onFocus: handleFocus,
        placeholder: placeholder,
        style: editingStyle,
        type: type
    };

    if (multiline) {
        return (
            <div style={{ position: 'relative' }}>
                <textarea
                    {...inputProps}
                    rows={Math.max(2, Math.ceil(internalValue.length / 60))}
                    style={{
                        ...editingStyle,
                        resize: 'vertical',
                        minHeight: '60px',
                        maxHeight: '200px'
                    }}
                />
                {!isValid && (
                    <div style={{
                        color: '#e74c3c',
                        fontSize: '12px',
                        marginTop: '2px',
                        fontStyle: 'italic'
                    }}>
                        Invalid input
                    </div>
                )}
            </div>
        );
    }

    return (
        <div style={{ position: 'relative', display: 'inline-block', width: '100%' }}>
            <input {...inputProps} />
            {!isValid && (
                <div style={{
                    color: '#e74c3c',
                    fontSize: '12px',
                    marginTop: '2px',
                    fontStyle: 'italic',
                    position: 'absolute',
                    top: '100%',
                    left: '0',
                    whiteSpace: 'nowrap'
                }}>
                    Invalid input
                </div>
            )}
        </div>
    );
};

// Common validation functions that can be used with the component
export const validators = {
    email: (value) => ({
        isValid: !value || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value),
        message: 'Please enter a valid email address'
    }),

    phone: (value) => ({
        isValid: !value || /^[\+]?[1-9][\d]{0,15}$/.test(value.replace(/[\s\-\(\)]/g, '')),
        message: 'Please enter a valid phone number'
    }),

    url: (value) => ({
        isValid: !value || /^https?:\/\/.+/.test(value),
        message: 'Please enter a valid URL starting with http:// or https://'
    }),

    required: (value) => ({
        isValid: value && value.trim().length > 0,
        message: 'This field is required'
    }),

    date: (value) => ({
        isValid: !value || /^\d{4}-\d{2}-\d{2}$/.test(value) || /^\d{4}$/.test(value),
        message: 'Please enter a valid date (YYYY-MM-DD or YYYY)'
    })
};

export default EditableField;
