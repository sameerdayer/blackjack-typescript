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
  shuffle(): void;
  drawCard(): InterfaceCard | null;
}

export interface InterfacePlayer {
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
