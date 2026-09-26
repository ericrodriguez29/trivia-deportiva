import React, { useState } from 'react';
import { Plus, Trash2, X, CheckCircle2 } from 'lucide-react';
import { QuizTemplate, Question } from '../data/quizPresets.ts';

interface CustomQuizModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveQuiz: (newQuiz: QuizTemplate) => void;
}

export const CustomQuizModal: React.FC<CustomQuizModalProps> = ({
  isOpen,
  onClose,
  onSaveQuiz,
}) => {
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('Educación Física y Deportes');
  const [questions, setQuestions] = useState<Question[]>([
    {
      question: '¿Cuántos jugadores por equipo juegan en un partido de Voleibol en cancha?',
      options: ['6 jugadores', '4 jugadores', '11 jugadores', '8 jugadores'],
      correctIndex: 0,
      timeLimit: 20,
      explanation: 'En voleibol de pista juegan 6 jugadores por equipo.'
    },
    {
      question: '¿Qué parte del cuerpo NO puede tocar el balón en Fútbol (salvo el arquero en su área)?',
      options: ['La cabeza', 'Los brazos y manos', 'El pecho', 'Los muslos'],
      correctIndex: 1,
      timeLimit: 20,
      explanation: 'Tocar el balón con la mano o brazo es infracción en fútbol.'
    }
  ]);

  if (!isOpen) return null;

  const handleAddQuestion = () => {
    setQuestions([
      ...questions,
      {
        question: '',
        options: ['Opción 1', 'Opción 2', 'Opción 3', 'Opción 4'],
        correctIndex: 0,
        timeLimit: 20,
        explanation: ''
      }
    ]);
  };

  const handleRemoveQuestion = (index: number) => {
    if (questions.length <= 1) return;
    setQuestions(questions.filter((_, i) => i !== index));
  };

  const handleUpdateQuestion = (index: number, field: keyof Question, value: any) => {
    const updated = [...questions];
    updated[index] = { ...updated[index], [field]: value };
    setQuestions(updated);
  };

  const handleUpdateOption = (qIndex: number, optIndex: number, val: string) => {
    const updated = [...questions];
    const newOptions = [...updated[qIndex].options];
    newOptions[optIndex] = val;
    updated[qIndex] = { ...updated[qIndex], options: newOptions };
    setQuestions(updated);
  };

  const handleSave = () => {
    if (!title.trim()) {
      alert('Por favor escribe un título para la trivia');
      return;
    }

    const validQuestions = questions.filter(q => q.question.trim().length > 0);
    if (validQuestions.length === 0) {
      alert('Por favor agrega al menos una pregunta con texto válido');
      return;
    }

    const newQuiz: QuizTemplate = {
      id: 'custom_' + Date.now(),
      title: title.trim(),
      category: category.trim() || 'Personalizada',
      description: `Trivia personalizada creada por el usuario con ${validQuestions.length} preguntas.`,
      icon: '✨',
      accentColor: 'from-purple-600 to-pink-600',
      questions: validQuestions,
    };

    onSaveQuiz(newQuiz);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="glass-panel bg-[#1d0a42] border border-white/20 rounded-3xl p-6 sm:p-8 max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl">
        <div className="flex justify-between items-center pb-4 border-b border-white/10">
          <h3 className="font-title text-2xl font-black text-amber-300">
            Crear Trivia Personalizada
          </h3>
          <button onClick={onClose} className="p-1 rounded-full bg-white/10 hover:bg-white/20 text-purple-200">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto py-4 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold uppercase text-purple-200 mb-1">Título de la Trivia</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ej: Torneo de Deportes 2026"
                className="w-full bg-white/10 border border-white/20 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-amber-400"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase text-purple-200 mb-1">Materia / Categoría</label>
              <input
                type="text"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="Ej: Educación Física"
                className="w-full bg-white/10 border border-white/20 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-amber-400"
              />
            </div>
          </div>

          <div className="space-y-4 pt-2">
            <div className="flex justify-between items-center">
              <span className="text-xs font-extrabold uppercase text-amber-300">
                Lista de Preguntas ({questions.length})
              </span>
              <button
                onClick={handleAddQuestion}
                className="px-3 py-1.5 bg-amber-400/20 hover:bg-amber-400 hover:text-purple-950 text-amber-300 rounded-xl text-xs font-bold transition flex items-center space-x-1 border border-amber-400/30"
              >
                <Plus className="w-3.5 h-3.5 mr-1" /> Agregar Pregunta
              </button>
            </div>

            {questions.map((q, qIdx) => (
              <div key={qIdx} className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-black text-amber-400">Pregunta #{qIdx + 1}</span>
                  {questions.length > 1 && (
                    <button
                      onClick={() => handleRemoveQuestion(qIdx)}
                      className="text-rose-400 hover:text-rose-200 p-1"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>

                <input
                  type="text"
                  value={q.question}
                  onChange={(e) => handleUpdateQuestion(qIdx, 'question', e.target.value)}
                  placeholder="Escribe la pregunta aquí..."
                  className="w-full bg-white/10 border border-white/20 rounded-xl p-2.5 text-sm text-white focus:outline-none focus:border-amber-400"
                />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {q.options.map((opt, oIdx) => (
                    <div key={oIdx} className="flex items-center space-x-1.5">
                      <input
                        type="radio"
                        name={`correct_${qIdx}`}
                        checked={q.correctIndex === oIdx}
                        onChange={() => handleUpdateQuestion(qIdx, 'correctIndex', oIdx)}
                        className="accent-amber-400 w-4 h-4 cursor-pointer"
                        title="Marcar como respuesta correcta"
                      />
                      <input
                        type="text"
                        value={opt}
                        onChange={(e) => handleUpdateOption(qIdx, oIdx, e.target.value)}
                        placeholder={`Opción ${oIdx + 1}`}
                        className={`w-full p-2 rounded-lg text-xs border ${
                          q.correctIndex === oIdx
                            ? 'bg-emerald-500/20 border-emerald-400 text-white font-bold'
                            : 'bg-white/10 border-white/20 text-white'
                        }`}
                      />
                    </div>
                  ))}
                </div>

                <input
                  type="text"
                  value={q.explanation || ''}
                  onChange={(e) => handleUpdateQuestion(qIdx, 'explanation', e.target.value)}
                  placeholder="Explicación educativa (opcional)..."
                  className="w-full bg-black/20 border border-white/10 rounded-lg p-2 text-xs text-purple-200"
                />
              </div>
            ))}
          </div>
        </div>

        <div className="pt-4 border-t border-white/10 flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-5 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl font-bold text-sm"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            className="px-6 py-2.5 bg-amber-400 hover:bg-amber-300 text-purple-950 rounded-xl font-black text-sm flex items-center space-x-1.5 shadow-lg"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Guardar y Usar Trivia</span>
          </button>
        </div>
      </div>
    </div>
  );
};
