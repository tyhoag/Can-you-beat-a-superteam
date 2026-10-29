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
import Draft from "./components/Draft.jsx";
import Arena from "./components/Arena.jsx";
import Modal from "./components/Modal.jsx";
import Info, { PlayerInfo, OpponentInfo } from "./components/Info.jsx";
import "./style.css";
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
                    : "YOUR PLAY. YOUR WAY."
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
            <>
              <div className="help-cards">
                <div>
                  <b>01</b>
                  <span>
                    <h3>Draft your five.</h3>
                    <p>
                      One player at each position. Five teams and decades. Your
                      own lineup of legends.
                    </p>
                  </span>
                </div>
                <div>
                  <b>02</b>
                  <span>
                    <h3>Draw a basketball idea.</h3>
                    <p>
                      Tap a jersey to choose the ball handler or shooter. Drag
                      from a player to draw a cut; Move changes their starting
                      spot. Try an editable play above the court.
                    </p>
                  </span>
                </div>
                <div>
                  <b>03</b>
                  <span>
                    <h3>Make three. Move on.</h3>
                    <p>
                      Three buckets in five possessions beats a team. A miss is
                      a chance to adjust. Rematches keep your lineup.
                    </p>
                  </span>
                </div>
              </div>
              <h3>A screen is just a drawing.</h3>
              <p>
                Draw into a teammate or defender, then cut another player around
                that spot. Your screener plants automatically. Continue the
                route toward the rim to roll. It works off the ball too.
              </p>
              <h3>Let the pass find the opening.</h3>
              <p>
                Passing timing is automatic. To choose a specific connection,
                select Pass and tap receivers on the court; the last receiver
                shoots. Auto passes returns to direct delivery and keeps your
                ball handler.
              </p>
              <p>
                <strong>Clear</strong> erases routes and keeps positions.{" "}
                <strong>Reset</strong> restores the original spots and clears
                routes. Undo reverses either. Select a jersey with Tab/Enter;
                arrow keys draw points or move it.
              </p>
              {g.game.stage === "game" &&
                !g.running &&
                g.status === "playing" &&
                !g.game.victory && (
                  <button
                    className="primary"
                    onClick={() => {
                      g.coach();
                      setModal(null);
                    }}
                  >
                    Try the warm-up <ArrowRight size={18} />
                  </button>
                )}
            </>
          )}
        </Modal>
      )}
    </div>
  );
}
createRoot(document.getElementById("root")).render(<App />);
