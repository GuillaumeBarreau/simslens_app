import { Select as MantineSelect, SelectProps as MantineSelectProps } from '@mantine/core';
import React from 'react';

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectProps extends Omit<MantineSelectProps, 'data'> {
  data: SelectOption[] | string[];
  value?: string | null;
  onChange?: (value: string | null) => void;
  placeholder?: string;
  label?: string;
  searchable?: boolean;
  clearable?: boolean;
  disabled?: boolean;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
}

export const Select: React.FC<SelectProps> = ({
  data,
  value,
  onChange,
  placeholder,
  label,
  searchable = false,
  clearable = false,
  disabled = false,
  size = 'md',
  ...props
}) => {
  return (
    <MantineSelect
      data={data}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      label={label}
      searchable={searchable}
      clearable={clearable}
      disabled={disabled}
      size={size}
      {...props}
    />
  );
};
