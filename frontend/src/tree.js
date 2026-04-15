export const tree = {
  type: "question",
  text: "Que veux-tu manger ?",
  branches: {
    A: {
      type: "question",
      text: "Plutôt chaud ou froid ?",
      branches: {
        chaud: {
          type: "action",
          text: "Prends une pizza",
        },
        froid: {
          type: "action",
          text: "Prends une salade",
        },
      },
    },
    B: {
      type: "action",
      text: "Prends un burger",
    },
    C: {
      type: "action",
      text: "Prends des pâtes",
    },
    D: {
      type: "question",
      text: "Sucré ou salé ?",
      branches: {
        sucré: {
          type: "action",
          text: "Prends un dessert",
        },
        salé: {
          type: "action",
          text: "Prends des chips",
        },
      },
    },
  },
};
