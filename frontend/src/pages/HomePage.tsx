import { User } from '../App';

export function HomePage({ user, onLogout }: { user: User; onLogout: () => void }) {
  return (
    <div>
      <h1>Hello, {user.name}!</h1>
      <p>You are logged in as: {user.role}</p>
      <button onClick={onLogout}>Log out</button>
    </div>
  );
}
