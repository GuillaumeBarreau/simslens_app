import { createTheme, MantineTheme } from '@mantine/core';

export const theme = createTheme({
  colors: {
    deepBlue: [
      '#eef3ff',
      '#dce4f5',
      '#b9c7e2',
      '#94a8d0',
      '#748dc1',
      '#5f7cb8',
      '#5474b4',
      '#44639f',
      '#39588f',
      '#2d4b81',
    ],
    brand: [
      '#f5ebf7',
      '#e5d1ea',
      '#d4b5dd',
      '#c399d0',
      '#b27dc3',
      '#9e45a1',
      '#84318d',
      '#6d2676',
      '#5a2161',
      '#4c2750',
    ],
    app: [
      '#f5f5f5',
      '#e0e0e0',
      '#bdbdbd',
      '#9e9e9e',
      '#757575',
      '#616161',
      '#2A2A2B',
      '#1C1D20',
      '#121316',
      '#0A0A0C',
    ],
  },

  shadows: {
    md: '1px 1px 3px rgba(0, 0, 0, .25)',
    xl: '5px 5px 3px rgba(0, 0, 0, .25)',
  },

  headings: {
    fontFamily: 'Roboto, sans-serif',
    sizes: {
      h1: { fontSize: '36px' },
    },
  },

  components: {
    Drawer: {
      styles: (theme: MantineTheme) => ({
        content: {
          backgroundColor: theme.colors.app[7],
          padding: '20px',
        },
        header: {
          backgroundColor: theme.colors.app[7],
        },
      }),
    },
    Modal: {
      styles: (theme: MantineTheme) => ({
        content: {
          backgroundColor: theme.colors.app[7],
        },
        header: {
          backgroundColor: theme.colors.app[7],
        },
      }),
    },
  },
});
