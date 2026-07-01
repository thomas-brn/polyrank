import { ArrowRight, Calendar, Clock, MapPin } from "lucide-react";

import type { Mode } from "@/lib/mode";

export type MatchParticipant = {
  side: "A" | "B";
  is_creator: boolean;
  guest_name: string | null;
  profile_id: string | null;
  profiles: { pseudo: string | null } | null;
};

export type MatchData = {
  id: string;
  format: string;
  status: string;
  is_friendly: boolean;
  winner_side: "A" | "B" | "NUL";
  score_a: number | null;
  score_b: number | null;
  played_at: string;
  location: string | null;
  games: { name: string; has_score: boolean } | null;
  match_participants: MatchParticipant[];
};

export const STATUS: Record<string, { label: string; className: string }> = {
  VALIDE:  { label: "Validé",    className: "bg-green-100 text-green-700" },
  CONTESTE:{ label: "Contesté",  className: "bg-red-100 text-red-700" },
  EN_APPEL:{ label: "En appel",  className: "bg-amber-100 text-amber-700" },
};

export function sideNames(participants: MatchParticipant[], side: "A" | "B") {
  const list = participants
    .filter((p) => p.side === side)
    .map((p) => p.profiles?.pseudo ?? p.guest_name ?? "?");
  return list.length ? list.join(" & ") : "?";
}

export type SidePlayer = { name: string; tagged: boolean };

export function sidePlayers(participants: MatchParticipant[], side: "A" | "B"): SidePlayer[] {
  const list = participants
    .filter((p) => p.side === side)
    .map((p) => ({
      name: p.profiles?.pseudo ?? p.guest_name ?? "?",
      tagged: p.profile_id !== null,
    }));
  return list.length ? list : [{ name: "?", tagged: false }];
}

// TODO: photos de profil — réactiver avec Supabase Storage
// function initials(name: string): string {
//   const parts = name.trim().split(/[\s_-]+/);
//   if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
//   return name.slice(0, 2).toUpperCase();
// }

export const PANEL_COLORS = {
  win: {
    coincoin: {
      bg: "bg-green-100",
      label: "text-green-600",
      name: "text-green-900",
      avatar: "border-green-600 text-green-700",
    },
    fifachamp: {
      bg: "bg-blue-100",
      label: "text-blue-600",
      name: "text-blue-900",
      avatar: "border-blue-600 text-blue-700",
    },
  },
  loss: {
    bg: "bg-red-100",
    label: "text-red-400",
    name: "text-red-800",
    avatar: "border-red-500 text-red-600",
  },
  draw: {
    bg: "bg-slate-100",
    label: "text-slate-400",
    name: "text-slate-700",
    avatar: "border-slate-400 text-slate-500",
  },
};

// Match cell background for the personal history view (/profil): a shade darker
// than PANEL_COLORS so the inner team panels read as a lighter tint of the same hue.
// `border`/`vsText`/`vsBar` are a further shade darker, for the cell outline and the VS divider.
export const CARD_COLORS = {
  win: {
    coincoin: { bg: "bg-green-200", hoverBg: "hover:bg-green-300", border: "border-green-300", vsText: "text-green-700", vsBar: "bg-green-400" },
    fifachamp: { bg: "bg-blue-200", hoverBg: "hover:bg-blue-300", border: "border-blue-300", vsText: "text-blue-700", vsBar: "bg-blue-400" },
  },
  loss: { bg: "bg-red-200", hoverBg: "hover:bg-red-300", border: "border-red-300", vsText: "text-red-700", vsBar: "bg-red-400" },
  draw: { bg: "bg-slate-200", hoverBg: "hover:bg-slate-300", border: "border-slate-300", vsText: "text-slate-600", vsBar: "bg-slate-400" },
};

function resultFor(match: MatchData, side: "A" | "B"): "win" | "loss" | "draw" {
  if (match.winner_side === "NUL") return "draw";
  return match.winner_side === side ? "win" : "loss";
}

