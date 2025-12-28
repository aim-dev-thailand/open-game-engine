import React from 'react';
import GameScreen from '@/components/GameScreen';
import LoginPage from '@/components/screen/LoginPage';

export default function App() {
  const [username, setUsername] = React.useState("");
  const [role, setRole] = React.useState("user");
  const [page, setPage] = React.useState<"login" | "register" | "game">("login");

  if (page === "game") {
    return <GameScreen username={username} onLogout={() => setPage("login")} role={role} />;
  }
  
  return (
    <LoginPage
      username={username}
      setUsername={setUsername}
      setRole={setRole}
      setIsInGame={() => setPage("game")}
    />
  );
}
