import { useEffect, useState } from 'react';
import { contextAPI } from '../api/api.js';
import {
  DnaIcon, IconMapPin, IconStar, IconTarget,
  IconAlertTriangle, IconClock, IconZap, IconSearch,
} from './Icons.jsx';
import '../styles/context-bonus.css';

const TERRAIN_INFO = {
  ABYSSE: { color: '#38bdf8', bg: '#0369a1', desc: 'Zone aquatique' },
  OLYMPE: { color: '#fbbf24', bg: '#b45309', desc: 'Lieu iconique'  },
  EDEN:   { color: '#4ade80', bg: '#15803d', desc: 'Sanctuaire naturel' },
  NEXUS:  { color: '#f87171', bg: '#b91c1c', desc: 'Carrefour urbain' },
};

/**
 * Affiche les bonus contextuels actifs pour une équipe sur une arène.
 *
 * Props:
 *   areneId  (string, requis)
 *   teamId   (number, optionnel)
 *   compact  (bool, défaut false) — mode réduit pour popup de carte
 */
export default function ContextBonusDisplay({ areneId, teamId, compact = false }) {
  const [ctx, setCtx]         = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!areneId) return;
    setLoading(true);
    contextAPI
      .getArenaContext(areneId, teamId)
      .then(setCtx)
      .catch(() => setCtx(null))
      .finally(() => setLoading(false));
  }, [areneId, teamId]);

  if (loading) return <span className="ctx-spinner" />;
  if (!ctx || !ctx.dnaType || ctx.dnaType === 'NEUTRE') return null;

  const terrain = TERRAIN_INFO[ctx.dnaType];
  const total   = ctx.totalScoreBonus ?? 0;
  const bonuses = buildBonusList(ctx);
  if (bonuses.length === 0 && total === 0) return null;

  /* ── Mode compact (popup carte) ─────────────────────────── */
  if (compact) {
    return (
      <div className="ctx-compact">
        <span className="ctx-compact-terrain" style={{ '--tc': terrain?.color, '--tb': terrain?.bg }}>
          <DnaIcon type={ctx.dnaType} size={14} /> {ctx.dnaType}
        </span>
        {total !== 0 && (
          <span className={`ctx-compact-total ${total < 0 ? 'neg' : ''}`}>
            {total > 0 ? '+' : ''}{Math.round(total * 100)}%
          </span>
        )}
        {ctx.timePeriod && (
          <span className="ctx-compact-time">{ctx.timePeriod}</span>
        )}
      </div>
    );
  }

  /* ── Mode complet ─────────────────────────────────────────── */
  return (
    <div className="ctx-panel" style={{ '--tc': terrain?.color, '--tb': terrain?.bg }}>

      {/* En-tête terrain */}
      <div className="ctx-panel-head">
        <span className="ctx-terrain-icon"><DnaIcon type={ctx.dnaType} size={20} /></span>
        <div className="ctx-terrain-meta">
          <span className="ctx-terrain-name">{ctx.dnaType}</span>
          <span className="ctx-terrain-desc">{terrain?.desc}</span>
        </div>
        {total !== 0 && (
          <span className={`ctx-total-badge ${total < 0 ? 'neg' : ''}`}>
            {total > 0 ? '+' : ''}{Math.round(total * 100)}%
          </span>
        )}
      </div>

      {/* Confiance de classification */}
      {ctx.terrainConfidence > 0 && (
        <div className="ctx-confidence">
          <span className="ctx-confidence-bar" style={{ '--conf': confidenceRatio(ctx.terrainConfidence) }} />
          <span className="ctx-confidence-label">
            Confiance {confidencePercent(ctx.terrainConfidence)}%
            {ctx.nearbyPlacesCount > 0 && ` · ${ctx.nearbyPlacesCount} lieux`}
          </span>
        </div>
      )}

      {/* Liste des bonus */}
      {bonuses.length > 0 && (
        <ul className="ctx-bonus-list">
          {bonuses.map((b, i) => (
            <li key={i} className={`ctx-bonus-item ${b.type}`}>
              <span className="ctx-bonus-icon">{b.icon}</span>
              <span className="ctx-bonus-label">{b.label}</span>
              <span className="ctx-bonus-value">
                {b.value > 0 ? '+' : ''}{Math.round(b.value * 100)}%
              </span>
            </li>
          ))}
        </ul>
      )}

      {/* Terrain Mastery actif */}
      {ctx.masteryActive && (
        <div className="ctx-mastery-banner">
          <IconZap size={14} />
          <span>Terrain Mastery actif — {ctx.masteryRemainingMinutes} min restantes</span>
        </div>
      )}

      {/* Aura de l'équipe si connue mais pas de synergie */}
      {ctx.teamAura && !ctx.aurasynergy && (
        <div className="ctx-aura-hint">
          Aura active : <strong>{ctx.teamAura}</strong> — pas de synergie ici
        </div>
      )}

      {/* Preuves Google Places */}
      {ctx.topEvidence && (
        <div className="ctx-evidence">
          <div className="ctx-evidence-header">
            <IconSearch size={12} /> Classifié depuis
          </div>
          {parseEvidenceItems(ctx.topEvidence)
            .filter((e) => !isNoiseEvidenceType(e.placeType))
            .slice(0, 3)
            .map((e, i) => (
            <div key={i} className="ctx-evidence-item">
              <span className="ctx-evidence-place">{e.name}</span>
              {e.placeType && <span className="ctx-evidence-type"> · {e.placeType}</span>}
              {e.distance && <span className="ctx-evidence-distance"> ({e.distance})</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Helpers ─────────────────────────────────────────────────── */

function buildBonusList(ctx) {
  const list = [];

  if (ctx.geoBonus > 0)
    list.push({ icon: <IconMapPin size={14} />, label: 'Bonus terrain', value: ctx.geoBonus, type: 'geo' });

  if (ctx.timeBonus > 0)
    list.push({ icon: <IconClock size={14} />, label: ctx.timePeriod ?? 'Bonus temporel', value: ctx.timeBonus, type: 'time' });

  if (ctx.masteryBonus > 0)
    list.push({ icon: <IconZap size={14} />, label: 'Terrain Mastery', value: ctx.masteryBonus, type: 'mastery' });

  if (ctx.aurasynergy && ctx.synergyBonus > 0)
    list.push({ icon: <IconStar size={14} />, label: `Synergie Aura (${ctx.teamAura})`, value: ctx.synergyBonus, type: 'aura' });

  if (ctx.affinityMatch && ctx.affinityBonus > 0)
    list.push({ icon: <IconTarget size={14} />, label: `Affinité ${ctx.teamAffinity}`, value: ctx.affinityBonus, type: 'affinity' });

  if (ctx.opposedTerrain && ctx.affinityBonus < 0)
    list.push({ icon: <IconAlertTriangle size={14} />, label: `Terrain opposé (affinité ${ctx.teamAffinity})`, value: ctx.affinityBonus, type: 'opposed' });

  return list;
}

function parseEvidenceItems(rawEvidence) {
  if (!rawEvidence || typeof rawEvidence !== 'string') return [];

  const normalized = rawEvidence.includes(' — ')
    ? rawEvidence.split(' — ').slice(1).join(' — ')
    : rawEvidence;

  let chunks = [];
  if (normalized.includes('|')) {
    chunks = normalized.split('|');
  } else {
    const matches = normalized.match(/[^|]+?\([^)]*\)/g);
    chunks = matches && matches.length > 0 ? matches : [normalized];
  }

  return chunks
    .map((c) => c.trim().replace(/^,\s*/, ''))
    .filter(Boolean)
    .map((item) => {
      const newFmt = item.match(/^(.*)\(([^,()]+)(?:,\s*([0-9]+m))?\)\s*$/);
      if (newFmt) {
        return {
          name: newFmt[1].trim(),
          placeType: newFmt[2].trim(),
          distance: newFmt[3]?.trim() || null,
        };
      }

      const oldFmt = item.match(/^(.*?)\s*\[([^\]]+)\]\s*→\s*([A-Z_]+)/);
      if (oldFmt) {
        return {
          name: oldFmt[1].trim(),
          placeType: oldFmt[2].replace(/^NAME:/, 'nom').trim(),
          distance: null,
        };
      }

      return { name: item, placeType: null, distance: null };
    });
}

function isNoiseEvidenceType(placeType) {
  if (!placeType) return false;
  const t = String(placeType).toLowerCase();
  return t === 'health';
}

function confidenceRatio(value) {
  if (value == null || Number.isNaN(Number(value))) return 0;
  const n = Number(value);
  if (n <= 1) return Math.max(0, n);
  if (n <= 100) return Math.min(1, n / 100);
  return 1;
}

function confidencePercent(value) {
  return Math.round(confidenceRatio(value) * 100);
}
