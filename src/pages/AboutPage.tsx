import {
  ArrowRight,
  BadgeInfo,
  ClipboardList,
  Eye,
  Monitor,
  ShieldCheck,
  Stethoscope,
} from "lucide-react";
import { Link } from "react-router-dom";
import { useApp } from "../state/AppContext";

const explanationItems = [
  {
    icon: ClipboardList,
    title: "Komunikacijski sloj za čakalnico",
    text: "Sistem ne nadomešča ambulantnega informacijskega sistema. Namenjen je prijavi, usmerjanju in obveščanju o statusu čakanja.",
  },
  {
    icon: Eye,
    title: "Več vidljivosti za osebje in pacienta",
    text: "Osebje vidi tok pacientov po oddelkih, pacient pa prek listka ali QR povezave spremlja svojo številko, status in sobo.",
  },
  {
    icon: ShieldCheck,
    title: "Brez prikaza občutljivih podatkov",
    text: "Javni zaslon prikazuje samo številko pacienta in sobo. V nadzorni plošči so uporabljene začetnice, ne polna imena.",
  },
  {
    icon: Stethoscope,
    title: "Primerno za manjše zdravstvene procese",
    text: "Primer uporabe pokriva laboratorij, ambulante, diagnostiko, administrativni sprejem in splošne čakalnice.",
  },
];

export const AboutPage = () => {
  const { settings, user } = useApp();

  return (
    <main className="content about-content page-stack">
      <section className="product-hero panel">
        <div>
          <span className="eyebrow">O sistemu</span>
          <h1>{settings.institutionName} lahko vodi čakalnico bolj pregledno.</h1>
          <p>
            Pametni čakalni sistem je demonstracijski produkt za komunikacijo med
            sprejemom, osebjem, javnim prikazom in pacientom. Zasnovan je kot
            praktičen sloj nad obstoječimi zdravstvenimi postopki, ne kot
            medicinska diagnoza ali uradno eNaročanje.
          </p>
          <div className="heading-actions">
            <Link className="button button-primary" to={user ? "/dashboard" : "/login"}>
              Odpri delovni pregled
              <ArrowRight size={18} aria-hidden="true" />
            </Link>
            <button
              className="button button-secondary"
              type="button"
              onClick={() => window.open("/display", "_blank")}
            >
              <Monitor size={18} aria-hidden="true" />
              Javni zaslon
            </button>
          </div>
        </div>
        <aside className="product-proof">
          <div className="brand-mark">{settings.logoText}</div>
          <strong>Čakalnica brez nepotrebnega spraševanja</strong>
          <span>Pacient vidi svojo številko. Osebje vidi tok. Zaslon ostane anonimen.</span>
        </aside>
      </section>

      <section className="product-grid">
        {explanationItems.map((item) => {
          const Icon = item.icon;
          return (
            <article className="product-card" key={item.title}>
              <Icon size={24} aria-hidden="true" />
              <h2>{item.title}</h2>
              <p>{item.text}</p>
            </article>
          );
        })}
      </section>

      <section className="panel product-note">
        <BadgeInfo size={24} aria-hidden="true" />
        <div>
          <h2>Pomembna omejitev prototipa</h2>
          <p>
            Sistem ni medicinska diagnoza, ni uradno eNaročanje in ni nadomestilo
            za potrjene zdravstvene informacijske sisteme. Namenjen je prikazu
            čakalniškega toka, osnovnemu obveščanju in boljši organizaciji dela.
          </p>
        </div>
      </section>
    </main>
  );
};
