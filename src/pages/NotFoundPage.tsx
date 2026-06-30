import { ArrowLeft, Home, SearchX } from "lucide-react";
import { Link } from "react-router-dom";
import { useApp } from "../state/AppContext";

export const NotFoundPage = () => {
  const { user } = useApp();
  const primaryTarget = user ? "/dashboard" : "/login";

  return (
    <main className="not-found-page">
      <section className="not-found-card" aria-labelledby="not-found-title">
        <SearchX size={42} aria-hidden="true" />
        <span className="eyebrow">Stran ni najdena</span>
        <h1 id="not-found-title">Ta povezava ne obstaja ali ni več veljavna.</h1>
        <p>
          Preverite naslov v brskalniku. Če ste uporabili QR povezavo, se
          obrnite na osebje ali se vrnite v delovni pregled.
        </p>
        <div className="heading-actions">
          <Link className="button button-primary" to={primaryTarget}>
            <Home size={18} aria-hidden="true" />
            {user ? "Na nadzorno ploščo" : "Na prijavo"}
          </Link>
          <Link className="button button-secondary" to="/about">
            <ArrowLeft size={18} aria-hidden="true" />
            O sistemu
          </Link>
        </div>
      </section>
    </main>
  );
};