function Panel({
  players,
  result,
  colorResult = result,
  mode,
  align,
}: {
  players: SidePlayer[];
  result: "win" | "loss" | "draw";
  colorResult?: "win" | "loss" | "draw";
  mode: Mode;
  align: "left" | "right";
}) {
  const colors =
    colorResult === "win"
      ? PANEL_COLORS.win[mode]
      : colorResult === "loss"
        ? PANEL_COLORS.loss
        : PANEL_COLORS.draw;

  const label = result === "win" ? "Victoire" : result === "loss" ? "Défaite" : "Nul";
  const multi = players.length > 1;
  // const avatarSize = multi
  //   ? "size-5 text-[10px] sm:size-6 sm:text-[11px]"
  //   : "size-6 text-[11px] sm:size-7 sm:text-[12px]";
  const nameSize = multi ? "text-[12px] sm:text-[14px]" : "text-[13px] sm:text-[15px]";
  // Names sit next to the VS divider: right-aligned in the left cell, left-aligned in the right cell.
  const namesNearVs = align === "left" ? "items-end" : "items-start";

  return (
    <div className={`${colors.bg} rounded-lg px-2 py-1.5 sm:px-2.5 sm:py-2 relative flex flex-col justify-center`}>
      <span
        className={`absolute top-1.5 sm:top-2 ${align === "right" ? "right-2 sm:right-2.5 text-right" : "left-2 sm:left-2.5"} text-[9px] sm:text-[10px] font-semibold uppercase tracking-[0.1em] ${colors.label} opacity-70`}
      >
        {label}
      </span>

      <div className={`flex flex-col gap-1 sm:gap-1.5 ${namesNearVs}`}>
        {players.map(({ name, tagged }) => (
          <div
            key={name}
            className={`flex items-center gap-1.5 ${align === "right" ? "flex-row-reverse" : ""}`}
          >
            {/* TODO: photos de profil
            <div
              className={`${avatarSize} rounded-full bg-white border-[1.5px] ${colors.avatar} flex items-center justify-center font-medium shrink-0`}
            >
              {initials(name)}
            </div>
            */}
            {tagged ? (
              <strong className={`${nameSize} font-semibold ${colors.name} leading-tight`}>
                {name}
              </strong>
            ) : (
              <em className={`${nameSize} font-normal ${colors.name} leading-tight opacity-70`}>
                {name}
              </em>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function CardInner({
  match,
  mode,
  leftSide,
  from,
}: {
  match: MatchData;
  mode: Mode;
  leftSide: "A" | "B";
  from?: string;
}) {
  const rightSide: "A" | "B" = leftSide === "A" ? "B" : "A";

  const leftResult = resultFor(match, leftSide);
  const rightResult = resultFor(match, rightSide);

  // In the personal history view (/profil), leftSide is always the profile
  // owner: tint both team panels with their result rather than each side's own.
  const isProfile = from === "profil";
  const sharedColorResult = isProfile ? leftResult : undefined;
  const vsColors = isProfile
    ? leftResult === "win"
      ? CARD_COLORS.win[mode]
      : leftResult === "loss"
        ? CARD_COLORS.loss
        : CARD_COLORS.draw
    : null;
  const infoTextClass = vsColors?.vsText ?? "text-slate-400";

  const leftScore = leftSide === "A" ? match.score_a : match.score_b;
  const rightScore = leftSide === "A" ? match.score_b : match.score_a;

  const dt = new Date(match.played_at);
  const date = dt.toLocaleDateString("fr-FR", { day: "2-digit", month: "short" });
  const time = dt.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });

  return (
    <>
      <div className="flex items-center justify-between px-3 pt-2.5 sm:px-4 sm:pt-3">
        <span className={`text-[12px] font-medium tracking-[0.04em] uppercase ${infoTextClass}`}>
          {match.games?.name} · {match.format}
        </span>
        {match.is_friendly && (
          <span className="rounded-full bg-sky-100 px-2 py-0.5 text-[11px] font-medium text-sky-600">
            Amical
          </span>
        )}
      </div>

      <div className="grid grid-cols-[1fr_auto_1fr] items-stretch px-2.5 pt-2 pb-2 sm:px-3 sm:pt-2.5 sm:pb-2.5">
        <Panel
          players={sidePlayers(match.match_participants, leftSide)}
          result={leftResult}
          colorResult={sharedColorResult}
          mode={mode}
          align="left"
        />

        <div className="flex flex-col items-center justify-center gap-1 sm:gap-1.5 px-2 sm:px-3">
          <div className={`w-px flex-1 ${vsColors?.vsBar ?? "bg-slate-200"}`} />
          <span className={`text-[22px] sm:text-[26px] font-medium italic leading-none whitespace-nowrap ${vsColors?.vsText ?? "text-slate-400"}`}>
            VS
          </span>
          <div className={`w-px flex-1 ${vsColors?.vsBar ?? "bg-slate-200"}`} />
        </div>

        <Panel
          players={sidePlayers(match.match_participants, rightSide)}
          result={rightResult}
          colorResult={sharedColorResult}
          mode={mode}
          align="right"
        />
      </div>

      <div className="pb-2.5 sm:pb-3 px-3 sm:px-4 flex items-center justify-center gap-2">
        {match.location && (
          <span className={`inline-flex items-center gap-1 text-[11px] shrink-0 ${infoTextClass}`}>
            <MapPin className="size-3" />
            {match.location}
          </span>
        )}
        <span className={`inline-flex items-center gap-1 text-[11px] ${infoTextClass}`}>
          <Calendar className="size-3" />
          {date}
        </span>
        <span className={`inline-flex items-center gap-1 text-[11px] ${infoTextClass}`}>
          <Clock className="size-3" />
          {time}
        </span>
      </div>
    </>
  );
}

/** leftSide: which side (A or B) is displayed on the left.
 *  History view → creator on left → pass the creator's side.
 *  Profile view → player on left → pass the player's own side. */
export function MatchCard({
  match,
  mode = "fifachamp",
  leftSide = "A",
  from,
}: {
  match: MatchData;
  mode?: Mode;
  leftSide?: "A" | "B";
  from?: string;
}) {
  const detailHref = `/matchs/${match.id}${from ? `?from=${from}` : ""}`;
  const isContested = match.status === "CONTESTE";
  const isAppeal = match.status === "EN_APPEL";
  const isLitigious = isContested || isAppeal;

  if (isLitigious) {
    return (
      <li className="rounded-xl border border-red-200 bg-white overflow-hidden">
        <div className="grayscale opacity-60 pointer-events-none select-none">
          <CardInner match={match} mode={mode} leftSide={leftSide} from={from} />
        </div>
        <div className="border-t border-red-200 bg-red-50 px-3 py-2 flex items-center justify-between gap-2">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-red-600">
            {isContested ? "Contesté" : "En appel"}
          </span>
          <a
            href={detailHref}
            className="inline-flex items-center gap-1 text-[12px] font-medium text-red-700 hover:underline"
          >
            Voir la contestation <ArrowRight className="size-3" />
          </a>
        </div>
      </li>
    );
  }

  const isProfile = from === "profil";
  const leftResult = resultFor(match, leftSide);
  const cardColors = isProfile
    ? leftResult === "win"
      ? CARD_COLORS.win[mode]
      : leftResult === "loss"
        ? CARD_COLORS.loss
        : CARD_COLORS.draw
    : null;
  const cardClasses = cardColors
    ? `${cardColors.bg} ${cardColors.hoverBg} ${cardColors.border}`
    : "bg-white hover:bg-slate-50 border-slate-200";

  return (
    <li>
      <a
        href={detailHref}
        className={`block rounded-xl border overflow-hidden transition-colors ${cardClasses}`}
      >
        <CardInner match={match} mode={mode} leftSide={leftSide} from={from} />
      </a>
    </li>
  );
}
