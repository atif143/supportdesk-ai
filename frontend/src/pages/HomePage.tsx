import { User } from '../App';

export function HomePage({ user }: { user: User }) {
  return (
    <div>
      <h1>Hello, {user.name}!</h1>
      <p>You are logged in as: {user.role}</p>
    </div>
  );
}
