import { useState, useEffect, useRef, useMemo } from "react";
const API = "http://localhost:5000";

/* ================= helpers ================= */
const ALL_DAYS = [0, 1, 2, 3, 4, 5, 6];
const DAY_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const DAY_LONG = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0];
const pad = (n) => String(n).padStart(2, "0");
const dateKey = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

/* minutes-from-midnight  <->  {h, m, ap} used by the time inputs */
const toTF = (mins) => {
  const h24 = Math.floor(mins / 60) % 24;
  return { h: String(h24 % 12 || 12), m: pad(mins % 60), ap: h24 >= 12 ? "PM" : "AM" };
};
const fromTF = ({ h, m, ap }) => {
  const hh = parseInt(h, 10),
    mm = parseInt(m, 10);
  if (!(hh >= 1 && hh <= 12 && mm >= 0 && mm <= 59)) return null;
  return (hh % 12) * 60 + mm + (ap === "PM" ? 720 : 0);
};
const fmt = (mins) => {
  const t = toTF(mins);
  return `${t.h}:${t.m} ${t.ap}`;
};
const fmtDur = (d) => {
  const h = Math.floor(d / 60),
    m = d % 60;
  return h && m ? `${h}h ${m}m` : h ? `${h} h` : `${m} min`;
};
const isNow = (r, date) => {
  if (!r.days.includes(date.getDay())) return false;
  const m = date.getHours() * 60 + date.getMinutes();
  return r.start <= r.end ? m >= r.start && m < r.end : m >= r.start || m < r.end;
};

function useLocal(key, initial) {
  const [v, setV] = useState(() => {
    try {
      const s = localStorage.getItem(key);
      return s ? JSON.parse(s) : initial;
    } catch (e) {
      return initial;
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(v));
    } catch (e) {}
  }, [key, v]);
  return [v, setV];
}

/* ================= icons ================= */
const ICONS = {
  plus: '<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>',
  calendar:
    '<rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>',
  gear: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h.01a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v.01a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>',
  bell: '<path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>',
  up: '<polyline points="6 15 12 9 18 15"/>',
  down: '<polyline points="6 9 12 15 18 9"/>',
  left: '<polyline points="15 18 9 12 15 6"/>',
  right: '<polyline points="9 18 15 12 9 6"/>',
  trash:
    '<polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>',
  edit: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>',
  play: '<polygon points="7 4 19 12 7 20 7 4" fill="currentColor"/>',
  stop: '<rect x="6" y="6" width="12" height="12" rx="2" fill="currentColor"/>',
  check: '<polyline points="20 6 9 17 4 12"/>',
  x: '<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>',
};
function Icon({ name, size = 20 }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      dangerouslySetInnerHTML={{ __html: ICONS[name] }}
    />
  );
}

/* ================= alarm sounds (made with WebAudio, no files needed) ================= */
const TONES = {
  sunrise: { name: "Sunrise", desc: "Soft rising notes, gentle wake-up", len: 2.6, notes: [[523, 0, 0.7, "sine"], [659, 0.4, 0.7, "sine"], [784, 0.8, 0.7, "sine"], [1047, 1.2, 1.2, "sine"]] },
  digital: { name: "Digital Beep", desc: "Classic alarm-clock beeps", len: 1.6, notes: [[1000, 0, 0.15, "square"], [1000, 0.25, 0.15, "square"], [1000, 0.5, 0.15, "square"], [1000, 0.75, 0.15, "square"]] },
  bell: { name: "Classic Bell", desc: "Old-school ringing bell", len: 2, notes: Array.from({ length: 8 }, (_, i) => [i % 2 ? 698 : 880, i * 0.15, 0.14, "triangle"]) },
  chime: { name: "Soft Chime", desc: "Calm and peaceful", len: 3, notes: [[880, 0, 1.6, "sine"], [1319, 0.5, 2, "sine"]] },
  wake: { name: "Wake-up Call", desc: "Loud and urgent, for heavy sleepers", len: 1.3, notes: [[1200, 0, 0.2, "sawtooth"], [900, 0.25, 0.2, "sawtooth"], [1200, 0.5, 0.2, "sawtooth"], [900, 0.75, 0.2, "sawtooth"]] },
};
let audioCtx = null,
  ringTimer = null,
  ringStop = null;
