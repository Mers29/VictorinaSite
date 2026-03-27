import React, { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Atom,
  ChevronRight,
  Crown,
  Dna,
  ImagePlus,
  Leaf,
  Plus,
  Play,
  RotateCcw,
  Save,
  TimerReset,
  Trash2,
  Trophy,
  Users,
  CheckCircle2,
  XCircle,
  PencilLine,
  Sparkles,
  Maximize2,
  AlertTriangle,
} from "lucide-react";

const VALUE_ROWS = [100, 200, 300, 400, 500];
const STORAGE_KEY = "bio-jeopardy-v1";

function createEmptyCell(points) {
  return {
    points,
    question: "",
    answer: "",
    imageUrl: "",
    resolved: false,
    awarded: null, // true | false | null
    resultTeamName: "",
  };
}

function createCategory(index) {
  return {
    title: `Категория ${index + 1}`,
    cells: VALUE_ROWS.map((points) => createEmptyCell(points)),
  };
}

function createBoard(count = 5) {
  return Array.from({ length: count }, (_, i) => createCategory(i));
}

function createTeams(count = 2) {
  return Array.from({ length: count }, (_, i) => ({
    id: `team-${i + 1}`,
    name: `Команда ${i + 1}`,
    score: 0,
  }));
}

function normalizeTeams(count, prevTeams = []) {
  const next = Array.from({ length: count }, (_, i) => {
    const existing = prevTeams[i];
    return existing
      ? { ...existing, id: existing.id ?? `team-${i + 1}` }
      : { id: `team-${i + 1}`, name: `Команда ${i + 1}`, score: 0 };
  });
  return next;
}

function updateCell(board, catIndex, rowIndex, updater) {
  return board.map((cat, ci) =>
    ci !== catIndex
      ? cat
      : {
          ...cat,
          cells: cat.cells.map((cell, ri) =>
            ri !== rowIndex ? cell : updater(cell)
          ),
        }
  );
}

function loadInitialState() {
  if (typeof window === "undefined") {
    return null;
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);

    const categories =
      Array.isArray(parsed.categories) && parsed.categories.length > 0
        ? parsed.categories
        : createBoard(5);

    const teams =
      Array.isArray(parsed.teams) && parsed.teams.length > 0
        ? parsed.teams
        : createTeams(2);

    return {
      categories: categories.map((cat, i) => ({
        title: typeof cat.title === "string" ? cat.title : `Категория ${i + 1}`,
        cells: VALUE_ROWS.map((points, ri) => {
          const source = cat.cells?.[ri] ?? {};
          return {
            points,
            question: source.question ?? "",
            answer: source.answer ?? "",
            imageUrl: source.imageUrl ?? "",
            resolved: Boolean(source.resolved),
            awarded: source.awarded ?? null,
            resultTeamName: source.resultTeamName ?? "",
          };
        }),
      })),
      teams: teams.map((t, i) => ({
        id: t.id ?? `team-${i + 1}`,
        name: typeof t.name === "string" ? t.name : `Команда ${i + 1}`,
        score: Number.isFinite(t.score) ? t.score : 0,
      })),
      teamCount: Number.isInteger(parsed.teamCount) ? parsed.teamCount : teams.length,
      mode: parsed.mode === "editor" || parsed.mode === "game" ? parsed.mode : "setup",
      currentTurn:
        Number.isInteger(parsed.currentTurn) && parsed.currentTurn >= 0
          ? parsed.currentTurn
          : 0,
    };
  } catch {
    return null;
  }
}

