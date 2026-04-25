import { useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useNavigate, Link } from "react-router-dom";

const TEST_ACCOUNTS = [
  { email: "alice@test.com", password: "test1234" },
  { email: "bob@test.com", password: "test1234" },
  { email: "charlie@test.com", password: "test1234" },
];

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const { login } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    try {
      await login(email, password);
      navigate("/lobby");
    } catch (err) {
      setError(err.message);
    }
  }

  function fillCredentials(acc) {
    setEmail(acc.email);
    setPassword(acc.password);
  }

  return (
    <div className="auth-page">
      <h1>Le Pouilleux</h1>
      <form onSubmit={handleSubmit}>
        <h2>Connexion</h2>
        {error && <p className="error">{error}</p>}
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <input
          type="password"
          placeholder="Mot de passe"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <button type="submit">Se connecter</button>
        <p className="switch-link">
          Pas de compte ? <Link to="/register">S'inscrire</Link>
        </p>
      </form>

      <div className="test-accounts">
        <p className="test-accounts-title">Comptes de test</p>
        <p className="test-accounts-hint">Clique pour remplir le formulaire</p>
        <div className="test-accounts-list">
          {TEST_ACCOUNTS.map((acc) => (
            <button
              key={acc.email}
              type="button"
              className="test-account"
              onClick={() => fillCredentials(acc)}
            >
              <span className="test-account-email">{acc.email}</span>
              <span className="test-account-pwd">{acc.password}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
