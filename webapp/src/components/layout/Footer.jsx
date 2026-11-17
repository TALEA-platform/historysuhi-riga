// EU funding compliance footer: TALEA logo, project and co-funding lines, link to the project site.

import { ExternalLink } from "lucide-react";
import { getLanguageCopy } from "../../i18n/config.js";
import { useI18n } from "../../i18n/useI18n.js";

const logoUrl = new URL(
  "../../../docs/Copia di LOGO TALEA COLORI SFONDO BIANCO_CMYK.png",
  import.meta.url,
).href;

export function Footer() {
  const { language } = useI18n();
  const copy = getLanguageCopy(language, {
    lv: {
      projectLine: "Talea projekts · Rīgas pašvaldība · European Urban Initiative",
      fundingLine: "Līdzfinansē Eiropas Savienība",
      linkAriaLabel: "Atvērt TALEA projekta vietni",
    },
    it: {
      projectLine: "Progetto Talea · Comune di Riga · European Urban Initiative",
      fundingLine: "Cofinanziato dall'Unione europea",
      linkAriaLabel: "Apri il sito del progetto TALEA",
    },
    en: {
      projectLine: "Talea Project · Municipality of Riga · European Urban Initiative",
      fundingLine: "Co-funded by the European Union",
      linkAriaLabel: "Open the TALEA project website",
    },
  });
  return (
    <footer className="footer">
      <div className="footer-inner">
        <img className="footer-logo" src={logoUrl} alt="TALEA" />
        <div className="footer-text">
          <span>{copy.projectLine}</span>
          <strong>{copy.fundingLine}</strong>
        </div>
        <a
          className="footer-link"
          href="https://talea.eu-initiative.eu"
          target="_blank"
          rel="noopener noreferrer"
          aria-label={copy.linkAriaLabel}
        >
          <ExternalLink size={14} aria-hidden="true" />
          talea.eu-initiative.eu
        </a>
      </div>
    </footer>
  );
}
