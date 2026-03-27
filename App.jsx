<!doctype html>
<html lang="ru">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Биологическая Викторина</title>

    <script src="https://cdn.tailwindcss.com"></script>
    <script src="https://unpkg.com/react@18/umd/react.development.js"></script>
    <script src="https://unpkg.com/react-dom@18/umd/react-dom.development.js"></script>
    <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>

    <style>
      html, body, #root { height: 100%; }
      body {
        margin: 0;
        font-family: Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        background:
          radial-gradient(circle at top, rgba(16, 185, 129, 0.18), transparent 35%),
          linear-gradient(180deg, #04110d 0%, #020705 100%);
        color: #ecfdf5;
      }
      ::selection { background: rgba(16,185,129,.35); }
    </style>
  </head>
  <body>
    <div id="root"></div>

    <script type="text/babel">
      const { useEffect, useMemo, useRef, useState } = React;

      const STORAGE_KEY = "bio-jeopardy-simple-v1";
      const POINTS = [100, 200, 300, 400, 500];

      const iconStyle = "w-5 h-5 text-emerald-300";

      function DnaIcon() {
        return (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={iconStyle}>
            <path d="M6 3c6 3 6 15 12 18" />
            <path d="M18 3c-6 3-6 15-12 18" />
            <path d="M8 7h8M7 12h10M8 17h8" />
          </svg>
        );
      }

      function LeafIcon() {
        return (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={iconStyle}>
            <path d="M20 4c-7 0-14 5-14 12 0 2 1 4 3 4 7 0 11-7 11-16Z" />
            <path d="M6 18c4-2 8-6 11-12" />
          </svg>
        );
      }

      function UsersIcon() {
        return (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={iconStyle}>
            <path d="M17 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
            <circle cx="10" cy="7" r="4" />
            <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
          </svg>
        );
      }

      function TimerIcon() {
        return (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4 text-emerald-300">
            <circle cx="12" cy="13" r="8" />
            <path d="M12 9v4l3 2" />
            <path d="M9 2h6" />
          </svg>
        );
      }

      function PlusIcon() {
        return (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
            <path d="M12 5v14M5 12h14" />
          </svg>
        );
      }

      function CheckIcon() {
        return (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
            <path d="M20 6 9 17l-5-5" />
          </svg>
        );
      }

      function XIcon() {
        return (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
            <path d="M18 6 6 18M6 6l12 12" />
          </svg>
        );
      }

      function ChevronIcon() {
        return (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
            <path d="m9 18 6-6-6-6" />
          </svg>
        );
      }

      function TrashIcon() {
        return (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
            <path d="M3 6h18" />
            <path d="M8 6V4h8v2" />
            <path d="M6 6l1 14h10l1-14" />
            <path d="M10 11v6M14 11v6" />
          </svg>
        );
      }

      function createCell(points) {
        return {
          points,
          question: "",
          answer: "",
          imageUrl: "",
          resolved: false,
          awarded: null,
          teamName: "",
        };
      }

      function createBoard(count = 5) {
        return Array.from({ length: count }, (_, i) => ({
          title: `Категория ${i + 1}`,
          cells: POINTS.map(createCell),
        }));
      }

      function createTeams(count = 2) {
        return Array.from({ length: count }, (_, i) => ({
          name: `Команда ${i + 1}`,
          score: 0,
        }));
      }

      function App() {
        const saved = useMemo(() => {
          try {
            return JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
          } catch {
            return null;
          }
        }, []);

        const [mode, setMode] = useState(saved?.mode || "setup");
        const [teamCount, setTeamCount] = useState(saved?.teamCount || 2);
        const [teams, setTeams] = useState(saved?.teams || createTeams(saved?.teamCount || 2));
        const [categories, setCategories] = useState(saved?.categories || createBoard(5));
        const [currentTurn, setCurrentTurn] = useState(saved?.currentTurn || 0);

        const [activeCell, setActiveCell] = useState(null); // {catIndex, cellIndex}
        const [timer, setTimer] = useState(30);
        const [timerExpired, setTimerExpired] = useState(false);
        const [answerShown, setAnswerShown] = useState(false);

        const fileRefs = useRef({});

        useEffect(() => {
          setTeams(prev => {
            const next = Array.from({ length: teamCount }, (_, i) => prev[i] || { name: `Команда ${i + 1}`, score: 0 });
            return next.map((t, i) => ({ name: t.name || `Команда ${i + 1}`, score: Number(t.score) || 0 }));
          });
        }, [teamCount]);

        useEffect(() => {
          if (currentTurn >= teams.length) setCurrentTurn(0);
        }, [teams.length, currentTurn]);

        useEffect(() => {
          localStorage.setItem(
            STORAGE_KEY,
            JSON.stringify({ mode, teamCount, teams, categories, currentTurn })
          );
        }, [mode, teamCount, teams, categories, currentTurn]);

        useEffect(() => {
          if (!activeCell) return;
          setTimer(30);
          setTimerExpired(false);
          setAnswerShown(false);

          const id = setInterval(() => {
            setTimer(prev => {
              if (prev <= 1) {
                clearInterval(id);
                setTimerExpired(true);
                return 0;
              }
              return prev - 1;
            });
          }, 1000);

          return () => clearInterval(id);
        }, [activeCell]);

        const currentTeam = teams[currentTurn] || teams[0];

        function updateCategoryTitle(index, value) {
          setCategories(prev => prev.map((c, i) => (i === index ? { ...c, title: value } : c)));
        }

        function updateCell(catIndex, cellIndex, patch) {
          setCategories(prev =>
            prev.map((cat, i) => {
              if (i !== catIndex) return cat;
              return {
                ...cat,
                cells: cat.cells.map((cell, j) => (j !== cellIndex ? cell : { ...cell, ...patch })),
              };
            })
          );
        }

        function addCategory() {
          setCategories(prev => [...prev, { title: `Категория ${prev.length + 1}`, cells: POINTS.map(createCell) }]);
        }

        function removeCategory(index) {
          setCategories(prev => prev.filter((_, i) => i !== index));
        }

        function openCell(catIndex, cellIndex) {
          const cell = categories[catIndex]?.cells[cellIndex];
          if (!cell || cell.resolved) return;
          setActiveCell({ catIndex, cellIndex });
        }

        function closeModal() {
          setActiveCell(null);
          setTimer(30);
          setTimerExpired(false);
          setAnswerShown(false);
        }

        function showAnswer() {
          setAnswerShown(true);
        }

        function finishQuestion(awarded) {
          if (!activeCell) return;
          const { catIndex, cellIndex } = activeCell;
          const cell = categories[catIndex].cells[cellIndex];
          const points = cell.points;
          const teamName = currentTeam?.name || "Команда";

          updateCell(catIndex, cellIndex, {
            resolved: true,
            awarded,
            teamName,
          });

          if (awarded) {
            setTeams(prev => prev.map((t, i) => (i === currentTurn ? { ...t, score: t.score + points } : t)));
          }

          setCurrentTurn(prev => (teams.length ? (prev + 1) % teams.length : 0));
          closeModal();
        }

        function handleFile(catIndex, cellIndex, file) {
          if (!file) return;
          const reader = new FileReader();
          reader.onload = () => {
            updateCell(catIndex, cellIndex, { imageUrl: String(reader.result || "") });
          };
          reader.readAsDataURL(file);
        }

        function resetAll() {
          setMode("setup");
          setTeamCount(2);
          setTeams(createTeams(2));
          setCategories(createBoard(5));
          setCurrentTurn(0);
          closeModal();
        }

        return (
          <div className="min-h-screen text-emerald-50">
            <div className="mx-auto max-w-7xl px-4 py-4 md:px-6 md:py-6">
              <header className="mb-6 rounded-3xl border border-emerald-400/15 bg-emerald-950/45 p-4 shadow-2xl shadow-black/30 backdrop-blur">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-400 to-green-700 shadow-lg shadow-emerald-500/20">
                      <DnaIcon />
                    </div>
                    <div>
                      <h1 className="text-2xl font-bold md:text-3xl">Биологическая Викторина</h1>
                      <p className="text-sm text-emerald-50/70">Простой вариант для GitHub Pages</p>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => setMode("setup")}
                      className={`rounded-2xl px-4 py-2 text-sm font-semibold transition ${
                        mode === "setup" ? "bg-emerald-400 text-emerald-950" : "bg-white/5 hover:bg-white/10"
                      }`}
                    >
                      Старт
                    </button>
                    <button
                      onClick={() => setMode("editor")}
                      className={`rounded-2xl px-4 py-2 text-sm font-semibold transition ${
                        mode === "editor" ? "bg-emerald-400 text-emerald-950" : "bg-white/5 hover:bg-white/10"
                      }`}
                    >
                      Редактор
                    </button>
                    <button
                      onClick={() => setMode("game")}
                      className={`rounded-2xl px-4 py-2 text-sm font-semibold transition ${
                        mode === "game" ? "bg-emerald-400 text-emerald-950" : "bg-white/5 hover:bg-white/10"
                      }`}
                    >
                      Игра
                    </button>
                    <button
                      onClick={resetAll}
                      className="inline-flex items-center gap-2 rounded-2xl border border-red-400/20 bg-red-500/10 px-4 py-2 text-sm font-semibold text-red-100 hover:bg-red-500/20"
                    >
                      <RotateCcw />
                      Сброс
                    </button>
                  </div>
                </div>
              </header>

              {mode === "setup" && (
                <section className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
                  <div className="rounded-3xl border border-emerald-400/15 bg-emerald-950/40 p-5 shadow-2xl shadow-black/25 backdrop-blur">
                    <div className="mb-5 flex items-center gap-3">
                      <UsersIcon />
                      <h2 className="text-xl font-bold">Параметры игры</h2>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      <label className="space-y-2">
                        <span className="text-sm text-emerald-50/70">Количество команд</span>
                        <select
                          value={teamCount}
                          onChange={(e) => setTeamCount(Number(e.target.value))}
                          className="w-full rounded-2xl border border-emerald-400/15 bg-emerald-900/70 px-4 py-3 outline-none"
                        >
                          {Array.from({ length: 9 }, (_, i) => i + 2).map((n) => (
                            <option key={n} value={n}>{n}</option>
                          ))}
                        </select>
                      </label>

                      <div className="rounded-2xl border border-emerald-400/10 bg-white/5 p-4 text-sm text-emerald-50/75">
                        Настрой команды, потом открой редактор или сразу запускай игру.
                      </div>
                    </div>

                    <div className="mt-5 space-y-3">
                      {teams.map((team, i) => (
                        <div key={i} className={`rounded-2xl border p-4 ${i === currentTurn ? "border-emerald-300/40 bg-emerald-400/10" : "border-emerald-400/10 bg-white/5"}`}>
                          <div className="mb-3 flex items-center justify-between">
                            <span className="text-sm font-semibold">
                              {i === currentTurn ? "Сейчас ход" : `Команда ${i + 1}`}
                            </span>
                            <input
                              type="number"
                              value={team.score}
                              onChange={(e) => {
                                const value = Number(e.target.value) || 0;
                                setTeams(prev => prev.map((t, idx) => idx === i ? { ...t, score: value } : t));
                              }}
                              className="w-24 rounded-2xl border border-emerald-400/15 bg-emerald-900/70 px-3 py-2 text-center outline-none"
                            />
                          </div>
                          <input
                            value={team.name}
                            onChange={(e) => {
                              const value = e.target.value;
                              setTeams(prev => prev.map((t, idx) => idx === i ? { ...t, name: value } : t));
                            }}
                            className="w-full rounded-2xl border border-emerald-400/15 bg-emerald-900/70 px-4 py-3 outline-none"
                          />
                        </div>
                      ))}
                    </div>

                    <div className="mt-6 flex gap-3">
                      <button
                        onClick={() => setMode("editor")}
                        className="rounded-2xl bg-emerald-400 px-5 py-3 font-semibold text-emerald-950 hover:bg-emerald-300"
                      >
                        В редактор
                      </button>
                      <button
                        onClick={() => setMode("game")}
                        className="rounded-2xl border border-emerald-300/20 bg-white/5 px-5 py-3 font-semibold hover:bg-white/10"
                      >
                        Начать игру
                      </button>
                    </div>
                  </div>

                  <div className="rounded-3xl border border-emerald-400/15 bg-emerald-950/40 p-5 shadow-2xl shadow-black/25 backdrop-blur">
                    <div className="mb-5 flex items-center gap-3">
                      <LeafIcon />
                      <h2 className="text-xl font-bold">Что умеет</h2>
                    </div>
                    <div className="space-y-4 text-sm text-emerald-50/75">
                      <div className="rounded-2xl bg-white/5 p-4">Редактор вопросов и ответов.</div>
                      <div className="rounded-2xl bg-white/5 p-4">Картинка по ссылке или загрузкой файла.</div>
                      <div className="rounded-2xl bg-white/5 p-4">Игровой экран с таймером 30 секунд.</div>
                      <div className="rounded-2xl bg-white/5 p-4">Очки команд можно менять вручную в любой момент.</div>
                    </div>
                  </div>
                </section>
              )}

              {mode === "editor" && (
                <section className="space-y-6">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <PencilIcon />
                      <h2 className="text-xl font-bold">Режим редактора</h2>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={addCategory}
                        className="inline-flex items-center gap-2 rounded-2xl bg-emerald-400 px-4 py-2 font-semibold text-emerald-950 hover:bg-emerald-300"
                      >
                        <PlusIcon />
                        Категория
                      </button>
                      <button
                        onClick={() => setMode("game")}
                        className="rounded-2xl border border-emerald-300/20 bg-white/5 px-4 py-2 font-semibold hover:bg-white/10"
                      >
                        В игру
                      </button>
                    </div>
                  </div>

                  <div className="grid gap-4 overflow-x-auto pb-2" style={{ gridTemplateColumns: `repeat(${categories.length}, minmax(260px, 1fr))` }}>
                    {categories.map((cat, catIndex) => (
                      <div key={catIndex} className="min-w-[280px] rounded-3xl border border-emerald-400/15 bg-emerald-950/40 p-4 shadow-xl shadow-black/20 backdrop-blur">
                        <div className="mb-4 flex gap-2">
                          <input
                            value={cat.title}
                            onChange={(e) => updateCategoryTitle(catIndex, e.target.value)}
                            className="w-full rounded-2xl border border-emerald-400/15 bg-emerald-900/70 px-4 py-3 text-sm font-bold uppercase tracking-wider outline-none"
                          />
                          <button
                            onClick={() => removeCategory(catIndex)}
                            className="rounded-2xl border border-red-400/20 bg-red-500/10 p-3 text-red-100 hover:bg-red-500/20"
                            title="Удалить категорию"
                          >
                            <TrashIcon />
                          </button>
                        </div>

                        <div className="space-y-3">
                          {cat.cells.map((cell, cellIndex) => (
                            <div key={cell.points} className="rounded-2xl border border-emerald-400/10 bg-white/5 p-3">
                              <div className="mb-3 flex items-center justify-between">
                                <span className="rounded-full bg-emerald-400/15 px-3 py-1 text-xs font-semibold text-emerald-200">
                                  {cell.points} баллов
                                </span>
                                <span className="text-xs text-emerald-50/60">{cell.resolved ? "Сыграно" : "Черновик"}</span>
                              </div>

                              <textarea
                                rows="3"
                                value={cell.question}
                                onChange={(e) => updateCell(catIndex, cellIndex, { question: e.target.value })}
                                className="mb-3 w-full rounded-2xl border border-emerald-400/15 bg-emerald-900/70 px-4 py-3 text-sm outline-none"
                                placeholder="Вопрос"
                              />

                              <textarea
                                rows="2"
                                value={cell.answer}
                                onChange={(e) => updateCell(catIndex, cellIndex, { answer: e.target.value })}
                                className="mb-3 w-full rounded-2xl border border-emerald-400/15 bg-emerald-900/70 px-4 py-3 text-sm outline-none"
                                placeholder="Правильный ответ"
                              />

                              <input
                                value={cell.imageUrl}
                                onChange={(e) => updateCell(catIndex, cellIndex, { imageUrl: e.target.value })}
                                className="mb-3 w-full rounded-2xl border border-emerald-400/15 bg-emerald-900/70 px-4 py-3 text-sm outline-none"
                                placeholder="Ссылка на картинку"
                              />

                              <div className="flex flex-wrap gap-2">
                                <button
                                  onClick={() => fileRefs.current[`${catIndex}-${cellIndex}`]?.click()}
                                  className="rounded-2xl bg-white/5 px-3 py-2 text-sm hover:bg-white/10"
                                >
                                  Загрузить файл
                                </button>
                                <input
                                  ref={(el) => (fileRefs.current[`${catIndex}-${cellIndex}`] = el)}
                                  type="file"
                                  accept="image/*"
                                  className="hidden"
                                  onChange={(e) => {
                                    handleFile(catIndex, cellIndex, e.target.files?.[0]);
                                    e.target.value = "";
                                  }}
                                />
                                <button
                                  onClick={() => updateCell(catIndex, cellIndex, { question: "", answer: "", imageUrl: "" })}
                                  className="rounded-2xl border border-emerald-300/15 bg-emerald-400/10 px-3 py-2 text-sm hover:bg-emerald-400/15"
                                >
                                  Очистить
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {mode === "game" && (
                <section className="grid gap-6 lg:grid-cols-[1fr_320px]">
                  <div className="rounded-3xl border border-emerald-400/15 bg-emerald-950/30 p-4 shadow-2xl shadow-black/20 backdrop-blur">
                    <div className="mb-4 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5 text-emerald-300">
                          <path d="M3 6h18M6 6v14h12V6" />
                        </svg>
                        <h2 className="text-xl font-bold">Игровая сетка</h2>
                      </div>
                      <div className="text-sm text-emerald-50/70">
                        Ход: <span className="font-semibold text-emerald-200">{currentTeam?.name || "—"}</span>
                      </div>
                    </div>

                    <div className="overflow-x-auto pb-2">
                      <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${categories.length}, minmax(220px, 1fr))` }}>
                        {categories.map((cat, catIndex) => (
                          <div key={catIndex} className="min-w-[220px] overflow-hidden rounded-3xl border border-emerald-400/15 bg-emerald-900/40">
                            <div className="flex min-h-20 items-center justify-center border-b border-emerald-400/10 px-3 py-4 text-center text-sm font-black uppercase tracking-wider">
                              {cat.title || `Категория ${catIndex + 1}`}
                            </div>

                            <div className="space-y-2 p-3">
                              {cat.cells.map((cell, cellIndex) => (
                                <button
                                  key={cell.points}
                                  onClick={() => openCell(catIndex, cellIndex)}
                                  disabled={cell.resolved}
                                  className={[
                                    "flex min-h-16 w-full items-center justify-between rounded-2xl px-4 py-3 text-left font-bold transition",
                                    cell.resolved
                                      ? cell.awarded
                                        ? "bg-emerald-500/25 text-emerald-50"
                                        : "bg-red-500/20 text-red-100"
                                      : "bg-emerald-400/10 text-emerald-100 hover:bg-emerald-400/20",
                                  ].join(" ")}
                                >
                                  <div className="flex items-center gap-2">
                                    <span className="text-lg">{cell.points}</span>
                                    {cell.resolved && <span className="text-xs opacity-90">{cell.teamName}</span>}
                                  </div>
                                  {!cell.resolved ? <ChevronIcon /> : cell.awarded ? <CheckIcon /> : <XIcon />}
                                </button>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <aside className="rounded-3xl border border-emerald-400/15 bg-emerald-950/40 p-5 shadow-2xl shadow-black/25 backdrop-blur">
                    <div className="mb-4 flex items-center gap-2">
                      <UsersIcon />
                      <h3 className="text-xl font-bold">Команды</h3>
                    </div>

                    <div className="mb-5 rounded-2xl border border-emerald-400/10 bg-white/5 p-4">
                      <div className="flex items-center gap-2 text-sm text-emerald-50/75">
                        <TimerIcon />
                        Текущий ход
                      </div>
                      <div className="mt-1 text-lg font-bold text-emerald-200">{currentTeam?.name || "—"}</div>
                    </div>

                    <div className="space-y-3">
                      {teams.map((team, i) => (
                        <div key={i} className={`rounded-2xl border p-4 ${i === currentTurn ? "border-emerald-300/40 bg-emerald-400/10" : "border-emerald-400/10 bg-white/5"}`}>
                          <div className="mb-3 flex items-center justify-between">
                            <span className="text-sm font-semibold">Команда {i + 1}</span>
                            {i === currentTurn && <span className="rounded-full bg-emerald-400 px-3 py-1 text-[11px] font-bold text-emerald-950">Сейчас ход</span>}
                          </div>

                          <input
                            value={team.name}
                            onChange={(e) => {
                              const value = e.target.value;
                              setTeams(prev => prev.map((t, idx) => idx === i ? { ...t, name: value } : t));
                            }}
                            className="mb-3 w-full rounded-2xl border border-emerald-400/15 bg-emerald-900/70 px-4 py-3 text-sm outline-none"
                          />

                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => setTeams(prev => prev.map((t, idx) => idx === i ? { ...t, score: t.score - 100 } : t))}
                              className="rounded-2xl bg-white/5 px-3 py-2 text-sm hover:bg-white/10"
                            >
                              -100
                            </button>
                            <button
                              onClick={() => setTeams(prev => prev.map((t, idx) => idx === i ? { ...t, score: t.score + 100 } : t))}
                              className="rounded-2xl bg-white/5 px-3 py-2 text-sm hover:bg-white/10"
                            >
                              +100
                            </button>
                            <input
                              type="number"
                              value={team.score}
                              onChange={(e) => {
                                const value = Number(e.target.value) || 0;
                                setTeams(prev => prev.map((t, idx) => idx === i ? { ...t, score: value } : t));
                              }}
                              className="ml-auto w-24 rounded-2xl border border-emerald-400/15 bg-emerald-900/70 px-3 py-2 text-center text-sm outline-none"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </aside>
                </section>
              )}
            </div>

            {activeCell && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm">
                <div className="flex h-[95vh] w-full max-w-6xl flex-col overflow-hidden rounded-[2rem] border border-emerald-400/20 bg-[radial-gradient(circle_at_top,_rgba(16,185,129,0.22),_rgba(3,7,18,0.98)_55%)] shadow-2xl shadow-black/60">
                  <div className="flex items-center justify-between border-b border-emerald-400/15 px-5 py-4 md:px-6">
                    <div className="flex items-center gap-3">
                      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-400/15">
                        <LeafIcon />
                      </div>
                      <div>
                        <div className="text-xs uppercase tracking-[0.25em] text-emerald-200/70">
                          {categories[activeCell.catIndex]?.title || "Категория"}
                        </div>
                        <div className="text-lg font-bold">{categories[activeCell.catIndex]?.cells[activeCell.cellIndex]?.points || 0} баллов</div>
                      </div>
                    </div>

                    <div className={`flex h-14 w-14 items-center justify-center rounded-full border text-sm font-black ${timerExpired ? "border-red-400/40 bg-red-500/15 text-red-100" : timer <= 10 ? "border-orange-300/40 bg-orange-500/10 text-orange-100" : "border-emerald-300/40 bg-emerald-500/10 text-emerald-100"}`}>
                      {timer}s
                    </div>
                  </div>

                  <div className="flex-1 overflow-y-auto p-5 md:p-8">
                    <div className="grid h-full gap-6 lg:grid-cols-[1.1fr_0.9fr]">
                      <div className="flex flex-col justify-between rounded-[1.75rem] border border-emerald-400/15 bg-white/5 p-5 md:p-6">
                        <div>
                          <div className="mb-4 text-sm text-emerald-50/70">
                            {timerExpired ? "Время вышло. Вопрос скрыт." : "У вас 30 секунд на ответ."}
                          </div>

                          {!timerExpired ? (
                            <div className="text-2xl font-bold leading-tight md:text-4xl">
                              {categories[activeCell.catIndex]?.cells[activeCell.cellIndex]?.question || "Вопрос не задан"}
                            </div>
                          ) : (
                            <div className="rounded-3xl border border-red-400/20 bg-red-500/10 p-6 text-xl font-bold text-red-100 md:text-3xl">
                              Время истекло. Текст вопроса скрыт.
                            </div>
                          )}
                        </div>

                        <div className="mt-6 flex flex-wrap gap-3">
                          {!answerShown && (
                            <button
                              onClick={showAnswer}
                              className="rounded-2xl bg-emerald-400 px-5 py-3 font-semibold text-emerald-950 hover:bg-emerald-300"
                            >
                              Показать ответ
                            </button>
                          )}

                          {answerShown && (
                            <>
                              <button
                                onClick={() => finishQuestion(true)}
                                className="inline-flex items-center gap-2 rounded-2xl bg-emerald-500 px-5 py-3 font-semibold text-white hover:bg-emerald-400"
                              >
                                <CheckIcon />
                                Верно (+баллы)
                              </button>
                              <button
                                onClick={() => finishQuestion(false)}
                                className="inline-flex items-center gap-2 rounded-2xl bg-red-500 px-5 py-3 font-semibold text-white hover:bg-red-400"
                              >
                                <XIcon />
                                Неверно (0 баллов)
                              </button>
                            </>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-col gap-4">
                        <div className="rounded-[1.75rem] border border-emerald-400/15 bg-white/5 p-5 md:p-6">
                          <div className="mb-2 text-sm text-emerald-50/70">Ответ</div>
                          {answerShown ? (
                            <div className="text-xl font-bold text-emerald-200 md:text-3xl">
                              {categories[activeCell.catIndex]?.cells[activeCell.cellIndex]?.answer || "Ответ не задан"}
                            </div>
                          ) : (
                            <div className="text-emerald-50/45">Нажмите «Показать ответ».</div>
                          )}
                        </div>

                        <div className="rounded-[1.75rem] border border-emerald-400/15 bg-white/5 p-5 md:p-6">
                          <div className="mb-3 text-sm text-emerald-50/70">Картинка</div>
                          {categories[activeCell.catIndex]?.cells[activeCell.cellIndex]?.imageUrl ? (
                            <img
                              src={categories[activeCell.catIndex].cells[activeCell.cellIndex].imageUrl}
                              alt="Вопрос"
                              className="max-h-72 w-full rounded-2xl object-cover"
                            />
                          ) : (
                            <div className="flex min-h-52 items-center justify-center rounded-2xl border border-dashed border-emerald-300/20 bg-emerald-950/40 text-emerald-50/45">
                              Изображение не задано
                            </div>
                          )}
                        </div>

                        <div className="flex items-center justify-between rounded-[1.75rem] border border-emerald-400/15 bg-white/5 p-5 md:p-6">
                          <div className="text-sm text-emerald-50/70">
                            После оценки вопроса ход автоматически перейдёт следующей команде.
                          </div>
                          <button
                            onClick={closeModal}
                            className="rounded-2xl bg-white/5 px-4 py-3 text-sm font-semibold hover:bg-white/10"
                          >
                            Закрыть
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      }

      function PencilIcon() {
        return (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5 text-emerald-300">
            <path d="M12 20h9" />
            <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
          </svg>
        );
      }

      ReactDOM.createRoot(document.getElementById("root")).render(<App />);
    </script>
  </body>
</html>
