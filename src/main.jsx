import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import {
  CircleHelp,
  Info as InfoIcon,
  Volume2,
  VolumeX,
  RotateCcw,
  ArrowRight,
} from "lucide-react";
import players from "./players.json";
import { useGame } from "./game/useGame.js";
import { superteam } from "./engine.js";
import PlayGuide from "./components/PlayGuide.jsx";
import Draft from "./components/Draft.jsx";
import Arena from "./components/Arena.jsx";
import Modal from "./components/Modal.jsx";
import Info, { PlayerInfo, OpponentInfo } from "./components/Info.jsx";
import "./style.css";
const exampleRoster = superteam(players);
function App() {
  const g = useGame(players),
    [modal, setModal] = useState(null);
  return (
    <div className={`app ${g.game.stage === "game" ? "is-game" : ""}`}>
      <header className="topbar">
        <div className="brand" aria-label="Chalk and Dynasty">
          <span className="brand-ball">◈</span>
          <span>
            CHALK <i>&</i> DYNASTY<small>BASKETBALL. YOUR WAY.</small>
          </span>
        </div>
        <nav>
          <button
            className="icon-button"
            onClick={g.toggleSound}
            aria-label={g.muted ? "Turn sound on" : "Mute sound"}
            aria-pressed={!g.muted}
          >
            {g.muted ? <VolumeX size={19} /> : <Volume2 size={19} />}
          </button>
          <button
            className="icon-button"
            aria-label="How to play"
            onClick={() => setModal("help")}
          >
            <CircleHelp size={19} />
            <span className="playbook-label">Playbook</span>
          </button>
          <button
            className="icon-button"
            aria-label="Stats and credits"
            onClick={() => setModal("data")}
          >
            <InfoIcon size={19} />
          </button>
          {g.game.stage === "game" && (
            <button
              className="icon-button"
              aria-label="New draft"
              disabled={g.running}
              onClick={() => setModal("reset")}
            >
              <RotateCcw size={18} />
            </button>
          )}
        </nav>
      </header>
      {g.notice && (
        <div className="save-notice" role="status">
          {g.notice}
        </div>
      )}
      {g.game.stage === "draft" ? (
        <Draft
          game={g.game}
          players={players}
          onPick={g.pick}
          onReshuffle={g.reshuffle}
          onDetails={setModal}
          onReset={() => setModal("reset")}
        />
      ) : (
        <Arena
          g={g}
          onNewDraft={() => setModal("reset")}
          onDetails={setModal}
          onOpponentInfo={() => setModal("opponent")}
        />
      )}
      {modal && (
        <Modal
          title={
            typeof modal === "object"
              ? modal.name
              : modal === "opponent"
                ? "MEET THE SUPERTEAM"
                : modal === "data"
                  ? "THE SEASONS BEHIND THE GAME"
                  : modal === "reset"
                    ? "START A NEW DRAFT?"
                    : "THE QUICK PLAYBOOK"
          }
          onClose={() => setModal(null)}
        >
          {typeof modal === "object" ? (
            <PlayerInfo player={modal} />
          ) : modal === "opponent" ? (
            <OpponentInfo players={players} onDetails={setModal} />
          ) : modal === "data" ? (
            <Info players={players} />
          ) : modal === "reset" ? (
            <>
              <p>
                This replaces your team and challenge progress with a fresh
                draft. Clear routes and Full reset on the court keep your team.
              </p>
              <div className="modal-actions">
                <button className="secondary" onClick={() => setModal(null)}>
                  Keep playing
                </button>
                <button
                  className="primary"
                  onClick={() => {
                    g.reset();
                    setModal(null);
                  }}
                >
                  Start fresh <ArrowRight size={18} />
                </button>
              </div>
            </>
          ) : (
            <PlayGuide
              roster={g.roster.length === 5 ? g.roster : exampleRoster}
              onTry={
                g.game.stage === "game" &&
                !g.running &&
                !g.outcome &&
                g.status === "playing" &&
                !g.game.victory
                  ? (play) => {
                      g.edit(play);
                      g.finishTutorial();
                      setModal(null);
                    }
                  : null
              }
              onWarmup={
                g.game.stage === "game" &&
                !g.running &&
                g.status === "playing" &&
                !g.game.victory
                  ? () => {
                      g.coach();
                      setModal(null);
                    }
                  : null
              }
            />
          )}
        </Modal>
      )}
    </div>
  );
}
createRoot(document.getElementById("root")).render(<App />);