function App() {
  const saved = useMemo(() => loadInitialState(), []);
  const [mode, setMode] = useState(saved?.mode ?? "setup");
  const [categories, setCategories] = useState(saved?.categories ?? createBoard(5));
  const [teamCount, setTeamCount] = useState(saved?.teamCount ?? 2);
  const [teams, setTeams] = useState(
    saved?.teams ?? normalizeTeams(saved?.teamCount ?? 2)
  );
  const [currentTurn, setCurrentTurn] = useState(saved?.currentTurn ?? 0);

  const [activeCell, setActiveCell] = useState(null); // {catIndex,rowIndex}
  const [timer, setTimer] = useState(30);
  const [timerExpired, setTimerExpired] = useState(false);
  const [answerRevealed, setAnswerRevealed] = useState(false);

  const fileInputRefs = useRef({});

  useEffect(() => {
    setTeams((prev) => normalizeTeams(teamCount, prev));
  }, [teamCount]);

  useEffect(() => {
    if (teams.length > 0 && currentTurn >= teams.length) {
      setCurrentTurn(0);
    }
  }, [teams.length, currentTurn]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        mode,
        categories,
        teamCount,
        teams,
        currentTurn,
      })
    );
  }, [mode, categories, teamCount, teams, currentTurn]);

  useEffect(() => {
    if (!activeCell) return;

    setTimer(30);
    setTimerExpired(false);
    setAnswerRevealed(false);

    const id = window.setInterval(() => {
      setTimer((prev) => {
        if (prev <= 1) {
          window.clearInterval(id);
          setTimerExpired(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => window.clearInterval(id);
  }, [activeCell]);

  const currentTeam = teams[currentTurn] ?? teams[0];

  const addCategory = () => {
    setCategories((prev) => [...prev, createCategory(prev.length)]);
  };

  const removeCategory = (index) => {
    setCategories((prev) => prev.filter((_, i) => i !== index));
  };

  const startGame = () => {
    setMode("game");
  };

  const openQuestion = (catIndex, rowIndex) => {
    const cell = categories[catIndex]?.cells?.[rowIndex];
    if (!cell || cell.resolved) return;
    setActiveCell({ catIndex, rowIndex });
  };

  const closeModal = () => {
    setActiveCell(null);
    setTimer(30);
    setTimerExpired(false);
    setAnswerRevealed(false);
  };

  const revealAnswer = () => {
    setAnswerRevealed(true);
  };

  const finalizeQuestion = (awarded) => {
    if (!activeCell) return;

    const { catIndex, rowIndex } = activeCell;
    const current = categories[catIndex]?.cells?.[rowIndex];
    if (!current || current.resolved) return;

    const teamName = currentTeam?.name ?? "Команда";
    const points = current.points;

    setCategories((prev) =>
      updateCell(prev, catIndex, rowIndex, (cell) => ({
        ...cell,
        resolved: true,
        awarded,
        resultTeamName: teamName,
      }))
    );

    if (awarded) {
      setTeams((prev) =>
        prev.map((team, i) =>
          i === currentTurn ? { ...team, score: team.score + points } : team
        )
      );
    }

    setCurrentTurn((prev) => (teams.length > 0 ? (prev + 1) % teams.length : 0));
    closeModal();
  };

  const updateTeamScore = (teamIndex, delta) => {
    setTeams((prev) =>
      prev.map((team, i) =>
        i === teamIndex ? { ...team, score: team.score + delta } : team
      )
    );
  };

  const setTeamScoreDirect = (teamIndex, value) => {
    setTeams((prev) =>
      prev.map((team, i) =>
        i === teamIndex ? { ...team, score: Number(value) || 0 } : team
      )
    );
  };

  const setQuestionFile = (catIndex, rowIndex, file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result || "");
      setCategories((prev) =>
        updateCell(prev, catIndex, rowIndex, (cell) => ({
          ...cell,
          imageUrl: result,
        }))
      );
    };
    reader.readAsDataURL(file);
  };

  const resetBoard = () => {
    setCategories(createBoard(5));
    setTeams(createTeams(teamCount));
    setCurrentTurn(0);
    setMode("setup");
    closeModal();
  };

  const boardGridStyle = {
    gridTemplateColumns: `repeat(${categories.length}, minmax(220px, 1fr))`,
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_#0f5132_0%,_#06140f_42%,_#020705_100%)] text-green-50">
      <div className="mx-auto max-w-7xl px-4 py-4 md:px-6 md:py-6">
        <header className="mb-6 rounded-3xl border border-emerald-400/15 bg-emerald-950/40 p-4 shadow-2xl shadow-black/30 backdrop-blur">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-400 to-green-700 shadow-lg shadow-emerald-500/20">
                <Dna className="h-6 w-6 text-white" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
                    Биологическая Викторина
                  </h1>
                  <Sparkles className="h-5 w-5 text-emerald-300" />
                </div>
                <p className="text-sm text-green-100/70">
                  Jeopardy-стиль • редактор вопросов • игровые команды • таймер
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => setMode("setup")}
                className={`rounded-2xl px-4 py-2 text-sm font-semibold transition ${
                  mode === "setup"
                    ? "bg-emerald-400 text-emerald-950"
                    : "bg-white/5 text-green-50 hover:bg-white/10"
                }`}
              >
                Старт
              </button>
              <button
                onClick={() => setMode("editor")}
                className={`rounded-2xl px-4 py-2 text-sm font-semibold transition ${
                  mode === "editor"
                    ? "bg-emerald-400 text-emerald-950"
                    : "bg-white/5 text-green-50 hover:bg-white/10"
                }`}
              >
                Редактор
              </button>
              <button
                onClick={() => setMode("game")}
                className={`rounded-2xl px-4 py-2 text-sm font-semibold transition ${
                  mode === "game"
                    ? "bg-emerald-400 text-emerald-950"
                    : "bg-white/5 text-green-50 hover:bg-white/10"
                }`}
              >
                Игра
              </button>
              <button
                onClick={resetBoard}
                className="inline-flex items-center gap-2 rounded-2xl border border-red-400/20 bg-red-500/10 px-4 py-2 text-sm font-semibold text-red-100 transition hover:bg-red-500/20"
              >
                <RotateCcw className="h-4 w-4" />
                Сброс
              </button>
            </div>
          </div>
        </header>

        {mode === "setup" && (
          <motion.section
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]"
          >
            <div className="rounded-3xl border border-emerald-400/15 bg-emerald-950/40 p-5 shadow-2xl shadow-black/25 backdrop-blur">
              <div className="mb-5 flex items-center gap-3">
                <Users className="h-5 w-5 text-emerald-300" />
                <h2 className="text-xl font-bold">Параметры игры</h2>
              </div>

              <div className="grid gap-5 md:grid-cols-2">
                <label className="space-y-2">
                  <span className="text-sm text-green-100/75">Количество команд</span>
                  <select
                    value={teamCount}
                    onChange={(e) => setTeamCount(Number(e.target.value))}
                    className="w-full rounded-2xl border border-emerald-400/15 bg-emerald-900/70 px-4 py-3 outline-none ring-0 transition focus:border-emerald-300"
                  >
                    {Array.from({ length: 9 }, (_, i) => i + 2).map((n) => (
                      <option key={n} value={n}>
                        {n}
                      </option>
                    ))}
                  </select>
                </label>

                <div className="rounded-2xl border border-emerald-400/10 bg-white/5 p-4">
                  <div className="mb-2 text-sm text-green-100/75">Подсказка</div>
                  <p className="text-sm leading-relaxed text-green-50/80">
                    Сначала настройте команды и сетку, затем переходите в редактор или
                    сразу запускайте игру. Все изменения сохраняются в localStorage.
                  </p>
                </div>
              </div>

              <div className="mt-5 grid gap-3">
                {teams.map((team, i) => (
                  <div
                    key={team.id}
                    className="flex flex-col gap-3 rounded-2xl border border-emerald-400/10 bg-white/5 p-4 md:flex-row md:items-center"
                  >
                    <div className="flex items-center gap-2 text-sm font-semibold text-green-100/80">
                      <Crown className="h-4 w-4 text-emerald-300" />
                      {i === currentTurn ? "Ход сейчас" : `Команда ${i + 1}`}
                    </div>
                    <input
                      value={team.name}
                      onChange={(e) => {
                        const value = e.target.value;
                        setTeams((prev) =>
                          prev.map((t, idx) => (idx === i ? { ...t, name: value } : t))
                        );
                      }}
                      className="flex-1 rounded-2xl border border-emerald-400/15 bg-emerald-900/70 px-4 py-3 outline-none transition focus:border-emerald-300"
                      placeholder={`Команда ${i + 1}`}
                    />
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => updateTeamScore(i, -100)}
                        className="rounded-xl bg-white/5 px-3 py-2 text-sm hover:bg-white/10"
                      >
                        -100
                      </button>
                      <button
                        onClick={() => updateTeamScore(i, 100)}
                        className="rounded-xl bg-white/5 px-3 py-2 text-sm hover:bg-white/10"
                      >
                        +100
                      </button>
                      <input
                        type="number"
                        value={team.score}
                        onChange={(e) => setTeamScoreDirect(i, e.target.value)}
                        className="w-24 rounded-2xl border border-emerald-400/15 bg-emerald-900/70 px-3 py-3 text-center outline-none"
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-6 flex flex-wrap gap-3">
                <button
                  onClick={() => setMode("editor")}
                  className="inline-flex items-center gap-2 rounded-2xl bg-emerald-400 px-5 py-3 font-semibold text-emerald-950 transition hover:bg-emerald-300"
                >
                  <PencilLine className="h-4 w-4" />
                  Открыть редактор
                </button>
                <button
                  onClick={startGame}
                  className="inline-flex items-center gap-2 rounded-2xl border border-emerald-300/20 bg-white/5 px-5 py-3 font-semibold transition hover:bg-white/10"
                >
                  <Play className="h-4 w-4" />
                  Начать игру
                </button>
              </div>
            </div>

            <div className="rounded-3xl border border-emerald-400/15 bg-emerald-950/40 p-5 shadow-2xl shadow-black/25 backdrop-blur">
              <div className="mb-5 flex items-center gap-3">
                <Atom className="h-5 w-5 text-emerald-300" />
                <h2 className="text-xl font-bold">Панель сетки</h2>
              </div>

              <div className="space-y-4 text-sm text-green-50/75">
                <div className="rounded-2xl bg-white/5 p-4">
                  Категории уже созданы по умолчанию: 5 колонок, 5 уровней стоимости
                  вопросов — 100, 200, 300, 400 и 500.
                </div>
                <div className="rounded-2xl bg-white/5 p-4">
                  В редакторе можно изменять текст вопроса, правильный ответ и картинку.
                  В игре вопрос открывается на весь экран с таймером 30 секунд.
                </div>
                <div className="rounded-2xl bg-white/5 p-4">
                  После проверки ответа ячейка станет зелёной или красной и покажет
                  название команды.
                </div>
              </div>
            </div>
          </motion.section>
        )}

        {mode === "editor" && (
          <motion.section
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <PencilLine className="h-5 w-5 text-emerald-300" />
                <h2 className="text-xl font-bold">Режим редактора</h2>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={addCategory}
                  className="inline-flex items-center gap-2 rounded-2xl bg-emerald-400 px-4 py-2 font-semibold text-emerald-950 transition hover:bg-emerald-300"
                >
                  <Plus className="h-4 w-4" />
                  Добавить категорию
                </button>
                <button
                  onClick={() => setMode("game")}
                  className="inline-flex items-center gap-2 rounded-2xl border border-emerald-300/20 bg-white/5 px-4 py-2 font-semibold transition hover:bg-white/10"
                >
                  <Play className="h-4 w-4" />
                  В игру
                </button>
              </div>
            </div>

            <div className="grid gap-4 overflow-x-auto pb-2" style={boardGridStyle}>
              {categories.map((category, catIndex) => (
                <motion.div
                  key={catIndex}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="min-w-[280px] rounded-3xl border border-emerald-400/15 bg-emerald-950/40 p-4 shadow-xl shadow-black/20 backdrop-blur"
                >
                  <div className="mb-4 flex items-center gap-2">
                    <input
                      value={category.title}
                      onChange={(e) => {
                        const value = e.target.value;
                        setCategories((prev) =>
                          prev.map((cat, i) =>
                            i === catIndex ? { ...cat, title: value } : cat
                          )
                        );
                      }}
                      className="w-full rounded-2xl border border-emerald-400/15 bg-emerald-900/70 px-4 py-3 text-sm font-bold uppercase tracking-wider outline-none focus:border-emerald-300"
                      placeholder={`Категория ${catIndex + 1}`}
                    />
                    <button
                      onClick={() => removeCategory(catIndex)}
                      className="rounded-2xl border border-red-400/20 bg-red-500/10 p-3 text-red-100 transition hover:bg-red-500/20"
                      title="Удалить категорию"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="space-y-3">
                    {category.cells.map((cell, rowIndex) => (
                      <div
                        key={cell.points}
                        className="rounded-2xl border border-emerald-400/10 bg-white/5 p-3"
                      >
                        <div className="mb-3 flex items-center justify-between">
                          <span className="inline-flex items-center gap-2 rounded-full bg-emerald-400/15 px-3 py-1 text-xs font-semibold text-emerald-200">
                            {cell.points} баллов
                          </span>
                          {cell.resolved ? (
                            <span className="text-xs text-green-100/70">
                              Уже сыграно
                            </span>
                          ) : (
                            <span className="text-xs text-green-100/50">
                              Черновик
                            </span>
                          )}
                        </div>

                        <label className="mb-2 block text-xs text-green-100/70">
                          Вопрос
                        </label>
                        <textarea
                          value={cell.question}
                          onChange={(e) => {
                            const value = e.target.value;
                            setCategories((prev) =>
                              updateCell(prev, catIndex, rowIndex, (old) => ({
                                ...old,
                                question: value,
                              }))
                            );
                          }}
                          rows={3}
                          className="mb-3 w-full rounded-2xl border border-emerald-400/15 bg-emerald-900/70 px-4 py-3 text-sm outline-none focus:border-emerald-300"
                          placeholder="Введите текст вопроса"
                        />

                        <label className="mb-2 block text-xs text-green-100/70">
                          Правильный ответ
                        </label>
                        <textarea
                          value={cell.answer}
                          onChange={(e) => {
                            const value = e.target.value;
                            setCategories((prev) =>
                              updateCell(prev, catIndex, rowIndex, (old) => ({
                                ...old,
                                answer: value,
                              }))
                            );
                          }}
                          rows={2}
                          className="mb-3 w-full rounded-2xl border border-emerald-400/15 bg-emerald-900/70 px-4 py-3 text-sm outline-none focus:border-emerald-300"
                          placeholder="Введите ответ"
                        />

                        <label className="mb-2 block text-xs text-green-100/70">
                          Картинка по ссылке
                        </label>
                        <input
                          value={cell.imageUrl}
                          onChange={(e) => {
                            const value = e.target.value;
                            setCategories((prev) =>
                              updateCell(prev, catIndex, rowIndex, (old) => ({
                                ...old,
                                imageUrl: value,
                              }))
                            );
                          }}
                          className="mb-3 w-full rounded-2xl border border-emerald-400/15 bg-emerald-900/70 px-4 py-3 text-sm outline-none focus:border-emerald-300"
                          placeholder="https://..."
                        />

                        <div className="flex flex-wrap gap-2">
                          <button
                            onClick={() => fileInputRefs.current[`${catIndex}-${rowIndex}`]?.click()}
                            className="inline-flex items-center gap-2 rounded-2xl bg-white/5 px-3 py-2 text-sm transition hover:bg-white/10"
                          >
                            <ImagePlus className="h-4 w-4" />
                            Загрузить файл
                          </button>
                          <input
                            ref={(el) => {
                              fileInputRefs.current[`${catIndex}-${rowIndex}`] = el;
                            }}
                            type="file"
                            accept="image/*"
                            onChange={(e) => {
                              setQuestionFile(catIndex, rowIndex, e.target.files?.[0]);
                              e.target.value = "";
                            }}
                            className="hidden"
                          />
                          <button
                            onClick={() => {
                              setCategories((prev) =>
                                updateCell(prev, catIndex, rowIndex, (old) => ({
                                  ...old,
                                  question: "",
                                  answer: "",
                                  imageUrl: "",
                                }))
                              );
                            }}
                            className="inline-flex items-center gap-2 rounded-2xl border border-emerald-300/15 bg-emerald-400/10 px-3 py-2 text-sm transition hover:bg-emerald-400/15"
                          >
                            <Save className="h-4 w-4" />
                            Очистить
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.section>
        )}

        {mode === "game" && (
          <motion.section
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]"
          >
            <div className="rounded-3xl border border-emerald-400/15 bg-emerald-950/30 p-4 shadow-2xl shadow-black/20 backdrop-blur">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Trophy className="h-5 w-5 text-emerald-300" />
                  <h2 className="text-xl font-bold">Игровая сетка</h2>
                </div>
                <div className="text-sm text-green-100/70">
                  Текущий ход:{" "}
                  <span className="font-semibold text-emerald-200">
                    {currentTeam?.name ?? "—"}
                  </span>
                </div>
              </div>

              <div className="overflow-x-auto pb-2">
                <div className="grid gap-3" style={boardGridStyle}>
                  {categories.map((category, catIndex) => (
                    <div
                      key={catIndex}
                      className="min-w-[220px] overflow-hidden rounded-3xl border border-emerald-400/15 bg-emerald-900/40"
                    >
                      <div className="flex min-h-20 items-center justify-center border-b border-emerald-400/10 px-3 py-4 text-center text-sm font-black uppercase tracking-wider text-green-50">
                        {category.title || `Категория ${catIndex + 1}`}
                      </div>

                      <div className="space-y-2 p-3">
                        {category.cells.map((cell, rowIndex) => (
                          <button
                            key={cell.points}
                            onClick={() => openQuestion(catIndex, rowIndex)}
                            disabled={cell.resolved}
                            className={[
                              "group flex min-h-16 w-full items-center justify-between rounded-2xl px-4 py-3 text-left font-bold transition",
                              cell.resolved
                                ? cell.awarded
                                  ? "bg-emerald-500/25 text-emerald-50"
                                  : "bg-red-500/20 text-red-100"
                                : "bg-emerald-400/10 text-emerald-100 hover:bg-emerald-400/20",
                            ].join(" ")}
                          >
                            <div className="flex items-center gap-2">
                              <span className="text-lg">{cell.points}</span>
                              {cell.resolved && (
                                <span className="text-xs font-semibold opacity-90">
                                  {cell.resultTeamName}
                                </span>
                              )}
                            </div>
                            {!cell.resolved ? (
                              <ChevronRight className="h-4 w-4 opacity-60 transition group-hover:translate-x-1 group-hover:opacity-100" />
                            ) : cell.awarded ? (
                              <CheckCircle2 className="h-4 w-4 text-emerald-200" />
                            ) : (
                              <XCircle className="h-4 w-4 text-red-100" />
                            )}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <aside className="rounded-3xl border border-emerald-400/15 bg-emerald-950/40 p-5 shadow-2xl shadow-black/25 backdrop-blur">
              <div className="mb-5 flex items-center gap-2">
                <Users className="h-5 w-5 text-emerald-300" />
                <h3 className="text-xl font-bold">Команды</h3>
              </div>

              <div className="mb-5 rounded-2xl border border-emerald-400/10 bg-white/5 p-4">
                <div className="flex items-center gap-2 text-sm text-green-100/75">
                  <TimerReset className="h-4 w-4 text-emerald-300" />
                  Активный ход
                </div>
                <div className="mt-1 text-lg font-bold text-emerald-200">
                  {currentTeam?.name ?? "—"}
                </div>
              </div>

              <div className="space-y-3">
                {teams.map((team, i) => (
                  <div
                    key={team.id}
                    className={`rounded-2xl border p-4 transition ${
                      i === currentTurn
                        ? "border-emerald-300/40 bg-emerald-400/10"
                        : "border-emerald-400/10 bg-white/5"
                    }`}
                  >
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <Crown className="h-4 w-4 text-emerald-300" />
                        <span className="text-sm font-semibold text-green-50">
                          Команда {i + 1}
                        </span>
                      </div>
                      {i === currentTurn && (
                        <span className="rounded-full bg-emerald-400 px-3 py-1 text-[11px] font-bold text-emerald-950">
                          Сейчас ход
                        </span>
                      )}
                    </div>

                    <input
                      value={team.name}
                      onChange={(e) => {
                        const value = e.target.value;
                        setTeams((prev) =>
                          prev.map((t, idx) => (idx === i ? { ...t, name: value } : t))
                        );
                      }}
                      className="mb-3 w-full rounded-2xl border border-emerald-400/15 bg-emerald-900/70 px-4 py-3 text-sm outline-none focus:border-emerald-300"
                    />

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => updateTeamScore(i, -100)}
                        className="rounded-2xl bg-white/5 px-3 py-2 text-sm hover:bg-white/10"
                      >
                        -100
                      </button>
                      <button
                        onClick={() => updateTeamScore(i, 100)}
                        className="rounded-2xl bg-white/5 px-3 py-2 text-sm hover:bg-white/10"
                      >
                        +100
                      </button>
                      <input
                        type="number"
                        value={team.score}
                        onChange={(e) => setTeamScoreDirect(i, e.target.value)}
                        className="ml-auto w-28 rounded-2xl border border-emerald-400/15 bg-emerald-900/70 px-3 py-2 text-center text-sm outline-none focus:border-emerald-300"
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-5 rounded-2xl border border-emerald-400/10 bg-white/5 p-4 text-sm text-green-100/75">
                Очки можно менять вручную в любой момент. После проверки ответа ход
                автоматически передаётся следующей команде.
              </div>
            </aside>
          </motion.section>
        )}
      </div>

      <AnimatePresence>
        {activeCell && (
          <motion.div
            className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <QuestionModal
              cell={categories[activeCell.catIndex]?.cells?.[activeCell.rowIndex]}
              categoryTitle={categories[activeCell.catIndex]?.title}
              timer={timer}
              timerExpired={timerExpired}
              answerRevealed={answerRevealed}
              onReveal={revealAnswer}
              onCorrect={() => finalizeQuestion(true)}
              onWrong={() => finalizeQuestion(false)}
              onClose={closeModal}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function QuestionModal({
  cell,
  categoryTitle,
  timer,
  timerExpired,
  answerRevealed,
  onReveal,
  onCorrect,
  onWrong,
  onClose,
}) {
  return (
    <div className="flex h-full w-full items-center justify-center p-4 md:p-8">
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 20 }}
        className="flex h-[95vh] w-full max-w-6xl flex-col overflow-hidden rounded-[2rem] border border-emerald-400/20 bg-[radial-gradient(circle_at_top,_rgba(16,185,129,0.22),_rgba(3,7,18,0.98)_55%)] shadow-2xl shadow-black/60"
      >
        <div className="flex items-center justify-between border-b border-emerald-400/15 px-5 py-4 md:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-400/15">
              <Leaf className="h-5 w-5 text-emerald-300" />
            </div>
            <div>
              <div className="text-xs uppercase tracking-[0.25em] text-emerald-200/70">
                {categoryTitle || "Категория"}
              </div>
              <div className="text-lg font-bold text-green-50">
                {cell?.points ?? 0} баллов
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div
              className={`flex h-14 w-14 items-center justify-center rounded-full border text-sm font-black ${
                timerExpired
                  ? "border-red-400/40 bg-red-500/15 text-red-100"
                  : timer <= 10
                  ? "border-orange-300/40 bg-orange-500/10 text-orange-100"
                  : "border-emerald-300/40 bg-emerald-500/10 text-emerald-100"
              }`}
            >
              {timer}s
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-5 md:p-8">
          <div className="grid h-full gap-6 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="flex flex-col justify-between rounded-[1.75rem] border border-emerald-400/15 bg-white/5 p-5 md:p-6">
              <div>
                <div className="mb-4 flex items-center gap-2 text-sm text-green-100/70">
                  <AlertTriangle className="h-4 w-4 text-emerald-300" />
                  {timerExpired
                    ? "Время вышло. Текст вопроса скрыт."
                    : "У вас 30 секунд на ответ."}
                </div>

                {!timerExpired && (
                  <motion.div
                    key="question"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-2xl font-bold leading-tight text-green-50 md:text-4xl"
                  >
                    {cell?.question || "Вопрос не задан"}
                  </motion.div>
                )}

                {timerExpired && (
                  <motion.div
                    key="hidden-question"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="rounded-3xl border border-red-400/20 bg-red-500/10 p-6 text-xl font-bold text-red-100 md:text-3xl"
                  >
                    Время истекло. Вопрос скрыт.
                  </motion.div>
                )}
              </div>

              <div className="mt-6 flex flex-wrap gap-3">
                {!answerRevealed && (
                  <button
                    onClick={onReveal}
                    className="inline-flex items-center gap-2 rounded-2xl bg-emerald-400 px-5 py-3 font-semibold text-emerald-950 transition hover:bg-emerald-300"
                  >
                    Показать ответ
                    <ChevronRight className="h-4 w-4" />
                  </button>
                )}

                {answerRevealed && (
                  <>
                    <button
                      onClick={onCorrect}
                      className="inline-flex items-center gap-2 rounded-2xl bg-emerald-500 px-5 py-3 font-semibold text-white transition hover:bg-emerald-400"
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      Верно (+баллы)
                    </button>
                    <button
                      onClick={onWrong}
                      className="inline-flex items-center gap-2 rounded-2xl bg-red-500 px-5 py-3 font-semibold text-white transition hover:bg-red-400"
                    >
                      <XCircle className="h-4 w-4" />
                      Неверно (0 баллов)
                    </button>
                  </>
                )}
              </div>
            </div>

            <div className="flex flex-col gap-4">
              <div className="rounded-[1.75rem] border border-emerald-400/15 bg-white/5 p-5 md:p-6">
                <div className="mb-2 text-sm text-green-100/70">Ответ</div>
                {answerRevealed ? (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-xl font-bold text-emerald-200 md:text-3xl"
                  >
                    {cell?.answer || "Ответ не задан"}
                  </motion.div>
                ) : (
                  <div className="text-green-50/45">
                    Нажмите «Показать ответ», чтобы открыть правильный вариант.
                  </div>
                )}
              </div>

              <div className="rounded-[1.75rem] border border-emerald-400/15 bg-white/5 p-5 md:p-6">
                <div className="mb-3 text-sm text-green-100/70">Картинка</div>
                {cell?.imageUrl ? (
                  <img
                    src={cell.imageUrl}
                    alt="Вопрос"
                    className="max-h-72 w-full rounded-2xl object-cover"
                  />
                ) : (
                  <div className="flex min-h-52 items-center justify-center rounded-2xl border border-dashed border-emerald-300/20 bg-emerald-950/40 text-green-50/45">
                    Изображение не задано
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between rounded-[1.75rem] border border-emerald-400/15 bg-white/5 p-5 md:p-6">
                <div className="text-sm text-green-100/70">
                  По завершении выберите результат. После этого ход автоматически
                  перейдёт следующей команде.
                </div>
                <button
                  onClick={onClose}
                  className="rounded-2xl bg-white/5 px-4 py-3 text-sm font-semibold transition hover:bg-white/10"
                >
                  Закрыть
                </button>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

export default App;