function playOnce(id, volume) {
  const def = TONES[id] || TONES.sunrise;
  audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
  if (audioCtx.state === "suspended") audioCtx.resume();
  const t0 = audioCtx.currentTime + 0.05;
  def.notes.forEach(([f, t, d, type]) => {
    const o = audioCtx.createOscillator(),
      g = audioCtx.createGain();
    o.type = type;
    o.frequency.value = f;
    const peak = Math.max(0.0002, volume * (type === "sine" ? 0.5 : 0.18));
    g.gain.setValueAtTime(0.0001, t0 + t);
    g.gain.exponentialRampToValueAtTime(peak, t0 + t + 0.03);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + t + d);
    o.connect(g);
    g.connect(audioCtx.destination);
    o.start(t0 + t);
    o.stop(t0 + t + d + 0.05);
  });
  return def.len;
}
function stopRing() {
  clearInterval(ringTimer);
  clearTimeout(ringStop);
  ringTimer = null;
  ringStop = null;
}
function startRing(id, volume, maxMs = 60000) {
  stopRing();
  try {
    const len = playOnce(id, volume);
    ringTimer = setInterval(() => playOnce(id, volume), len * 1000);
    ringStop = setTimeout(stopRing, maxMs);
  } catch (e) {}
}
function notify(title, body) {
  if ("Notification" in window && Notification.permission === "granted") {
    try {
      new Notification(title, { body });
    } catch (e) {}
  }
}

/* ================= small UI pieces ================= */
function Switch({ checked, onChange }) {
  return (
    <label className="sw">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span />
    </label>
  );
}
function Sheet({ title, onClose, children, wide }) {
  return (
    <div
      className="overlay"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && onClose) onClose();
      }}
    >
      <div className={"sheet" + (wide ? " wide" : "")}>
        {title && (
          <div className="sheet-head">
            <h3>{title}</h3>
            {onClose && (
              <button className="icon-btn" onClick={onClose}>
                <Icon name="x" />
              </button>
            )}
          </div>
        )}
        {children}
      </div>
    </div>
  );
}

/* time input: type the numbers, or use the up/down arrows, and pick AM / PM */
function TimeField({ label, value, onChange }) {
  const set = (patch) => onChange({ ...value, ...patch });
  const stepH = (d) => {
    const n = parseInt(value.h, 10) || 12;
    set({ h: String(((n - 1 + d + 12) % 12) + 1) });
  };
  const stepM = (d) => {
    const n = parseInt(value.m, 10) || 0;
    set({ m: pad((n + d + 60) % 60) });
  };
  const digits = (s) => s.replace(/\D/g, "").slice(0, 2);
  const key = (step, amount) => (e) => {
    if (e.key === "ArrowUp") {
      e.preventDefault();
      step(amount);
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      step(-amount);
    }
  };
  return (
    <div className="field">
      <label>{label}</label>
      <div className="tf-row">
        <div className="spin">
          <button type="button" aria-label="hour up" onClick={() => stepH(1)}>
            <Icon name="up" size={18} />
          </button>
          <input
            inputMode="numeric"
            value={value.h}
            onKeyDown={key(stepH, 1)}
            onChange={(e) => set({ h: digits(e.target.value) })}
            onBlur={() => {
              if (value.h !== "") {
                const n = Math.min(12, Math.max(1, parseInt(value.h, 10) || 12));
                set({ h: String(n) });
              }
            }}
          />
          <button type="button" aria-label="hour down" onClick={() => stepH(-1)}>
            <Icon name="down" size={18} />
          </button>
        </div>
        <span className="colon">:</span>
        <div className="spin">
          <button type="button" aria-label="minute up" onClick={() => stepM(5)}>
            <Icon name="up" size={18} />
          </button>
          <input
            inputMode="numeric"
            value={value.m}
            onKeyDown={key(stepM, 5)}
            onChange={(e) => set({ m: digits(e.target.value) })}
            onBlur={() => {
              if (value.m !== "") set({ m: pad(Math.min(59, parseInt(value.m, 10) || 0)) });
            }}
          />
          <button type="button" aria-label="minute down" onClick={() => stepM(-5)}>
            <Icon name="down" size={18} />
          </button>
        </div>
        <div className="ampm">
          <button type="button" className={value.ap === "AM" ? "on" : ""} onClick={() => set({ ap: "AM" })}>
            AM
          </button>
          <button type="button" className={value.ap === "PM" ? "on" : ""} onClick={() => set({ ap: "PM" })}>
            PM
          </button>
        </div>
      </div>
    </div>
  );
}

