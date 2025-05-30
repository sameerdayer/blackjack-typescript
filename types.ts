export enum Suit {
  Diamonds = "♦",
  Hearts = "♥",
  Spades = "♠",
  Clubs = "♣",
}

export interface InterfaceCard {
  value: number;
  suit: Suit;
  getName(): string;
}

export interface InterfaceDeck {
  cards: InterfaceCard[];
  shuffle(): void;
  drawCard(): InterfaceCard | null;
}

export interface InterfacePlayer {
  handCards: InterfaceCard[];
  receiveCard(card: InterfaceCard): void;
  revealHand(): InterfaceCard[];
  getScore(): number;
}

export enum GameState {
  INITIALIZING,
  DEALING,
  PLAYER_TURN,
  DEALER_TURN,
  EVALUATE_WINNER,
  GAME_OVER,
}
