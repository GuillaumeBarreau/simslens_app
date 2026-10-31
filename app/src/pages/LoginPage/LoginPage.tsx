import { Button, Center, Container, Image, Paper, Stack, Text, Title } from '@mantine/core';
import { useAuth } from 'contexts';
import { useState } from 'react';
import { Navigate } from 'react-router-dom';

const LoginPage = () => {
  const { isAuthenticated, login } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  if (isAuthenticated) {
    return <Navigate to="/redirect" replace />;
  }

  const handleLogin = () => {
    setIsLoading(true);
    login();
  };

  return (
    <Container
      size={420}
      my={40}
      style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', height: '80vh' }}
    >
      <Center mb="xl">
        <Image src="/src/happy-character.png" w={280} fit="contain" alt="Welcome Character" />
      </Center>
      <Paper radius="md" p="xl" withBorder>
        <Title order={2} ta="center" mt="md" mb="md">
          Welcome to Droptimizer
        </Title>
        <Text c="dimmed" size="sm" ta="center" mb="xl">
          Please sign in with Battle.net to access the application
        </Text>

        <Stack>
          <Button
            size="lg"
            fullWidth
            leftSection={
              <img
                src="/src/Battlenet_icon.svg"
                alt="Battle.net"
                style={{ width: 32, height: 32 }}
              />
            }
            onClick={handleLogin}
            loading={isLoading}
            color="#148eff"
          >
            Sign in with Battle.net
          </Button>
        </Stack>
      </Paper>
    </Container>
  );
};

export default LoginPage;
