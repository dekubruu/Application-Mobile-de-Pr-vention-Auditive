import type { Question } from '../types/quiz.types';

export const QUIZ_QUESTIONS: Question[] = [
  {
    question: 'Quelle est la fréquence normale de la parole humaine?',
    answers: ['100-300 Hz', '250-2000 Hz', '5000-8000 Hz', '10000+ Hz'],
    correct: 1,
  },
  {
    question: 'À quel niveau de bruit commence-t-on à risquer une perte auditive?',
    answers: ['50 dB', '75 dB', '85 dB', '120 dB'],
    correct: 2,
  },
  {
    question: 'Combien de temps par jour peut-on écouter à 85 dB sans risque?',
    answers: ['8 heures', '4 heures', '2 heures', '30 minutes'],
    correct: 0,
  },
  {
    question: "L'audition peut-elle se régénérer naturellement?",
    answers: ['Oui, en 1 mois', 'Oui, en 1 an', 'Non, jamais', 'Partiellement'],
    correct: 2,
  },
  {
    question: 'Quel est le meilleur conseil pour protéger ses oreilles?',
    answers: [
      'Augmenter le volume',
      'Faire des pauses',
      'Porter des bouchons',
      'Tous les conseils ci-dessus sauf le 1',
    ],
    correct: 3,
  },
];