/* ================= first-visit welcome ================= */
function Welcome({ onDone }) {
  const [v, setV] = useState("");
  const go = () => {
    if (v.trim()) onDone(v.trim());
  };
  return (
    <div className="welcome">
      <div className="logo">R</div>
      <h1>Welcome to Rouspoo</h1>
      <div className="muted" style={{ fontSize: 15 }}>
        Plan your day, build your routine, stay on track.
      </div>
      <input
        className="text"
        autoFocus
        placeholder="What should we call you?"
        value={v}
        maxLength={30}
        onChange={(e) => setV(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && go()}
      />
      <button className="btn primary" style={{ width: "100%", flex: "none" }} disabled={!v.trim()} onClick={go}>
        Get started
      </button>
    </div>
  );
}

/* ================= add / edit routine ================= */
function RoutineForm({ initial, routines, alarmOn, onSave, onClose }) {
  const last = routines.length ? [...routines].sort((a, b) => a.start - b.start).slice(-1)[0] : null;
  const defStart = initial ? initial.start : last ? last.end : 6 * 60;
  const defEnd = initial ? initial.end : (defStart + 60) % 1440;
  const [name, setName] = useState(initial ? initial.name : "");
  const [st, setSt] = useState(toTF(defStart));
  const [en, setEn] = useState(toTF(defEnd));
  const [days, setDays] = useState(initial ? initial.days : ALL_DAYS);
  const [alarm, setAlarm] = useState(initial ? initial.alarm : true);
  const [err, setErr] = useState("");

  const s = fromTF(st),
    e = fromTF(en);
  const dur = s != null && e != null ? (e - s + 1440) % 1440 : null;
  const toggleDay = (d) => setDays((ds) => (ds.includes(d) ? ds.filter((x) => x !== d) : [...ds, d].sort()));

  const submit = () => {
    if (!name.trim()) return setErr("Enter a routine name.");
    if (s == null || e == null) return setErr("Enter a valid hour (1-12) and minute (0-59).");
    if (s === e) return setErr("Start and end time cannot be the same.");
    if (!days.length) return setErr("Pick at least one day.");
    onSave({ id: initial ? initial.id : "r" + Date.now(), name: name.trim(), start: s, end: e, days, alarm });
  };

  return (
    <Sheet title={initial ? "Edit routine" : "New routine"} onClose={onClose}>
      <div className="field">
        <label>Routine name</label>
        <input
          className="text"
          autoFocus={!initial}
          placeholder="e.g. Gym, Study, Business work"
          value={name}
          maxLength={50}
          onChange={(ev) => {
            setName(ev.target.value);
            setErr("");
          }}
        />
      </div>
      <TimeField
        label="Starting time"
        value={st}
        onChange={(v) => {
          setSt(v);
          setErr("");
        }}
      />
      <TimeField
        label="Ending time"
        value={en}
        onChange={(v) => {
          setEn(v);
          setErr("");
        }}
      />
      {dur != null && dur > 0 && (
        <div className="hint">
          Duration: {fmtDur(dur)}
          {e < s ? " (ends next day)" : ""}
        </div>
      )}

      <div className="field">
        <label>Repeat on</label>
        <div className="chips">
          {DAY_SHORT.map((n, d) => (
            <button key={d} type="button" className={"chip" + (days.includes(d) ? " on" : "")} onClick={() => toggleDay(d)}>
              {n}
            </button>
          ))}
        </div>
      </div>

      <div className="line">
        <div>
          <b style={{ fontSize: 15 }}>Alarm at start time</b>
          {!alarmOn && <div className="muted">Alarms are off. Turn them on in Settings.</div>}
        </div>
        <Switch checked={alarm} onChange={setAlarm} />
      </div>

      {err && (
        <div className="err" style={{ marginTop: 14 }}>
          {err}
        </div>
      )}
      <div className="btn-row">
        <button className="btn ghost" onClick={onClose}>
          Cancel
        </button>
        <button className="btn primary" onClick={submit}>
          {initial ? "Save changes" : "Add routine"}
        </button>
      </div>
    </Sheet>
  );
}

/* ================= weekly / monthly timetable ================= */
function SlotList({ list }) {
  return list.length === 0 ? (
    <div className="muted" style={{ padding: "8px 0" }}>
      Nothing planned.
    </div>
  ) : (
    list.map((r) => (
      <div key={r.id} className="slot">
        <div className="t">
          {fmt(r.start)} – {fmt(r.end)}
        </div>
        <div>{r.name}</div>
      </div>
    ))
  );
}

function Timetable({ routines, onClose }) {
  const today = new Date();
  const [view, setView] = useState("week");
  const [cur, setCur] = useState({ y: today.getFullYear(), m: today.getMonth() });
  const [sel, setSel] = useState(new Date(today.getFullYear(), today.getMonth(), today.getDate()));
  const forDay = (wd) => routines.filter((r) => r.days.includes(wd)).sort((a, b) => a.start - b.start);
  const shift = (n) =>
    setCur(({ y, m }) => {
      const d = new Date(y, m + n, 1);
      return { y: d.getFullYear(), m: d.getMonth() };
    });

  const first = new Date(cur.y, cur.m, 1).getDay();
  const dim = new Date(cur.y, cur.m + 1, 0).getDate();

  return (
    <Sheet title="Timetable" onClose={onClose} wide>
      <div className="seg big">
        <button className={view === "week" ? "on" : ""} onClick={() => setView("week")}>
          Weekly
        </button>
        <button className={view === "month" ? "on" : ""} onClick={() => setView("month")}>
          Monthly
        </button>
      </div>

      {view === "week" &&
        WEEK_ORDER.map((wd) => (
          <div key={wd} className={"day" + (wd === today.getDay() ? " today" : "")}>
            <h4>
              <span>{DAY_LONG[wd]}</span>
              {wd === today.getDay() && <span className="tag">Today</span>}
            </h4>
            <SlotList list={forDay(wd)} />
          </div>
        ))}

      {view === "month" && (
        <>
          <div className="month-nav">
            <button className="icon-btn" onClick={() => shift(-1)}>
              <Icon name="left" />
            </button>
            <span>{new Date(cur.y, cur.m, 1).toLocaleDateString("en-IN", { month: "long", year: "numeric" })}</span>
            <button className="icon-btn" onClick={() => shift(1)}>
              <Icon name="right" />
            </button>
          </div>
          <div className="cal">
            {DAY_SHORT.map((n) => (
              <div key={n} className="h">
                {n[0]}
              </div>
            ))}
            {[...Array(first)].map((_, i) => (
              <div key={"e" + i} />
            ))}
            {[...Array(dim)].map((_, i) => {
              const d = new Date(cur.y, cur.m, i + 1);
              const n = forDay(d.getDay()).length;
              const isSel = dateKey(d) === dateKey(sel),
                isToday = dateKey(d) === dateKey(today);
              return (
                <button key={i} className={"d" + (isSel ? " sel" : "") + (isToday ? " today" : "")} onClick={() => setSel(d)}>
                  {i + 1}
                  <span className="dots">
                    {[...Array(Math.min(n, 3))].map((_, k) => (
                      <i key={k} />
                    ))}
                  </span>
                </button>
              );
            })}
          </div>
          <div className="day">
            <h4>{sel.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" })}</h4>
            <SlotList list={forDay(sel.getDay())} />
          </div>
        </>
      )}
    </Sheet>
  );
}

/* ================= settings ================= */
function Settings({ name, setName, settings, setSettings, perm, askPerm, onReset, onClose }) {
  const [playing, setPlaying] = useState(null);
  useEffect(() => () => stopRing(), []);
  const set = (patch) => setSettings((s) => ({ ...s, ...patch }));

  const preview = (id) => {
    if (playing === id) {
      stopRing();
      setPlaying(null);
      return;
    }
    startRing(id, settings.volume, 5000);
    setPlaying(id);
    setTimeout(() => setPlaying((p) => (p === id ? null : p)), 5000);
  };
  const choose = (id) => {
    set({ ringtone: id });
  };

  return (
    <Sheet
      title="Settings"
      onClose={() => {
        stopRing();
        onClose();
      }}
    >
      <div className="group">
        <h4>Your name</h4>
        <input className="text" value={name} maxLength={30} onChange={(e) => setName(e.target.value)} />
      </div>

      <div className="group">
        <h4>Theme</h4>
        <div className="seg">
          <button className={settings.theme === "light" ? "on" : ""} onClick={() => set({ theme: "light" })}>
            ☀️ Light
          </button>
          <button className={settings.theme === "dark" ? "on" : ""} onClick={() => set({ theme: "dark" })}>
            🌙 Dark
          </button>
        </div>
      </div>

      <div className="group">
        <div className="line" style={{ marginBottom: settings.alarmOn ? 14 : 0 }}>
          <div>
            <b>Alarm</b>
            <div className="muted">Ring at the start time of routines</div>
          </div>
          <Switch
            checked={settings.alarmOn}
            onChange={(v) => {
              set({ alarmOn: v });
              if (!v) {
                stopRing();
                setPlaying(null);
              }
            }}
          />
        </div>

        {settings.alarmOn && (
          <>
            <div className="lbl">Choose a ringtone</div>
            {Object.entries(TONES).map(([id, t]) => (
              <div key={id} className={"tone" + (settings.ringtone === id ? " sel" : "")} onClick={() => choose(id)}>
                <div className="radio">{settings.ringtone === id && <Icon name="check" size={13} />}</div>
                <div className="meta">
                  <b>{t.name}</b>
                  <span>{t.desc}</span>
                </div>
                <button
                  className="play"
                  onClick={(e) => {
                    e.stopPropagation();
                    preview(id);
                  }}
                  aria-label="preview"
                >
                  <Icon name={playing === id ? "stop" : "play"} size={16} />
                </button>
              </div>
            ))}
            <div className="lbl" style={{ marginTop: 14 }}>
              Volume · {Math.round(settings.volume * 100)}%
            </div>
            <input
              type="range"
              min="0.1"
              max="1"
              step="0.05"
              value={settings.volume}
              onChange={(e) => set({ volume: Number(e.target.value) })}
            />
            <div className="muted" style={{ marginTop: 10 }}>
              Keep Rouspoo open for alarms to ring. Your browser may block sound until you have tapped the page once.
            </div>
          </>
        )}
      </div>

      <div className="group">
        <div className="line">
          <div>
            <b>Notifications</b>
            <div className="muted">
              {perm === "granted"
                ? "On: you will get reminders"
                : perm === "denied"
                ? "Blocked in browser settings"
                : "Reminders when a routine starts"}
            </div>
          </div>
          {perm !== "granted" && perm !== "denied" && (
            <button className="btn primary" style={{ flex: "none", padding: "10px 16px" }} onClick={askPerm}>
              Enable
            </button>
          )}
        </div>
      </div>

      <button className="btn danger" style={{ width: "100%" }} onClick={onReset}>
        Delete all my data
      </button>
    </Sheet>
  );
}

/* ================= app ================= */
export default function App() {
  const [name, setName] = useLocal("rouspoo.name", "");
  const [routines, setRoutines] = useState([]);
  const [settings, setSettings] = useLocal("rouspoo.settings.v3", {
    theme: "light",
    alarmOn: false,
    ringtone: "sunrise",
    volume: 0.7,
  });
  const [now, setNow] = useState(new Date());
  const [form, setForm] = useState(null); // null | 'new' | routine
  const [showTable, setShowTable] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [ringing, setRinging] = useState(null);
  const [perm, setPerm] = useState("Notification" in window ? Notification.permission : "denied");
  const fired = useRef(new Set());
  useEffect(() => {
  fetch(`${API}/routines`)
    .then((res) => res.json())
    .then(setRoutines)
    .catch(() => alert("Could not reach the backend. Is the server running?"));
}, []);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", settings.theme);
  }, [settings.theme]);
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 10000);
    return () => clearInterval(t);
  }, []);

  // alarm + notification when a routine starts
  useEffect(() => {
    const m = now.getHours() * 60 + now.getMinutes(),
      dk = dateKey(now);
    routines.forEach((r) => {
      if (!r.days.includes(now.getDay())) return;
      const k = dk + r.id;
      if (m >= r.start && m < r.start + 2 && !fired.current.has(k)) {
        fired.current.add(k);
        notify("⏰ " + r.name, "Starts now (" + fmt(r.start) + ")");
        if (settings.alarmOn && r.alarm) {
          setRinging(r);
          startRing(settings.ringtone, settings.volume);
        }
      }
    });
  }, [now]);

  const sorted = useMemo(() => [...routines].sort((a, b) => a.start - b.start), [routines]);
  const hour = now.getHours();
  const greet =
    hour < 5 ? "Good night" : hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : hour < 21 ? "Good evening" : "Good night";

  const save = async (r) => {
  const exists = routines.some((x) => x.id === r.id);
  try {
    const res = await fetch(exists ? `${API}/routines/${r.id}` : `${API}/routines`, {
      method: exists ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(r),
    });
    if (!res.ok) throw new Error("save failed");
    const saved = await res.json();
    setRoutines((rs) => (exists ? rs.map((x) => (x.id === saved.id ? saved : x)) : [...rs, saved]));
    setForm(null);
  } catch (e) {
    alert("Could not save. Is the backend server running?");
  }
};

