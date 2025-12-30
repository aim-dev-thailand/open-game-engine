import React from 'react';
import GameScreen from '@/components/GameScreen';
import LoginPage from '@/components/screen/LoginPage';
import Register from '@/components/screen/Register';
import CharacterList from '@/components/screen/CharacterList';
import CreateCharacter from '@/components/screen/CreateCharacter';

type Page = "login" | "register" | "characterList" | "createCharacter" | "game";

import { CharacterData } from '@/model/character';

export default function App() {
  const [username, setUsername] = React.useState("");
  const [role, setRole] = React.useState("user");
  const [selectedCharacter, setSelectedCharacter] = React.useState<CharacterData | null>(null);
  const [page, setPage] = React.useState<Page>("login");

  if (page === "game") {
    if (!selectedCharacter) {
      return (
        <CharacterList
          username={username}
          onSelectCharacter={(character) => {
            setSelectedCharacter(character);
            setPage("game");
          }}
          onCreateNewCharacter={() => setPage("createCharacter")}
          onLogout={() => {
            setPage("login");
            setUsername("");
            setRole("user");
            setSelectedCharacter(null);
          }}
        />
      );
    }
    return <GameScreen username={username} character={selectedCharacter} onLogout={() => {
      setPage("characterList");
      setSelectedCharacter(null);
    }} role={role} />;
  }

  if (page === "createCharacter") {
    return (
      <CreateCharacter
        username={username}
        onCharacterCreated={() => setPage("characterList")}
        onBackToCharacterList={() => setPage("characterList")}
      />
    );
  }

  if (page === "characterList") {
    return (
      <CharacterList
        username={username}
        onSelectCharacter={(character) => {
          setSelectedCharacter(character);
          setPage("game");
        }}
        onCreateNewCharacter={() => setPage("createCharacter")}
        onLogout={() => {
          setPage("login");
          setUsername("");
          setRole("user");
          setSelectedCharacter(null);
        }}
      />
    );
  }

  if (page === "register") {
    return (
      <Register
        onBackToLogin={() => setPage("login")}
        onRegisterSuccess={(newUsername, newRole) => {
          setUsername(newUsername);
          setRole(newRole);
          setPage("characterList");
        }}
      />
    );
  }

  return (
    <LoginPage
      username={username}
      setUsername={setUsername}
      setRole={setRole}
      setIsInGame={() => setPage("characterList")}
      onGoToRegister={() => setPage("register")}
    />
  );
}