const remove = async (r) => {
  if (!confirm('Delete "' + r.name + '"?')) return;
  try {
    await fetch(`${API}/routines/${r.id}`, { method: "DELETE" });
    setRoutines((rs) => rs.filter((x) => x.id !== r.id));
  } catch (e) {
    alert("Could not delete. Is the backend server running?");
  }
};

const toggleAlarm = async (r) => {
  const updated = { ...r, alarm: !r.alarm };
  try {
    const res = await fetch(`${API}/routines/${r.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updated),
    });
    if (!res.ok) throw new Error("update failed");
    setRoutines((rs) => rs.map((x) => (x.id === r.id ? updated : x)));
  } catch (e) {
    alert("Could not update. Is the backend server running?");
  }
};
  const resetAll = () => {
    if (confirm("Delete your name, routines and settings?")) {
      stopRing();
      setRoutines([]);
      setName("");
      setShowSettings(false);
      setSettings({ theme: settings.theme, alarmOn: false, ringtone: "sunrise", volume: 0.7 });
    }
  };

  if (!name.trim()) return <Welcome onDone={setName} />;

  return (
    <div className="app">
      <header className="top">
        <div>
          <div className="hi">{greet},</div>
          <h1 className="user">{name} 👋</h1>
        </div>
        <div className="icons">
          <button className="icon-btn" title="Weekly / monthly timetable" onClick={() => setShowTable(true)}>
            <Icon name="calendar" />
          </button>
          <button className="icon-btn" title="Settings" onClick={() => setShowSettings(true)}>
            <Icon name="gear" />
          </button>
        </div>
      </header>

      {sorted.length === 0 ? (
        <button className="bigplus" onClick={() => setForm("new")}>
          <span className="circle">
            <Icon name="plus" size={56} />
          </span>
          Tap to add your routine
        </button>
      ) : (
        <>
          <div className="section-title">
            <span>Your routines</span>
            <span className="muted">{sorted.length} added</span>
          </div>
          {sorted.map((r) => (
            <div key={r.id} className={"routine" + (isNow(r, now) ? " now" : "")}>
              <div className="info">
                <div className="name">
                  {r.name}
                  {isNow(r, now) && <span className="tag">NOW</span>}
                </div>
                <div className="time">
                  {fmt(r.start)} – {fmt(r.end)} · {fmtDur((r.end - r.start + 1440) % 1440)}
                  {r.days.length < 7 && " · " + r.days.map((d) => DAY_SHORT[d]).join(", ")}
                </div>
              </div>
              <div className="row-actions">
                <button className={"mini" + (r.alarm && settings.alarmOn ? " on" : "")} title="Alarm" onClick={() => toggleAlarm(r)}>
                  <Icon name="bell" size={17} />
                </button>
                <button className="mini" title="Edit" onClick={() => setForm(r)}>
                  <Icon name="edit" size={17} />
                </button>
                <button className="mini del" title="Delete" onClick={() => remove(r)}>
                  <Icon name="trash" size={17} />
                </button>
              </div>
            </div>
          ))}
          <button className="smallplus" onClick={() => setForm("new")}>
            <span className="circle">
              <Icon name="plus" size={28} />
            </span>
            Add another routine
          </button>
        </>
      )}

      {form && (
        <RoutineForm
          initial={form === "new" ? null : form}
          routines={routines}
          alarmOn={settings.alarmOn}
          onSave={save}
          onClose={() => setForm(null)}
        />
      )}
      {showTable && <Timetable routines={routines} onClose={() => setShowTable(false)} />}
      {showSettings && (
        <Settings
          name={name}
          setName={setName}
          settings={settings}
          setSettings={setSettings}
          perm={perm}
          askPerm={askPerm}
          onReset={resetAll}
          onClose={() => setShowSettings(false)}
        />
      )}

      {ringing && (
        <Sheet>
          <div className="ring">
            <div className="bell">⏰</div>
            <h3 style={{ fontSize: 24, margin: "10px 0 4px" }}>{ringing.name}</h3>
            <div className="muted">Starts now · {fmt(ringing.start)}</div>
            <div className="btn-row">
              <button
                className="btn primary"
                onClick={() => {
                  stopRing();
                  setRinging(null);
                }}
              >
                Stop alarm
              </button>
            </div>
          </div>
        </Sheet>
      )}
    </div>
  );
}